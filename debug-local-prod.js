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

  console.log('Navigating to local prod app...');
  await page.goto('http://localhost:3000/?date=2026-09-10');
  
  console.log('Waiting for load...');
  await page.waitForTimeout(5000); // give it time to crash
  
  await browser.close();
})();
