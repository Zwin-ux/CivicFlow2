const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

(async () => {
  const outDir = path.resolve(__dirname, '../../tests/visual');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const baselinePath = path.join(outDir, 'baseline-demo-sba.png');
  const currentPath = path.join(outDir, 'current-demo-sba.png');
  const diffPath = path.join(outDir, 'diff-demo-sba.png');

  const demoPath = path.resolve(__dirname, '../../public/demo-sba.html');
  const fileUrl = `file://${demoPath}`;

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
    console.log('Opening demo page:', fileUrl);
    await page.goto(fileUrl, { waitUntil: 'networkidle2' });
    // Wait a moment for fonts/styles to settle
    await page.waitForTimeout(600);

    // Dismiss any dialogs (none expected) and capture screenshot
    await page.screenshot({ path: currentPath, fullPage: false });
    console.log('Captured screenshot to', currentPath);

    if (!fs.existsSync(baselinePath)) {
      fs.copyFileSync(currentPath, baselinePath);
      console.log(`Baseline image created at ${baselinePath}. Re-run test to compare.`);
      process.exit(0);
    }

    // Compare images
    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    const img2 = PNG.sync.read(fs.readFileSync(currentPath));

    const { width, height } = img1;
    if (width !== img2.width || height !== img2.height) {
      console.error('Baseline and current image have different sizes. Test failed.');
      process.exit(2);
    }

    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.14 });

    if (diffPixels > 0) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      console.error(`Visual regression detected: ${diffPixels} pixels differ. Diff written to ${diffPath}`);
      process.exit(3);
    }

    console.log('No visual differences detected.');
    process.exit(0);
  } catch (err) {
    console.error('Visual test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
