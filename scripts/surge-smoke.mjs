import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const weapon = {
  id: 'it_surge',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Surge Cleaver',
  level: 20,
  atk: 4000,
  hp: 0,
  def: 0,
  power: 100,
  salvage: 10,
  enhance: 0,
  pity: 0,
  refines: 0,
  enchants: 0,
  substats: [],
  runes: [null, null, null],
};

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

await page.addInitScript(
  ({ weapon }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem('idle-forge-onboarded-v1', '1');
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 13,
        level: 60,
        exp: 0,
        gold: 5000,
        maxStage: 30,
        farmStage: 30,
        stage: 30,
        kills: 0,
        inventory: [],
        equipped: { weapon },
        itemSeq: 1,
        lastSeen: Date.now(),
      }),
    );
  },
  { weapon },
);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await openSection(page, 'GEAR');

const row = page.locator('.surge-row');
console.log('surge row:', await row.count());
console.log('label start:', await page.locator('.surge-label').innerText());

await page.waitForFunction(
  () => document.querySelector('.surge-row')?.classList.contains('active'),
  { timeout: 15000 },
);
console.log('label active:', await page.locator('.surge-label').innerText());
console.log('bar width:', await page.locator('.track.surge > span').evaluate((el) => el.style.width));

// Reloading must drop the charge: the meter is intentionally not in the save.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await openSection(page, 'GEAR');
console.log('label after reload:', await page.locator('.surge-label').innerText());
console.log(
  'active after reload:',
  await row.evaluate((el) => el.classList.contains('active')),
);

const savedKeys = await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  return raw ? Object.keys(JSON.parse(raw)) : [];
});
console.log('save stores surge:', savedKeys.includes('surge'));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
