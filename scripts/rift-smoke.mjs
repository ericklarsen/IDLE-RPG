import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Rift Cleaver',
  level: 12,
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
        version: 9,
        level: 30,
        exp: 0,
        gold: 5000,
        maxStage: 12,
        farmStage: 12,
        stage: 12,
        rift: { day: '2020-01-01', kills: 0 },
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
await page.waitForTimeout(1200);

const goldStart = await page.locator('.gold-chip').innerText();
console.log('menu dot while rift ready:', await page.locator('.dock-menu .dock-dot').count());

await openSection(page, 'RIFT');
console.log('panel:', (await page.locator('.rift-panel').innerText()).replaceAll('\n', ' | '));

await page.getByRole('button', { name: 'ENTER RIFT' }).click();
await page.waitForTimeout(600);
console.log('screen open after enter:', await page.locator('.screen').count());
console.log('rift row:', (await page.locator('.rift-row').innerText()).replaceAll('\n', ' | '));
console.log('pill:', await page.locator('.auto-pill').innerText());
console.log('push row while rift:', await page.locator('.push-row').count());

let result = null;
for (let i = 0; i < 40; i += 1) {
  await page.waitForTimeout(2000);
  if ((await page.locator('.rift-result').count()) > 0) {
    result = await page.locator('.rift-result').innerText();
    break;
  }
}

console.log('result:', result ? result.replaceAll('\n', ' | ') : 'MISSING');
await page.locator('.report-claim').click();
await page.waitForTimeout(400);
console.log('rift row after close:', await page.locator('.rift-row').count());
console.log('push row after close:', await page.locator('.push-row').count());
console.log('menu dot after rift:', await page.locator('.dock-menu .dock-dot').count());
const goldEnd = await page.locator('.gold-chip').innerText();
console.log('gold:', goldStart.replaceAll('\n', ' '), '->', goldEnd.replaceAll('\n', ' '));

const saved = await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  return raw ? JSON.parse(raw) : null;
});
console.log('saved:', {
  version: saved?.version,
  stage: saved?.stage,
  farmStage: saved?.farmStage,
  rift: saved?.rift,
});

await openSection(page, 'RIFT');
console.log('panel after run:', (await page.locator('.rift-panel').innerText()).replaceAll('\n', ' | '));
await openSection(page, 'BATTLE');
await page.waitForTimeout(200);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await openSection(page, 'RIFT');
console.log('panel after reload:', (await page.locator('.rift-panel').innerText()).replaceAll('\n', ' | '));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (!result || errors.length > 0) process.exit(1);
