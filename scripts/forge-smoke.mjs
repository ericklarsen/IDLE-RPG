import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const item = (id, slot, rarity, name, atk = 10) => ({
  id,
  slot,
  rarity,
  name,
  level: 20,
  atk,
  hp: 0,
  def: 0,
  power: atk * 3,
  salvage: 8,
  enhance: 0,
  pity: 0,
  refines: 0,
  enchants: 0,
  substats: [],
  runes: [null, null, null],
});

const inventory = [
  item('it_1', 'weapon', 'common', 'Worn Boots', 4),
  item('it_2', 'weapon', 'common', 'Dented Helm', 5),
  item('it_3', 'weapon', 'common', 'Copper Band', 6),
  item('it_4', 'ring', 'rare', 'Silver Ring', 14),
];

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
  ({ inventory }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem('idle-forge-onboarded-v1', '1');
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 14,
        level: 40,
        exp: 0,
        gold: 5000,
        dust: 100,
        essence: 50,
        maxStage: 20,
        farmStage: 10,
        stage: 10,
        kills: 0,
        inventory,
        equipped: {},
        itemSeq: 4,
        codex: { enemies: [], items: ['Ember Cleaver'], modifiers: [] },
        lastSeen: Date.now(),
      }),
    );
  },
  { inventory },
);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await openSection(page, 'FORGE');

console.log('forge tabs:', await page.locator('.forge-tab').count());
console.log(
  'enhance head:',
  (await page.locator('.forge-panel .section-head').first().innerText()).replaceAll('\n', ' | '),
);

await page.locator('.forge-tab', { hasText: 'FUSE' }).click();
await page.waitForTimeout(250);
const forge = page.locator('.forge-panel');
console.log('fuse panel:', await forge.count());
console.log('fuse head:', (await forge.locator('.section-head').first().innerText()).replaceAll('\n', ' | '));
console.log('common chip:', (await page.locator('.forge-chip', { hasText: 'Common' }).innerText()).replaceAll('\n', ' | '));

await page.locator('.forge-action', { hasText: 'FUSE 3 COMMON' }).click();
await page.waitForTimeout(200);
console.log('confirm fuse rows:', await page.locator('.forge-confirm .forge-list li').count());
await page.locator('.forge-confirm .forge-action', { hasText: 'CONFIRM' }).click();
await page.waitForTimeout(400);

const afterFuse = await page.evaluate(() => {
  const save = JSON.parse(localStorage.getItem('idle-forge-save-v1'));
  return {
    dust: save.dust,
    items: save.inventory.map((entry) => `${entry.rarity}:${entry.name}`),
  };
});
console.log('after fuse:', JSON.stringify(afterFuse));

await page.locator('.forge-tab', { hasText: 'CRAFT' }).click();
await page.waitForTimeout(250);
console.log(
  'craft head:',
  (await page.locator('.forge-panel .section-head').first().innerText()).replaceAll('\n', ' | '),
);

await page.locator('.forge-chip', { hasText: 'Helm' }).last().click();
await page.waitForTimeout(150);
await page.locator('.forge-action', { hasText: 'CRAFT ASHFORGED HELM' }).click();
await page.waitForTimeout(200);
console.log(
  'confirm craft:',
  (await page.locator('.forge-confirm').innerText()).replaceAll('\n', ' | '),
);
await page.locator('.forge-confirm .forge-action', { hasText: 'CONFIRM' }).click();
await page.waitForTimeout(400);

const afterCraft = await page.evaluate(() => {
  const save = JSON.parse(localStorage.getItem('idle-forge-save-v1'));
  return {
    dust: save.dust,
    essence: save.essence,
    version: save.version,
    crafted: save.inventory.filter((entry) => entry.rarity === 'epic' && entry.slot === 'helm'),
  };
});
console.log(
  'after craft:',
  JSON.stringify({
    dust: afterCraft.dust,
    essence: afterCraft.essence,
    version: afterCraft.version,
    crafted: afterCraft.crafted.map((entry) => `${entry.name}:${entry.set}`),
  }),
);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await openSection(page, 'FORGE');
console.log(
  'forge after reload:',
  (await page.locator('.forge-panel .section-head').first().innerText()).replaceAll('\n', ' | '),
);
for (const tab of ['FUSE', 'CRAFT']) {
  await page.locator('.forge-tab', { hasText: tab }).click();
  await page.waitForTimeout(250);
  console.log(
    `${tab.toLowerCase()} after reload:`,
    (await page.locator('.forge-panel .section-head').first().innerText()).replaceAll('\n', ' | '),
  );
}

const overflow = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.forge-panel *')) {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    if (parent && rect.right > parent.right + 0.5) out.push(el.className || el.tagName);
  }
  return out;
});
console.log('forge overflow:', overflow.length ? overflow : 'none');

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
