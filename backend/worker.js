require('dotenv').config();
const { Worker } = require('bullmq');
const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Video = require('./models/Video');

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// Connect Worker to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Worker connected to MongoDB!'))
  .catch(err => console.error('Worker MongoDB error:', err));

const redisConnection = { host: '127.0.0.1', port: 6379 };
const videoDir = path.join(__dirname, 'videos');

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir);
}

// Bulletproof scroll (SLOWED DOWN FOR BETTER READABILITY)
const autoScroll = async () => {
  await new Promise((resolve) => {
    document.documentElement.style.scrollBehavior = 'auto';
    let idleTicks = 0;
    const distance = 50; 
    const timer = setInterval(() => {
      window.scrollBy(0, distance);
      const currentScroll = Math.ceil(window.innerHeight + window.scrollY);
      const totalHeight = document.body.scrollHeight;

      if (currentScroll >= totalHeight) {
        idleTicks++;
        if (idleTicks >= 5) {
          clearInterval(timer);
          clearTimeout(hardCap);
          resolve();
        }
      } else {
        idleTicks = 0;
      }
    }, 120);

    const hardCap = setTimeout(() => {
      clearInterval(timer);
      resolve();
    }, 30000);
  });
};

const worker = new Worker('video-generation', async job => {
  const { url, device } = job.data;
  console.log(`\n[Job ${job.id}] Started for URL: ${url} on ${device}`);

  const browserArgs = ['--window-size=1920,1080'];
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  await job.updateProgress(10);

  let viewportConfig;
  switch (device) {
    case 'desktop':
      viewportConfig = {
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        isMobile: false,
        hasTouch: false,
        recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } }
      };
      break;
    case 'tablet':
      viewportConfig = {
        ...devices['iPad (Gen 7)'],
        viewport: { width: 810, height: 1080 },
        recordVideo: { dir: videoDir, size: { width: 810, height: 1080 } }
      };
      break;
    case 'mobile':
    default:
      viewportConfig = {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        recordVideo: { dir: videoDir, size: { width: 390, height: 844 } }
      };
      break;
  }

  // --- Warm-up pass ---
  console.log(`[Job ${job.id}] Warming up cache for ${url}...`);
  const tempBrowser = await chromium.launch({ headless: true, args: browserArgs });
  
  //  Turn off recording for the warm-up pass
  const warmUpConfig = { ...viewportConfig };
  delete warmUpConfig.recordVideo; 

  const tempContext = await tempBrowser.newContext(warmUpConfig);
  const tempPage = await tempContext.newPage();
  await tempPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
  await tempBrowser.close();

  await job.updateProgress(30);

  // --- Real recording pass ---
  console.log(`[Job ${job.id}] Recording ${device} view...`);
  const context = await browser.newContext(viewportConfig);
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(()=>{});
  await page.waitForTimeout(1000);

  await job.updateProgress(40);

  //  Scroll the home page
  await page.evaluate(autoScroll).catch(() => console.log(`[Job ${job.id}] Scroll interrupted, ignoring...`));
  await page.waitForTimeout(1500);

  await job.updateProgress(50);

  //  INTERACTION: Loop 2 times to click multiple links!
  const numberOfClicks = 2;

  for (let i = 0; i < numberOfClicks; i++) {
    console.log(`[Job ${job.id}] Looking for link ${i + 1} to click...`);

    const targetHref = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const validLinks = links.filter(a => 
        a.href && 
        a.href.startsWith(window.location.origin) && 
        a.href !== window.location.href &&
        a.target !== '_blank' && // MUST stay in the same tab
        a.getBoundingClientRect().width > 0 &&
        a.getBoundingClientRect().height > 0
      );

      if (validLinks.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * validLinks.length);
      return validLinks[randomIndex].getAttribute('href');
    }).catch(() => null);

    if (targetHref) {
      console.log(`[Job ${job.id}] Randomly selected link: ${targetHref}. Moving to click...`);
      const linkLocator = page.locator(`a[href="${targetHref}"]`).first();

      if (await linkLocator.isVisible().catch(() => false)) {
        await linkLocator.scrollIntoViewIfNeeded().catch(()=>{});
        await page.waitForTimeout(1000); 
        await linkLocator.click().catch(()=>{});

        // Wait for the NEW page to load
        console.log(`[Job ${job.id}] Link clicked! Waiting for new page to load...`);
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(()=>{});
        await page.waitForTimeout(1500); 

        // Scroll the NEW page
        await page.evaluate(autoScroll).catch(()=>{}); 
        await page.waitForTimeout(1500);
      } else {
        console.log(`[Job ${job.id}] Link became hidden, skipping click ${i + 1}.`);
        break; // Stop loop if element disappeared
      }
    } else {
      console.log(`[Job ${job.id}] No valid links found on this page, stopping exploration.`);
      break; // Stop loop if no links exist on the current page
    }

    // Update progress bar slightly for each page visited
    await job.updateProgress(50 + ((i + 1) * 15)); 
  }

  await job.updateProgress(80);

  //  Grab Playwright's actual file path directly
  const originalVideoPath = await page.video().path();

  await context.close(); 
  await browser.close();

  // Upload directly to Cloudinary and Save to DB
  try {
    console.log(`[Job ${job.id}] Uploading to Cloudinary...`);
    const uploadResult = await cloudinary.uploader.upload(originalVideoPath, {
      resource_type: "video",
      folder: "clip-engine" 
    });

    //  Delete the local file after SUCCESSFUL upload
    if (fs.existsSync(originalVideoPath)) {
      fs.unlinkSync(originalVideoPath); 
    }

    console.log(`[Job ${job.id}] Saving to MongoDB...`);
    const newVideo = new Video({
      websiteUrl: url,
      device: device,
      videoUrl: uploadResult.secure_url
    });
    await newVideo.save();

    await job.updateProgress(100);
    return { videoUrl: uploadResult.secure_url };

  } catch (error) {
    console.error('Upload failed:', error);

    //  Delete the local file after FAILED upload
    if (fs.existsSync(originalVideoPath)) {
      try {
        fs.unlinkSync(originalVideoPath);
        console.log(`[Job ${job.id}] Cleaned up local file after failed upload.`);
      } catch (cleanupErr) {
        console.error(`[Job ${job.id}] Could not delete local file:`, cleanupErr.message);
      }
    }

    throw new Error('Video generated, but cloud upload failed.');
  }

}, { 
  connection: redisConnection,
  lockDuration: 300000 
});

worker.on('completed', job => console.log(`[Job ${job.id}] Completed successfully!`));
worker.on('failed', (job, err) => console.log(`[Job ${job.id}] Failed: ${err.message}`));
console.log('Worker is running and listening for jobs...');