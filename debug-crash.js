const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE ERROR: "${msg.text()}"`);
    }
  });

  page.on('pageerror', error => {
    console.log(`UNCAUGHT ERROR: ${error.message}`);
  });

  console.log('Navigating to Vercel app...');
  await page.goto('https://lifeos-opal-psi.vercel.app/?date=2026-09-10');
  
  console.log('Waiting for load...');
  await page.waitForTimeout(5000); // give it time to crash
  
  await browser.close();
})();
