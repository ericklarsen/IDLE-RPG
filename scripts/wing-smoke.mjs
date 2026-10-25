import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

// A high-level knight so a wing's passive shows up clearly in the ATK readout.
const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Skyrend Blade',
  level: 40,
  atk: 500_000,
  hp: 900_000,
  def: 40,
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
        version: 21,
        level: 50,
        exp: 0,
        gold: 5_000_000,
        crystals: 200,
        maxStage: 70,
        farmStage: 70,
        stage: 70,
        kills: 0,
        inventory: [],
        equipped: { weapon },
        itemSeq: 1,
        lastSeen: Date.now(),
        wings: { active: 'rimepinions', owned: { rimepinions: { level: 3 } } },
      }),
    );
  },
  { weapon },
);

const readSave = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);

const atkValue = async () =>
  Number((await page.locator('.stats > div').first().innerText()).replace(/[^0-9.]/g, ''));

await openSection(page, 'GEAR');
const atkWorn = await atkValue();

await openSection(page, 'WINGS');
const head = (await page.locator('.wing-panel .section-head').innerText()).replaceAll('\n', ' | ');
const cards = await page.locator('.wing-card').count();
const locked = await page.locator('.wing-card:not(.owned)').count();
const rime = page.locator('.wing-card', { hasText: 'Rimepinions' });
const worn = (await rime.innerText()).replaceAll('\n', ' | ');
console.log('vault head:', head, '· cards:', cards, '· locked:', locked);
console.log('worn card:', worn);

const goldBeforeTemper = (await readSave()).gold;
const crystalsBeforeTemper = (await readSave()).crystals;
await rime.locator('.companion-btn').last().click();
await page.waitForTimeout(500);
const tempered = (await rime.innerText()).replaceAll('\n', ' | ');
const afterTemper = await readSave();
console.log('after temper:', tempered);
console.log(
  'temper cost: gold',
  goldBeforeTemper,
  '→',
  afterTemper.gold,
  '· crystals',
  crystalsBeforeTemper,
  '→',
  afterTemper.crystals,
);

// The risky craft: it either lands the pair or refunds half the crystals. Both
// are valid outcomes, so the check pins the books rather than the roll.
const ember = page.locator('.wing-card', { hasText: 'Emberpinions' });
const craftLabel = await ember.locator('.companion-btn').innerText();
const goldBeforeCraft = (await readSave()).gold;
const crystalsBeforeCraft = (await readSave()).crystals;
await ember.locator('.companion-btn').click();
await page.waitForTimeout(600);
const afterCraft = await readSave();
const crafted = Boolean(afterCraft.wings?.owned?.emberpinions);
const spent = {
  gold: goldBeforeCraft - afterCraft.gold,
  crystals: crystalsBeforeCraft - afterCraft.crystals,
};
console.log('craft button:', craftLabel);
console.log('craft result:', crafted ? 'success' : 'failed', '· spent:', spent);
console.log('craft save:', afterCraft.wings);

await openSection(page, 'GEAR');
const craftLog = await page.locator('.log-line').innerText();
const atkTempered = await atkValue();
console.log('craft log:', craftLog);
await openSection(page, 'WINGS');
await rime.locator('.companion-btn').first().click();
await page.waitForTimeout(400);
const folded = (await rime.innerText()).replaceAll('\n', ' | ');
const afterFold = await readSave();
await openSection(page, 'GEAR');
const atkFolded = await atkValue();
console.log('atk worn → folded:', atkTempered, '→', atkFolded, '· active:', afterFold.wings?.active);

await openSection(page, 'WINGS');
await rime.locator('.companion-btn').first().click();
await page.waitForTimeout(400);
const reworn = (await rime.innerText()).replaceAll('\n', ' | ');
console.log('after rewear:', reworn);

await openSection(page, 'DUNGEON');
const odds = await page.locator('.dungeon-odds').allInnerTexts();
const wingOdds = await page.locator('.wing-odds').allInnerTexts();
const wingChips = await page.locator('.dungeon-card').first().locator('.wing-chip').count();
console.log('odds:', odds.join(' / '), '· wings:', wingOdds.join(' / '), '· chips:', wingChips);

await openSection(page, 'MENU');
const menuCards = await page.locator('.menu-wings').count();
const overflow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow'] : [];
});
console.log('menu wing card:', menuCards, '· menu overflow:', overflow.length ? overflow : 'none');

await openSection(page, 'BATTLE');
await page.waitForTimeout(900);
await page.screenshot({ path: 'artifacts/wings.png' });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1300);
await openSection(page, 'WINGS');
const reloaded = (await page.locator('.wing-card', { hasText: 'Rimepinions' }).innerText()).replaceAll(
  '\n',
  ' | ',
);
const reloadedSave = await readSave();
console.log('after reload:', reloaded);
console.log('save version:', reloadedSave.version, '· wings:', reloadedSave.wings);

await page.setViewportSize({ width: 360, height: 640 });
await page.waitForTimeout(250);
const narrow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow at 360'] : [];
});
console.log('overflow:', overflow.length ? overflow : 'none', '· 360:', narrow.length ? narrow : 'none');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();

const temperCost = {
  gold: goldBeforeTemper - afterTemper.gold,
  crystals: crystalsBeforeTemper - afterTemper.crystals,
};
// Farming income lands while the click is in flight, so the gold delta only has
// to prove the fee was paid; crystals are exact and prove which branch ran.
const craftBooksOk =
  (crafted ? spent.crystals === 45 : spent.crystals === 23) && spent.gold >= 30_000;

const checks = {
  'three wings in the vault': cards === 3 && locked === 2,
  'vault counts the owned pair': head.includes('WING VAULT · 1/3'),
  'worn pair is flagged': worn.includes('WORN') && worn.includes('LV 3/12'),
  'passives and skill shown': worn.includes('ATK') && worn.includes('chance on hit'),
  'temper raises level and spends gold': tempered.includes('LV 4/12') && temperCost.gold > 0,
  'temper spends crystals': temperCost.crystals === 3,
  'craft shows the odds': /CRAFT · 45% · ◆/.test(craftLabel),
  'craft books balance': craftBooksOk,
  'wings raise ATK': atkTempered > atkFolded,
  'fold clears the slot': !folded.includes('WORN') && afterFold.wings?.active === null,
  'wear restores the slot': reworn.includes('WORN'),
  'dungeon shows wing odds': wingOdds.join(' ') === '0.2% WING 0.4% WING 0.7% WING',
  'wing odds sit under the mount odds': odds.join(' ') === '1% MOUNT 3% MOUNT 5% MOUNT',
  'each tier lists its wing': wingChips === 1,
  'wings persist after reload': reloaded.includes('WORN') && reloaded.includes('LV 4/12'),
  'menu links the vault': menuCards === 1,
  'save migrates to v23': reloadedSave.version === 23,
  'no overflow': overflow.length === 0,
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};
console.log(checks);
if (Object.values(checks).some((value) => !value)) process.exit(1);
