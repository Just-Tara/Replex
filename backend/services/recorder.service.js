const { chromium, devices } = require('playwright');

/**
 * Automated smooth page scroll utility.
 */
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
 * Records website interaction using Playwright and saves video to outputDir.
 * @param {object} params
 * @param {string} params.url
 * @param {string} [params.device]
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

    // Initial page scroll
    await page.evaluate(autoScroll).catch(() => console.log('[Recorder] Scroll interrupted...'));
    await page.waitForTimeout(1000);
    await onProgress(50);

    if (device === 'mobile' || device === 'tablet') {
      console.log(`[Recorder] Mobile/Tablet: Preparing for menu interaction...`);

      // Snap back to top to ensure header navigation is visible
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1500);

      // Common mobile hamburger / navigation toggle selectors
      const menuSelectors = [
        'button[aria-label*="menu" i]',
        '[aria-label*="navigation" i]',
        '.hamburger',
        '[class*="hamburger" i]',
        'button[class*="menu" i]',
        '#menu-toggle',
        'button svg'
      ];

      let menuOpened = false;
      for (const selector of menuSelectors) {
        const menuBtn = page.locator(selector).first();
        if (await menuBtn.isVisible().catch(() => false)) {
          console.log(`[Recorder] Found menu button via: ${selector}. Clicking...`);
          await menuBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(2000);
          menuOpened = true;
          break;
        }
      }

      if (menuOpened) {
        console.log(`[Recorder] Menu open. Forcing click on internal link...`);

        // Target common navigation links
        const targetLink = page.locator('a', { hasText: /(Services|Pricing|About|Contact)/i }).filter({ visible: true }).first();

        if (await targetLink.isVisible().catch(() => false)) {
          console.log(`[Recorder] Clicking visible menu link...`);
          await targetLink.click({ force: true }).catch(() => {});

          await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(2000);

          await page.evaluate(autoScroll).catch(() => {});
          await page.waitForTimeout(1500);
        } else {
          console.log(`[Recorder] Could not locate Services/Pricing links in the menu.`);
        }
      }
      await onProgress(80);

    } else {
      // Desktop link exploration
      const numberOfClicks = 2;
      for (let i = 0; i < numberOfClicks; i++) {
        console.log(`[Recorder] Looking for link ${i + 1} to click...`);
        const targetHref = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const validLinks = links.filter(a =>
            a.href &&
            a.href.startsWith(window.location.origin) &&
            a.href !== window.location.href &&
            a.target !== '_blank' &&
            a.getBoundingClientRect().width > 0 &&
            a.getBoundingClientRect().height > 0
          );
          if (validLinks.length === 0) return null;
          return validLinks[Math.floor(Math.random() * validLinks.length)].getAttribute('href');
        }).catch(() => null);

        if (targetHref) {
          const linkLocator = page.locator(`a[href="${targetHref}"]`).first();
          if (await linkLocator.isVisible().catch(() => false)) {
            await linkLocator.scrollIntoViewIfNeeded().catch(() => {});
            await page.waitForTimeout(1000);
            await linkLocator.click().catch(() => {});
            await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(1500);
            await page.evaluate(autoScroll).catch(() => {});
            await page.waitForTimeout(1500);
          } else {
            break;
          }
        } else {
          break;
        }
        await onProgress(50 + ((i + 1) * 15));
      }
      await onProgress(80);
    }

    // Grab Playwright's actual file path directly
    const originalVideoPath = await page.video().path();

    // Closing page and context ensures the video file is completely written to disk
    await page.close();
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