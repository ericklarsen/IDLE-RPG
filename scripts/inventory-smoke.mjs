import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'rare',
  name: 'Knight Blade',
  level: 6,
  atk: 9,
  hp: 12,
  def: 1,
  power: 34,
  salvage: 8,
};
const helm = {
  id: 'it_2',
  slot: 'helm',
  rarity: 'epic',
  name: 'Sentinel Helm',
  level: 8,
  atk: 1,
  hp: 40,
  def: 12,
  power: 62,
  salvage: 18,
};
const boots = {
  id: 'it_3',
  slot: 'boots',
  rarity: 'common',
  name: 'Worn Boots',
  level: 3,
  atk: 1,
  hp: 8,
  def: 2,
  power: 10,
  salvage: 4,
};

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await page.addInitScript(
  ({ items }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 2,
        level: 4,
        exp: 0,
        enhanceLevel: 1,
        gold: 100,
        maxStage: 1,
        kills: 3,
        inventory: items,
        equipped: {},
        itemSeq: 3,
      }),
    );
  },
  { items: [weapon, helm, boots] },
);

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await openSection(page, 'GEAR');
console.log('screen visible:', await page.locator('.screen').isVisible());
console.log('rows:', await page.locator('.item-cell:not(.empty)').count());
console.log('grid cells:', await page.locator('.item-cell').count());
console.log(
  'grid columns:',
  await page.locator('.item-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns),
);
console.log('bag header:', (await page.locator('.screen-body').innerText()).slice(0, 180).replaceAll('\n', ' | '));
await page.screenshot({ path: 'artifacts/bag.png' });

console.log('bag chips:', await page.locator('.bag-chip').count());
await page.locator('.bag-chip', { hasText: 'HELM' }).click();
await page.waitForTimeout(200);
console.log('helm rows:', await page.locator('.item-cell:not(.empty)').count());
console.log(
  'helm names:',
  (await page.locator('.item-cell:not(.empty)').allInnerTexts()).join(' | ').replaceAll('\n', ' '),
);
console.log('bag head filtered:', (await page.locator('.bag-head').innerText()).replaceAll('\n', ' | '));
await page.locator('.bag-chip', { hasText: 'AMULET' }).click();
await page.waitForTimeout(200);
console.log('empty slot message:', (await page.locator('.empty-bag').innerText()).replaceAll('\n', ' '));
await page.locator('.bag-chip', { hasText: 'RARITY' }).click();
await page.waitForTimeout(150);
console.log(
  'rarity sort pressed:',
  await page.locator('.bag-chip', { hasText: 'RARITY' }).getAttribute('aria-pressed'),
);
await page.locator('.bag-chip', { hasText: 'ALL' }).click();
await page.waitForTimeout(200);
console.log('rows after reset:', await page.locator('.item-cell:not(.empty)').count());

const firstRow = page.locator('.item-cell:not(.empty)').first();
await firstRow.click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'EQUIP', exact: true }).click();
await page.waitForTimeout(300);
console.log('equipped slots:', await page.locator('.gear-slot:not(:disabled)').count());
console.log('weapon slot:', (await page.locator('.gear-slot').first().innerText()).replaceAll('\n', ' | '));
console.log('gear after equip:', (await page.locator('.screen-body').innerText()).slice(0, 160).replaceAll('\n', ' | '));

await page.getByRole('button', { name: 'SALVAGE COMMONS' }).click();
await page.waitForTimeout(300);
console.log(
  'rows after salvage commons:',
  await page.locator('.item-cell:not(.empty)').count(),
);
console.log('gold:', (await page.locator('.screen-head .gold-chip').innerText()).replaceAll('\n', ' '));
await page.screenshot({ path: 'artifacts/bag-after.png' });

console.log('stats:', (await page.locator('.stats').innerText()).replaceAll('\n', ' | '));
await openSection(page, 'BATTLE');
console.log('top-right:', (await page.locator('.top-right').innerText()).replaceAll('\n', ' | '));
console.log(
  'saved weapon:',
  await page.evaluate(() => {
    const raw = localStorage.getItem('idle-forge-save-v1');
    return raw ? JSON.parse(raw).equipped?.weapon?.name : 'no save';
  }),
);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await openSection(page, 'GEAR');
console.log('after reload equipped slots:', await page.locator('.gear-slot:not(:disabled)').count());
console.log('after reload bag:', (await page.locator('.screen-body').innerText()).slice(0, 140).replaceAll('\n', ' | '));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
