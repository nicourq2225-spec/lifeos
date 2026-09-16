const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));

  console.log('Navigating...');
  await page.goto('http://localhost:3000/?date=2026-09-10');
  
  await page.waitForTimeout(5000);
  
  try {
    const overlay = await page.locator('nextjs-portal').innerHTML({ timeout: 2000 });
    console.log("OVERLAY HTML: ", overlay.substring(0, 5000)); // Print up to 5k chars of the error
  } catch(e) {
    console.log("No overlay found");
  }

  await browser.close();
})();
