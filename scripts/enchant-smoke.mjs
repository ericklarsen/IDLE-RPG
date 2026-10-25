import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Ember Cleaver',
  level: 12,
  atk: 30,
  hp: 60,
  def: 3,
  power: 110,
  salvage: 40,
  enhance: 2,
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

await page.addInitScript(
  ({ weapon }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 4,
        level: 8,
        exp: 0,
        gold: 100000,
        essence: 500,
        cores: 8,
        boosts: {},
        maxStage: 2,
        kills: 30,
        inventory: [],
        equipped: { weapon },
        itemSeq: 1,
      }),
    );
  },
  { weapon },
);

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await openSection(page, 'GEAR');
console.log('attune row:', (await page.locator('.attune-row').innerText()).replaceAll('\n', ' | '));
await page.locator('.screen-back').count();
await openSection(page, 'BATTLE');
console.log('enemy element tag:', await page.locator('.elem-tag').first().innerText());

await openSection(page, 'BOOSTS');
console.log('boost tab rows:', await page.locator('.boost-row').count());
console.log(
  'boost header:',
  (await page.locator('.boost-panel .section-head', { hasText: 'BOSS CORES' }).innerText()).replaceAll(
    '\n',
    ' | ',
  ),
);
console.log('boost row:', (await page.locator('.boost-row').first().innerText()).replaceAll('\n', ' | '));

await page.locator('.boost-btn').first().click();
await page.waitForTimeout(400);
console.log('boost row after:', (await page.locator('.boost-row').first().innerText()).replaceAll('\n', ' | '));
console.log(
  'cores after boost:',
  (await page.locator('.boost-panel .section-head', { hasText: 'BOSS CORES' }).innerText()).replaceAll(
    '\n',
    ' | ',
  ),
);

const boostOverflow = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.boost-panel *')) {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    if (parent && rect.right > parent.right + 0.5) out.push(el.className || el.tagName);
  }
  return out;
});
console.log('boost overflow:', boostOverflow.length ? boostOverflow : 'none');

await openSection(page, 'GEAR');
await page.locator('.gear-slot').first().click();
await page.waitForTimeout(300);

console.log('rune slots before:', await page.locator('.rune-slot').count());
console.log('rune section:', (await page.locator('.rune-slots').innerText()).replaceAll('\n', ' | '));
console.log('essence before:', (await page.locator('.item-detail .section-head').nth(2).innerText()).replaceAll('\n', ' | '));

const fireBtn = page.locator('.rune-btn', { hasText: 'FIRE' });
await fireBtn.click();
await page.waitForTimeout(250);
await fireBtn.click();
await page.waitForTimeout(250);
await fireBtn.click();
await page.waitForTimeout(300);

console.log('rune slots after:', (await page.locator('.rune-slots').innerText()).replaceAll('\n', ' | '));
console.log('resonance:', await page.locator('.rune-resonance').count());
console.log('essence after:', (await page.locator('.item-detail .section-head').nth(2).innerText()).replaceAll('\n', ' | '));

const detailOverflow = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.screen *')) {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    if (parent && rect.right > parent.right + 0.5) out.push(el.className || el.tagName);
  }
  return out;
});
console.log('detail overflow:', detailOverflow.length ? detailOverflow : 'none');

await page.locator('.detail-back').click();
await page.waitForTimeout(300);
console.log('attune row after:', (await page.locator('.attune-row').innerText()).replaceAll('\n', ' | '));
console.log('stats:', (await page.locator('.stats').innerText()).replaceAll('\n', ' | '));

const saved = await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  const data = raw ? JSON.parse(raw) : null;
  return data
    ? {
        version: data.version,
        essence: data.essence,
        cores: data.cores,
        boosts: data.boosts,
        runes: data.equipped?.weapon?.runes,
      }
    : 'no save';
});
console.log('saved:', JSON.stringify(saved));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await openSection(page, 'GEAR');
console.log('attune row after reload:', (await page.locator('.attune-row').innerText()).replaceAll('\n', ' | '));
await openSection(page, 'BOOSTS');
console.log('boost after reload:', (await page.locator('.boost-row').first().innerText()).replaceAll('\n', ' | '));
await openSection(page, 'GEAR');
await page.locator('.gear-slot').first().click();
await page.waitForTimeout(300);
console.log('runes after reload:', (await page.locator('.rune-slots').innerText()).replaceAll('\n', ' | '));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
