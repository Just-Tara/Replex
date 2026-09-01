const { chromium, devices } = require('playwright');

// automated page scroll utility (slowed down for readability)
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

/**
 * Resolves device configuration and Playwright viewport options.
 * @param {string} device
 * @param {string} outputDir
 * @returns {object} Viewport configuration
 */
const getViewportConfig = (device, outputDir) => {
  switch (device) {
    case 'desktop':
      return {
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        isMobile: false,
        hasTouch: false,
        recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } }
      };
    case 'tablet':
      return {
        ...devices['iPad (Gen 7)'],
        viewport: { width: 810, height: 1080 },
        recordVideo: { dir: outputDir, size: { width: 810, height: 1080 } }
      };
    case 'mobile':
    default:
      return {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        recordVideo: { dir: outputDir, size: { width: 390, height: 844 } }
      };
  }
};

/**
 * Records website interaction using Playwright and saves .webm to outputDir.
 * @param {object} params
 * @param {string} params.url
 * @param {string} params.device
 * @param {string} params.outputDir
 * @param {Function} [params.onProgress]
 * @returns {Promise<string>} Path to recorded video file
 */
const recordWebsite = async ({ url, device = 'mobile', outputDir, onProgress = async () => {} }) => {
  const browserArgs = ['--window-size=1920,1080'];
  const viewportConfig = getViewportConfig(device, outputDir);

  let browser = null;
  let context = null;

  try {
    // --- Warm-up pass ---
    console.log(`[Recorder] Warming up cache for ${url}...`);
    const tempBrowser = await chromium.launch({ headless: true, args: browserArgs });

    //  Turn off recording for the warm-up pass
    const warmUpConfig = { ...viewportConfig };
    delete warmUpConfig.recordVideo;

    const tempContext = await tempBrowser.newContext(warmUpConfig);
    const tempPage = await tempContext.newPage();
    await tempPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await tempBrowser.close();

    await onProgress(30);

    // --- Real recording pass ---
    console.log(`[Recorder] Recording ${device} view...`);
    browser = await chromium.launch({ headless: true, args: browserArgs });
    context = await browser.newContext(viewportConfig);
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await onProgress(40);

    //  Scroll the home page
    await page.evaluate(autoScroll).catch(() => console.log('[Recorder] Scroll interrupted, ignoring...'));
    await page.waitForTimeout(1500);

    await onProgress(50);

    //  INTERACTION: Loop 2 times to click multiple links!
    const numberOfClicks = 2;

    for (let i = 0; i < numberOfClicks; i++) {
      console.log(`[Recorder] Looking for link ${i + 1} to click...`);

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
        console.log(`[Recorder] Randomly selected link: ${targetHref}. Moving to click...`);
        const linkLocator = page.locator(`a[href="${targetHref}"]`).first();

        if (await linkLocator.isVisible().catch(() => false)) {
          await linkLocator.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(1000);
          await linkLocator.click().catch(() => {});

          // Wait for the NEW page to load
          console.log(`[Recorder] Link clicked! Waiting for new page to load...`);
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(1500);

          // Scroll the NEW page
          await page.evaluate(autoScroll).catch(() => {});
          await page.waitForTimeout(1500);
        } else {
          console.log(`[Recorder] Link became hidden, skipping click ${i + 1}.`);
          break; // Stop loop if element disappeared
        }
      } else {
        console.log('[Recorder] No valid links found on this page, stopping exploration.');
        break; // Stop loop if no links exist on the current page
      }

      // Update progress bar slightly for each page visited
      await onProgress(50 + ((i + 1) * 15));
    }

    await onProgress(80);

    //  Grab Playwright's actual file path directly
    const originalVideoPath = await page.video().path();

    await context.close();
    context = null;

    await browser.close();
    browser = null;

    return originalVideoPath;
  } catch (error) {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    throw error;
  }
};

module.exports = {
  recordWebsite
};
