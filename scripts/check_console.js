import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
  );

  try {
    await page.goto('http://localhost:5173/3d-viewer', { waitUntil: 'networkidle' });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  await browser.close();
})();
