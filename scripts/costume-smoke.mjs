import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

// A high-level knight so the ATK swing from swapping outfits is easy to read.
const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Wardrobe Blade',
  level: 40,
  atk: 5000,
  hp: 900,
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
        version: 18,
        level: 40,
        exp: 0,
        gold: 1000,
        essence: 1000,
        dust: 1000,
        maxStage: 40,
        farmStage: 40,
        stage: 40,
        kills: 0,
        inventory: [],
        equipped: { weapon },
        itemSeq: 1,
        lastSeen: Date.now(),
        costume: {
          owned: ['ash-ronin', 'void-regent'],
          equipped: 'ash-ronin',
          pity: 9,
          mastered: false,
        },
      }),
    );
  },
  { weapon },
);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const outfitChip = () => page.locator('.outfit-chip').innerText();

await openSection(page, 'GEAR');
const atkText = async () =>
  Number((await page.locator('.stats > div').first().innerText()).replace(/[^0-9.]/g, ''));
const atkBefore = await atkText();
const chipBefore = await outfitChip();

await page.getByRole('tab', { name: /COSTUME/ }).click();
await page.waitForTimeout(300);

const head = (await page.locator('.costume-panel > .section-head').innerText()).replaceAll('\n', ' | ');
const cards = await page.locator('.costume-card').count();
const worn = (await page.locator('.costume-card.worn').innerText()).replaceAll('\n', ' | ');
const locked = await page.locator('.costume-locked').count();
const total = (await page.locator('.costume-total').innerText()).replaceAll('\n', ' | ');
const pity = await page.locator('.costume-pity').innerText();
const forgeButtons = await page.locator('.costume-btn.forge').count();
console.log('head:', head);
console.log('cards:', cards, '· locked:', locked, '· forge buttons:', forgeButtons);
console.log('worn:', worn);
console.log('total:', total);
console.log('pity:', pity, '· hud chip:', chipBefore);

// Tiers render in order: bronze, silver, gold, platinum, diamond, emerald.
await page.locator('.costume-card').nth(4).locator('.costume-btn').click();
await page.waitForTimeout(400);

const afterSwap = (await page.locator('.costume-panel > .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
const wornAfter = (await page.locator('.costume-card.worn').innerText()).replaceAll('\n', ' | ');
const chipAfter = await outfitChip();

await page.getByRole('tab', { name: /^GEAR$/ }).click();
await page.waitForTimeout(300);
const atkAfter = await atkText();
await page.getByRole('tab', { name: /COSTUME/ }).click();
await page.waitForTimeout(300);

const stored = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
console.log('after swap:', afterSwap);
console.log('worn card:', wornAfter, '· hud chip:', chipAfter);
console.log('atk:', atkBefore, '→', atkAfter);
console.log('save costume:', stored.costume, '· version:', stored.version);

// Gold is still missing, so it can be forged with the dust in the save.
await page.locator('.costume-card').nth(2).locator('.costume-btn.forge').click();
await page.waitForTimeout(400);
const afterForge = (await page.locator('.costume-panel > .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
const storedAfterForge = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
console.log('after forge:', afterForge, '· dust:', storedAfterForge.dust);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await openSection(page, 'GEAR');
await page.getByRole('tab', { name: /COSTUME/ }).click();
await page.waitForTimeout(300);
const reloaded = (await page.locator('.costume-card.worn').innerText()).replaceAll('\n', ' | ');
const reloadedHead = (await page.locator('.costume-panel > .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);

await page.locator('.costume-card.worn .costume-btn').click();
await page.waitForTimeout(400);
const removed = (await page.locator('.costume-panel > .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
const storedAfterRemove = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
const chipGone = await page.locator('.outfit-chip').count();
console.log('after reload:', reloadedHead, '·', reloaded);
console.log('after remove:', removed, '· save:', storedAfterRemove.costume, '· chips:', chipGone);

await openSection(page, 'CODEX');
const codexHead = (await page.locator('.codex .section-head', { hasText: 'WARDROBE' }).innerText())
  .replaceAll('\n', ' | ');
// The wardrobe block is the first codex row list on the page.
const wardrobeRows = await page.locator('.codex-rows').first().locator('.codex-row').allInnerTexts();
console.log('codex head:', codexHead, '· rows:', wardrobeRows.join(' / '));

const overflow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow'] : [];
});

await page.screenshot({ path: 'artifacts/costume.png' });

await page.setViewportSize({ width: 360, height: 640 });
await page.waitForTimeout(250);
const narrow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  const topbar = document.querySelector('.topbar');
  if (!screen || !topbar) return ['no screen'];
  const issues = [];
  if (screen.scrollWidth > screen.clientWidth + 1) issues.push('screen overflow at 360');
  if (topbar.scrollWidth > topbar.clientWidth + 1) issues.push('topbar overflow at 360');
  return issues;
});
console.log('overflow:', overflow.length ? overflow : 'none', '· 360:', narrow.length ? narrow : 'none');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();

const checks = {
  'six tiers': cards === 6,
  'worn outfit listed': head.includes('WARDROBE · 2/6') && head.includes('WORN: ASH RONIN'),
  'locked tiers show the stage': locked === 4,
  'forge offered for locked tiers': forgeButtons === 4,
  'pity counter shown': /GUARANTEED IN 3 MORE BOSSES/.test(pity),
  'hud shows the worn tier': chipBefore === 'BRONZE',
  'passive and skill shown': total.includes('PASSIVE') && total.includes('Ronin Cut'),
  'swap wears the new outfit': afterSwap.includes('WORN: VOID REGENT'),
  'new outfit pays its passive': wornAfter.includes('+21% ATK'),
  'hud follows the swap': chipAfter === 'DIAMOND',
  'saved to v23': stored.version === 23 && stored.costume?.equipped === 'void-regent',
  'higher tier raises ATK': atkAfter > atkBefore,
  'forge adds a tier': afterForge.includes('3/6') && storedAfterForge.dust === 350,
  'persists after reload': reloaded.includes('VOID REGENT') && reloadedHead.includes('3/6'),
  'remove clears the slot': removed.includes('NOTHING WORN') && storedAfterRemove.costume?.equipped === null,
  'hud chip leaves with the outfit': chipGone === 0,
  'codex tracks the wardrobe': codexHead.includes('3/6') && wardrobeRows.length === 6,
  'codex names known outfits': wardrobeRows.some((row) => row.includes('Void Regent')),
  'no overflow': overflow.length === 0,
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};
console.log(checks);
if (Object.values(checks).some((value) => !value)) process.exit(1);
