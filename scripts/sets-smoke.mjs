import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

function item(overrides) {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Ember Cleaver',
    level: 8,
    atk: 12,
    hp: 20,
    def: 2,
    power: 90,
    salvage: 20,
    ...overrides,
  };
}

const weapon = item({ id: 'it_1', slot: 'weapon', name: 'Ember Cleaver' });
const helm = item({ id: 'it_2', slot: 'helm', name: 'Crown of Ash', atk: 2, hp: 30, def: 8 });
const armor = item({ id: 'it_3', slot: 'armor', name: 'Ember Aegis', atk: 1, hp: 45, def: 14 });
const boots = item({ id: 'it_4', slot: 'boots', name: 'Ash Striders', atk: 2, hp: 22, def: 6 });
const voidBlade = item({
  id: 'it_5',
  slot: 'weapon',
  rarity: 'legendary',
  name: 'Void Reaver',
  atk: 15,
  hp: 18,
  def: 2,
});

// Items are seeded without a `set` field: the game has to derive the tag from
// the name, which is the same path an older save takes.
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await page.addInitScript(
  ({ equipped, bag }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 9,
        level: 3,
        exp: 0,
        gold: 500,
        maxStage: 3,
        farmStage: 3,
        stage: 3,
        kills: 5,
        inventory: bag,
        equipped: { weapon: equipped },
        itemSeq: 5,
      }),
    );
  },
  { equipped: weapon, bag: [helm, armor, boots, voidBlade] },
);

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

async function atk() {
  const text = await page.locator('.stats div:has(label:text-is("ATK")) b').innerText();
  return Number(text.replace(/[^\d.]/g, ''));
}

async function setLineText() {
  return (await page.locator('.set-line').first().innerText()).replaceAll('\n', ' | ');
}

async function tierStates() {
  return page
    .locator('.set-line .set-tier')
    .evaluateAll((nodes) => nodes.map((node) => node.className));
}

async function equipFromBag(name) {
  await page.locator('.item-cell', { hasText: name }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'EQUIP', exact: true }).click();
  await page.waitForTimeout(250);
}

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await openSection(page, 'GEAR');
const atkOne = await atk();

const lineOne = await setLineText();
const tiersOne = await tierStates();
console.log('set line one piece:', lineOne);
console.log('tiers one piece:', tiersOne);

await page.locator('.item-cell', { hasText: 'Crown of Ash' }).click();
await page.waitForTimeout(300);
const detailSet = (await page.locator('.set-detail').innerText()).replaceAll('\n', ' | ');
const hint = await page.locator('.set-hint').innerText();
console.log('detail set block:', detailSet);
console.log('detail hint:', hint);
await page.screenshot({ path: 'artifacts/sets-detail.png' });
await page.getByRole('button', { name: 'EQUIP', exact: true }).click();
await page.waitForTimeout(300);

const lineTwo = await setLineText();
const tiersTwo = await tierStates();
console.log('set line two pieces:', lineTwo);
console.log('tiers two pieces:', tiersTwo);

await equipFromBag('Ember Aegis');
const lineThree = await setLineText();
const tiersThree = await tierStates();
const atkThree = await atk();
console.log('set line three pieces:', lineThree);
console.log('tiers three pieces:', tiersThree);

await equipFromBag('Ash Striders');
const lineFour = await setLineText();
const tiersFour = await tierStates();
const atkFour = await atk();
console.log('set line four pieces:', lineFour);
console.log('tiers four pieces:', tiersFour);
console.log('ATK per piece count:', { one: atkOne, three: atkThree, four: atkFour });

const voidCell = page.locator('.item-cell', { hasText: 'Void Reaver' });
const voidLabel = await voidCell.getAttribute('aria-label');
const voidMarkers = await voidCell.locator('.item-cell-set').count();
console.log('voidbound cell:', voidLabel, 'set markers:', voidMarkers);

const sheetOverflow = await page
  .locator('.screen')
  .evaluate((node) => node.scrollWidth - node.clientWidth);
console.log('sheet horizontal overflow:', sheetOverflow);
await page.screenshot({ path: 'artifacts/sets-gear.png' });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await openSection(page, 'GEAR');
const lineReload = await setLineText();
const tiersReload = await tierStates();
console.log('after reload:', lineReload);
console.log('after reload tiers:', tiersReload);
const savedSets = await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  if (!raw) return 'no save';
  const save = JSON.parse(raw);
  return ['weapon', 'helm', 'armor', 'boots']
    .map((slot) => `${slot}:${save.equipped?.[slot]?.name ?? '—'}:${save.equipped?.[slot]?.set ?? 'no-set'}`)
    .join(' | ');
});
console.log('saved sets:', savedSets);

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

const checks = {
  'one-piece line': lineOne.includes('1/6 EQUIPPED') && lineOne.includes('+10% ATK'),
  '2pc tier active': tiersTwo.some((name) => name.includes('on')),
  '4pc tier still off at 3': !tiersThree[1]?.includes('on'),
  '4pc tier active': tiersFour.length === 2 && tiersFour.every((name) => name.includes('on')),
  'detail names the set': detailSet.includes('ASHFORGED'),
  'detail shows equip hint': hint.includes('Equip this piece'),
  'ATK rose with 2pc': atkThree > atkOne,
  '4pc boots still add their own stats': atkFour > atkThree,
  'voidbound marker': voidMarkers === 1 && Boolean(voidLabel?.includes('Voidbound')),
  'no sheet overflow': sheetOverflow <= 0,
  'set survives reload': lineReload.includes('4/6 EQUIPPED') && tiersReload.every((name) => name.includes('on')),
  'saved items carry set': savedSets.includes('helm:Crown of Ash:ashforged') && savedSets.includes('armor:Ember Aegis:ashforged'),
  'no console errors': errors.length === 0,
};

console.log('checks:', checks);
if (Object.values(checks).some((passed) => !passed)) process.exit(1);
