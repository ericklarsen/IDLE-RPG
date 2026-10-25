import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

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
  if (localStorage.getItem('idle-forge-save-v1')) return;
  // A run past stage 50 owns the whole roster.
  localStorage.setItem(
    'idle-forge-save-v1',
    JSON.stringify({ version: 24, level: 30, exp: 0, gold: 500, maxStage: 50, kills: 0, inventory: [] }),
  );
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await openSection(page, 'PARTY');
console.log('roster cards:', await page.locator('.party-card').count());
console.log('unlocked:', await page.locator('.party-card:not(.locked)').count());
console.log('slots before:', (await page.locator('.party-slots').innerText()).replaceAll('\n', ' | '));

await page.locator('.party-card', { hasText: 'Ranger' }).getByRole('button', { name: 'ADD' }).click();
await page.waitForTimeout(400);
console.log('slot 2:', (await page.locator('.party-slot').nth(1).innerText()).replaceAll('\n', ' | '));

await page.locator('.party-slot').nth(1).getByRole('button', { name: 'LEAD' }).click();
await page.waitForTimeout(400);
console.log('leader slot class:', await page.locator('.party-slot.leader').getAttribute('class'));
console.log('save party:', await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  const data = raw ? JSON.parse(raw) : null;
  return data ? JSON.stringify(data.party) : 'no party';
}));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await openSection(page, 'PARTY');
console.log('after reload slot 2:', (await page.locator('.party-slot').nth(1).innerText()).replaceAll('\n', ' | '));

await page.locator('.party-slot').nth(1).getByRole('button', { name: 'REMOVE' }).click();
await page.waitForTimeout(400);
console.log('after remove slot 2:', (await page.locator('.party-slot').nth(1).innerText()).replaceAll('\n', ' | '));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length > 0) process.exit(1);
