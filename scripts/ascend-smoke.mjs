import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch();

async function seedPage(save, viewport = { width: 390, height: 844 }) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.addInitScript(({ data }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem('idle-forge-save-v1', JSON.stringify(data));
  }, { data: save });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return page;
}

const errors = [];

const eligibleSave = {
  version: 7,
  level: 30,
  exp: 0,
  gold: 500000,
  essence: 20,
  cores: 8,
  books: 6,
  boosts: { offense: 3 },
  skills: {
    active: ['ember-burst', 'holy-mend', null],
    passive: 'keen-edge',
    levels: { 'ember-burst': 4 },
  },
  ascension: { count: 0, shards: 20, nodes: {} },
  maxStage: 50,
  kills: 900,
  inventory: [],
  equipped: {
    weapon: {
      id: 'it_1',
      slot: 'weapon',
      rarity: 'epic',
      name: 'Old Ember Cleaver',
      level: 50,
      atk: 60,
      hp: 90,
      def: 5,
      power: 200,
      salvage: 40,
      enhance: 2,
      pity: 0,
      refines: 0,
      enchants: 1,
      substats: [],
      runes: [null, null, null],
    },
  },
  itemSeq: 1,
};

const page = await seedPage(eligibleSave);
await openSection(page, 'ASCEND');

console.log('tabs:', await page.locator('.dock-btn').count());
console.log('status:', (await page.locator('.ascend-status').innerText()).replaceAll('\n', ' | '));
console.log('nodes:', await page.locator('.ascend-node').count());
console.log('node first:', (await page.locator('.ascend-node').first().innerText()).replaceAll('\n', ' | '));
console.log('ascend button:', await page.locator('.ascend-btn').innerText());

await openSection(page, 'GEAR');
const statsBefore = (await page.locator('.stats').innerText()).replaceAll('\n', ' | ');
await openSection(page, 'ASCEND');
await page.locator('.ascend-node-btn').first().click();
await page.waitForTimeout(400);
console.log('node after buy:', (await page.locator('.ascend-node').first().innerText()).replaceAll('\n', ' | '));
console.log('shards after buy:', (await page.locator('.ascend-panel .section-head').first().innerText()).replaceAll('\n', ' | '));
console.log('stats before:', statsBefore);
await openSection(page, 'GEAR');
console.log('stats after:', (await page.locator('.stats').innerText()).replaceAll('\n', ' | '));
await openSection(page, 'ASCEND');

await page.locator('.ascend-btn').click();
await page.waitForTimeout(300);
console.log('confirm visible:', await page.locator('.ascend-confirm').isVisible());
console.log('warning:', (await page.locator('.ascend-warning').innerText()).replaceAll('\n', ' | '));
await page.getByRole('button', { name: 'CANCEL' }).click();
await page.waitForTimeout(300);
console.log('confirm after cancel:', await page.locator('.ascend-confirm').count());

await page.locator('.ascend-btn').click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'CONFIRM ASCEND' }).click();
await page.waitForTimeout(700);
console.log('confirm after ascend:', await page.locator('.ascend-confirm').count());
console.log('status after ascend:', (await page.locator('.ascend-status').innerText()).replaceAll('\n', ' | '));
console.log('shards after ascend:', (await page.locator('.ascend-panel .section-head').first().innerText()).replaceAll('\n', ' | '));
console.log('button after ascend:', await page.locator('.ascend-btn').innerText());

await openSection(page, 'BATTLE');
console.log('hud stage:', (await page.locator('.stage-value').innerText()).replaceAll('\n', ' | '));
await openSection(page, 'GEAR');
console.log('gear stats:', (await page.locator('.stats').innerText()).replaceAll('\n', ' | '));

const saved = await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  const data = raw ? JSON.parse(raw) : null;
  return data
    ? {
        version: data.version,
        level: data.level,
        gold: data.gold,
        maxStage: data.maxStage,
        boosts: data.boosts,
        weapon: data.equipped?.weapon?.name,
        ascension: data.ascension,
        skillLevel: data.skills?.levels?.['ember-burst'],
      }
    : 'no save';
});
console.log('saved:', JSON.stringify(saved));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await openSection(page, 'ASCEND');
console.log('shards after reload:', (await page.locator('.ascend-panel .section-head').first().innerText()).replaceAll('\n', ' | '));
console.log('node after reload:', (await page.locator('.ascend-node').first().innerText()).replaceAll('\n', ' | '));
await page.close();

const locked = await seedPage(
  { ...eligibleSave, maxStage: 20, ascension: { count: 0, shards: 0, nodes: {} } },
  { width: 360, height: 740 },
);
await openSection(locked, 'ASCEND');
console.log('locked button:', await locked.locator('.ascend-btn').innerText());
console.log('locked disabled:', await locked.locator('.ascend-btn').isDisabled());
const overflow = await locked.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.ascend-panel *, .dock-btn')) {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    if (parent && rect.right > parent.right + 0.5) out.push(el.className || el.tagName);
  }
  return out;
});
console.log('ascend overflow:', overflow.length ? overflow : 'none');
await locked.close();

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
