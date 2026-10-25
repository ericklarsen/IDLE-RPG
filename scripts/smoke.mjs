import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.addInitScript(() => {
  localStorage.setItem('idle-forge-onboarded-v1', '1');
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('canvas:', await page.locator('canvas').count());
console.log('initial panel:', (await page.locator('.panel').innerText()).replaceAll('\n', ' | '));
await page.screenshot({ path: 'artifacts/initial.png' });

await page.waitForTimeout(11000);

await openSection(page, 'FORGE');
const button = page.locator('.enhance-btn');
const disabledBefore = await button.isDisabled();
console.log('enhance disabled after 13s:', disabledBefore);
console.log('panel before click:', (await page.locator('.panel').innerText()).replaceAll('\n', ' | '));

if (!disabledBefore) {
  await button.click();
  await page.waitForTimeout(500);
}

await openSection(page, 'BATTLE');
console.log('panel after click:', (await page.locator('.panel').innerText()).replaceAll('\n', ' | '));
await page.screenshot({ path: 'artifacts/playing.png' });

const beforeReload = await page.locator('.gold-chip').innerText();
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const afterReload = await page.locator('.gold-chip').innerText();
console.log('gold before reload:', beforeReload, 'after reload:', afterReload);

await page.screenshot({ path: 'artifacts/reloaded.png' });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
