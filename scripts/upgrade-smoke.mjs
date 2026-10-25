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
  enhance: 0,
  pity: 0,
  refines: 0,
  substats: [],
};

const helm = {
  id: 'it_2',
  slot: 'helm',
  rarity: 'rare',
  name: 'Iron Hood',
  level: 8,
  atk: 4,
  hp: 40,
  def: 6,
  power: 60,
  salvage: 20,
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

await page.addInitScript(
  ({ weapon, helm }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 3,
        level: 6,
        exp: 0,
        gold: 200000,
        maxStage: 2,
        kills: 12,
        inventory: [],
        equipped: { weapon, helm },
        itemSeq: 2,
        // Weapon slot already at the tier-A cap so auto-refine is available.
        refine: { weapon: { level: 4, progress: 0, pity: 0 } },
      }),
    );
  },
  { weapon, helm },
);

const errors = [];
const failures = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await openSection(page, 'FORGE');
const forgeBefore = (await page.locator('.enhance-btn').innerText()).replaceAll('\n', ' | ');
await page.locator('.enhance-btn').click();
await page.waitForTimeout(400);
const forgeAfter = (await page.locator('.enhance-btn').innerText()).replaceAll('\n', ' | ');
console.log('forge before:', forgeBefore);
console.log('forge after:', forgeAfter);
await openSection(page, 'GEAR');
console.log('log after enhance:', await page.locator('.log-line').innerText());

await openSection(page, 'FORGE');
const batch = page.locator('.forge-batch');
console.log('batch disabled:', await batch.isDisabled());
await batch.click();
await page.waitForTimeout(500);
await openSection(page, 'GEAR');
console.log('gear after batch:', (await page.locator('.gear-grid').innerText()).replaceAll('\n', ' | '));
console.log('log after batch:', await page.locator('.log-line').innerText());

await page.locator('.gear-slot').first().click();
await page.waitForTimeout(300);

console.log('detail:', (await page.locator('.item-detail').innerText()).slice(0, 220).replaceAll('\n', ' | '));
console.log('substats before refine:', await page.locator('.substat').count());

await page.getByRole('button', { name: 'ENHANCE ×10' }).click();
await page.waitForTimeout(400);
console.log('detail meta after batch:', await page.locator('.detail-meta').innerText());

// The chip abbreviates big numbers, so read the flushed save for exact gold.
const goldNumber = async () =>
  page.evaluate(() => {
    const raw = localStorage.getItem('idle-forge-save-v1');
    return raw ? JSON.parse(raw).gold : 0;
  });
const refineMeta = async () => (await page.locator('.refine-meta').allInnerTexts()).join(' | ');
const barWidth = async () =>
  page.locator('.refine-bar span').evaluate((el) => el.style.width);

console.log('refine before:', await refineMeta());
console.log('bar before:', await barWidth());
const goldBeforeFirst = await goldNumber();
await page.getByRole('button', { name: 'REFINE', exact: true }).click();
await page.waitForTimeout(400);
const goldAfterFirst = await goldNumber();
console.log('refine after 1:', await refineMeta());
console.log('bar after 1:', await barWidth());

await page.getByRole('button', { name: 'REFINE', exact: true }).click();
await page.waitForTimeout(400);
const goldAfterSecond = await goldNumber();
console.log('refine after 2:', await refineMeta());
console.log('bar after 2:', await barWidth());

const firstCost = goldBeforeFirst - goldAfterFirst;
const secondCost = goldAfterFirst - goldAfterSecond;
console.log('attempt costs:', firstCost, '/', secondCost);
if (firstCost !== secondCost) failures.push(`refine price changed: ${firstCost} -> ${secondCost}`);
if (firstCost <= 0) failures.push('refine charged nothing');
console.log('substat count after refine:', await page.locator('.substat').count());
console.log('substat texts:', (await page.locator('.substat-list').innerText()).replaceAll('\n', ' | '));
console.log('tier chips:', await page.locator('.tier').count());

await page.getByRole('button', { name: 'REFINE TO A' }).click();
await page.waitForTimeout(900);
console.log('substats after auto refine:', (await page.locator('.substat-list').innerText()).replaceAll('\n', ' | '));
await page.locator('.detail-back').click();
await page.waitForTimeout(200);
console.log('log after auto refine:', await page.locator('.log-line').innerText());
await page.locator('.gear-slot').first().click();
await page.waitForTimeout(300);

await page.locator('.lock-btn').first().click();
await page.waitForTimeout(200);
console.log('lock pressed:', await page.locator('.lock-btn').first().getAttribute('aria-pressed'));
await page.locator('.lock-btn').first().click();
await page.waitForTimeout(200);
console.log('lock toggled off:', await page.locator('.lock-btn').first().getAttribute('aria-pressed'));
await page.locator('.lock-btn').first().click();
await page.waitForTimeout(200);

const overflow = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.screen *')) {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    if (parent && rect.right > parent.right + 0.5) out.push(el.className || el.tagName);
  }
  return out;
});
console.log('sheet overflow:', overflow.length ? overflow : 'none');

const saved = await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  const data = raw ? JSON.parse(raw) : null;
  return data
    ? {
        version: data.version,
        enhance: data.equipped?.weapon?.enhance,
        helmEnhance: data.equipped?.helm?.enhance,
        refines: data.equipped?.weapon?.refines,
        refineSlots: data.refine,
        substats: data.equipped?.weapon?.substats,
        gold: data.gold,
      }
    : 'no save';
});
console.log('saved:', JSON.stringify(saved));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await openSection(page, 'FORGE');
console.log('forge after reload:', (await page.locator('.enhance-btn').innerText()).replaceAll('\n', ' | '));
await openSection(page, 'GEAR');
await page.locator('.gear-slot').first().click();
await page.waitForTimeout(300);
console.log('detail meta after reload:', await page.locator('.detail-meta').innerText());
console.log('locked after reload:', await page.locator('.lock-btn').first().getAttribute('aria-pressed'));
console.log('substats after reload:', (await page.locator('.substat-list').innerText()).replaceAll('\n', ' | '));
console.log('refine after reload:', await refineMeta());

console.log('errors:', errors.length ? errors : 'none');
console.log('failures:', failures.length ? failures : 'none');
await browser.close();

if (errors.length > 0 || failures.length > 0) process.exit(1);
