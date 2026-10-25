import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

// A save one version behind (v19) with enough crystals to craft one mount.
const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Dungeon Cleaver',
  level: 40,
  atk: 2_000_000,
  hp: 5_000_000,
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
        version: 19,
        level: 50,
        exp: 0,
        gold: 1_000_000,
        crystals: 30,
        maxStage: 60,
        farmStage: 60,
        stage: 60,
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

const readSave = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);

const atkValue = async () =>
  Number((await page.locator('.stats > div').first().innerText()).replace(/[^0-9.]/g, ''));
await openSection(page, 'GEAR');
const atkBefore = await atkValue();

await openSection(page, 'MOUNTS');
const head = (await page.locator('.mount-panel .section-head').innerText()).replaceAll('\n', ' | ');
const cards = await page.locator('.mount-card').count();
const locked = await page.locator('.mount-card:not(.owned)').count();
console.log('stable head:', head, '· cards:', cards, '· locked:', locked);

const ember = page.locator('.mount-card', { hasText: 'Ember Steed' });
const craftLabel = await ember.locator('.companion-btn').last().innerText();
await ember.locator('.companion-btn').last().click();
await page.waitForTimeout(500);
const crafted = (await ember.innerText()).replaceAll('\n', ' | ');
const afterCraftSave = await readSave();
console.log('craft button:', craftLabel);
console.log('after craft:', crafted);
console.log('craft save:', afterCraftSave.mounts, '· crystals:', afterCraftSave.crystals);

// Crafting a mount puts the player in the saddle straight away.
await ember.locator('.companion-btn').first().click();
await page.waitForTimeout(400);
const rested = (await ember.innerText()).replaceAll('\n', ' | ');
const afterRestSave = await readSave();
console.log('after rest:', rested, '· active:', afterRestSave.mounts?.active);

await ember.locator('.companion-btn').first().click();
await page.waitForTimeout(400);
const ridden = (await ember.innerText()).replaceAll('\n', ' | ');
const afterRideSave = await readSave();
console.log('after ride:', ridden, '· active:', afterRideSave.mounts?.active);

await openSection(page, 'GEAR');
const atkAfter = await atkValue();
console.log('atk:', atkBefore, '→', atkAfter);

await openSection(page, 'MOUNTS');
await ember.locator('.companion-btn').last().click();
await page.waitForTimeout(500);
const trained = (await ember.innerText()).replaceAll('\n', ' | ');
const afterTrainSave = await readSave();
console.log('after train:', trained, '· crystals:', afterTrainSave.crystals);

await openSection(page, 'DUNGEON');
const dungeonHead = (await page.locator('.dungeon-panel .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
const tiers = await page.locator('.dungeon-card').count();
const lockedTier = await page.locator('.dungeon-card.locked').count();
const odds = await page.locator('.dungeon-odds').allInnerTexts();
console.log('dungeon head:', dungeonHead, '· tiers:', tiers, '· locked:', lockedTier);
console.log('odds:', odds.join(' / '));

const ticketsBefore = (await readSave()).dungeon?.tickets ?? 0;
const crystalsBeforeRun = (await readSave()).crystals ?? 0;
await page.locator('.dungeon-card .rival-fight').first().click();
await page.waitForSelector('.dungeon-result', { timeout: 30000 });
const result = (await page.locator('.dungeon-result').innerText()).replaceAll('\n', ' | ');
console.log('dungeon result:', result);
await page.getByRole('button', { name: 'BACK TO THE RUN' }).click();
await page.waitForTimeout(500);

const afterRunSave = await readSave();
const hudPill = await page.locator('.auto-pill').innerText();
console.log(
  'after run: tickets',
  ticketsBefore,
  '→',
  afterRunSave.dungeon?.tickets,
  '· crystals',
  crystalsBeforeRun,
  '→',
  afterRunSave.crystals,
  '· pill:',
  hudPill,
);

await openSection(page, 'SHOP');
const shopHead = (await page.locator('.shop-panel .section-head').innerText()).replaceAll('\n', ' | ');
const shopCards = await page.locator('.shop-card').count();
const goldBeforeShop = (await readSave()).gold ?? 0;
const crystalsBeforeShop = (await readSave()).crystals ?? 0;

await page.locator('.shop-card').first().locator('.rival-fight').click();
await page.waitForTimeout(500);
const afterTicket = await readSave();
await page.locator('.shop-card').nth(1).locator('.rival-fight').click();
await page.waitForTimeout(500);
const afterCrystal = await readSave();
console.log('shop head:', shopHead, '· cards:', shopCards);
console.log(
  'shop: tickets',
  afterTicket.dungeon?.tickets,
  '· gold',
  goldBeforeShop,
  '→',
  afterCrystal.gold,
  '· crystals',
  crystalsBeforeShop,
  '→',
  afterCrystal.crystals,
);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1300);
await openSection(page, 'MOUNTS');
const reloaded = (await page.locator('.mount-card', { hasText: 'Ember Steed' }).innerText()).replaceAll(
  '\n',
  ' | ',
);
const reloadedSave = await readSave();
console.log('after reload:', reloaded);
console.log('save version:', reloadedSave.version, '· mounts:', reloadedSave.mounts);

const overflow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow'] : [];
});
await page.screenshot({ path: 'artifacts/mounts.png' });

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

const checks = {
  'four mounts in the stable': cards === 4,
  'all mounts start locked': locked === 4,
  'crystal balance shown': head.includes('30 CRYSTALS'),
  'craft costs crystals': craftLabel.includes('CRAFT') && craftLabel.includes('◈12'),
  'crafted mount is owned': crafted.includes('LV 1/10') && afterCraftSave.crystals === 18,
  'crafting starts in the saddle': crafted.includes('RIDDEN'),
  'rest clears the saddle':
    !rested.includes('RIDDEN') && rested.includes('RIDE') && afterRestSave.mounts?.active === null,
  'riding sets the active mount': ridden.includes('RIDDEN') && afterRideSave.mounts?.active === 'ember-steed',
  'mount raises ATK': atkAfter > atkBefore,
  'training raises level and spends crystals':
    trained.includes('LV 2/10') && afterTrainSave.crystals === 17,
  'dungeon lists three tiers': tiers === 3,
  'third tier is stage-gated': lockedTier === 1 && odds.length === 3 && odds[2] === '5% MOUNT',
  'run spends a ticket': afterRunSave.dungeon?.tickets === ticketsBefore - 1,
  'run pays crystals': afterRunSave.crystals > crystalsBeforeRun,
  'hud leaves dungeon mode': !/DUNGEON/.test(hudPill),
  'shop has two items': shopCards === 2,
  'ticket purchase adds a ticket': afterTicket.dungeon?.tickets === ticketsBefore,
  'crystal purchase adds a crystal': afterCrystal.crystals === crystalsBeforeShop + 1,
  'shop spends gold': afterCrystal.gold < goldBeforeShop,
  'mount persists after reload': reloaded.includes('RIDDEN') && reloaded.includes('LV 2/10'),
  'save migrates to v23': reloadedSave.version === 23,
  'no overflow': overflow.length === 0,
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};
console.log(checks);
if (Object.values(checks).some((value) => !value)) process.exit(1);
