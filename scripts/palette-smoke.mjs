import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

// A save one version behind, already past four milestones: Ashen (Ascension 1),
// Champion (arena points), Emberfall (claimed cache), Stormtouched (stage 60).
// The trial floor is left uncleared so exactly one palette stays locked.
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

await page.addInitScript(() => {
  if (localStorage.getItem('idle-forge-save-v1')) return;
  localStorage.setItem('idle-forge-onboarded-v1', '1');
  localStorage.setItem(
    'idle-forge-save-v1',
    JSON.stringify({
      version: 18,
      level: 45,
      exp: 0,
      gold: 1000,
      maxStage: 60,
      farmStage: 60,
      stage: 60,
      kills: 0,
      inventory: [],
      equipped: {},
      itemSeq: 3,
      lastSeen: Date.now(),
      ascension: { count: 1, shards: 0, nodes: {} },
      arena: { day: '2026-10-24', tickets: 3, points: 320, wins: 14, losses: 2, rivals: [], fought: [] },
      event: { key: '2026-10-23', bosses: 5, claimed: true },
    }),
  );
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);

await openSection(page, 'GEAR');
const atkValue = async () =>
  Number((await page.locator('.stats > div').first().innerText()).replace(/[^0-9.]/g, ''));
const atkBefore = await atkValue();

await page.getByRole('tab', { name: /COSTUME/ }).click();
await page.waitForTimeout(300);

const head = (await page.locator('.palette-block .section-head').innerText()).replaceAll('\n', ' | ');
const chips = await page.locator('.palette-chip').count();
const locked = await page.locator('.palette-chip.locked').count();
const lockedText = (await page.locator('.palette-chip.locked').innerText()).replaceAll('\n', ' | ');
const defaultWorn = await page.locator('.palette-chip.on').count();
console.log('palette head:', head, '· chips:', chips, '· locked:', locked);
console.log('locked chip:', lockedText);

const champion = page.locator('.palette-chip', { hasText: 'Champion' });
await champion.click();
await page.waitForTimeout(400);

const afterWear = (await page.locator('.palette-block .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
const wornChip = (await page.locator('.palette-chip.on').innerText()).replaceAll('\n', ' | ');
// The stat block lives on the gear tab, so step back to read it.
await page.getByRole('tab', { name: 'GEAR' }).click();
await page.waitForTimeout(250);
const atkAfter = await atkValue();
const stored = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
console.log('after wear:', afterWear, '·', wornChip);
console.log('palette save:', stored.palette, '· version:', stored.version);
console.log('atk:', atkBefore, '→', atkAfter);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await openSection(page, 'GEAR');
await page.getByRole('tab', { name: /COSTUME/ }).click();
await page.waitForTimeout(300);
const reloadedHead = (await page.locator('.palette-block .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
const reloadedChip = (await page.locator('.palette-chip.on').innerText()).replaceAll('\n', ' | ');
console.log('after reload:', reloadedHead, '·', reloadedChip);

// Default tones are always available, so a player can go back to the outfit alone.
await page.locator('.palette-chip', { hasText: 'Default' }).click();
await page.waitForTimeout(300);
const cleared = (await page.locator('.palette-block .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
const clearedSave = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
console.log('after clear:', cleared, '· save:', clearedSave.palette);

const overflow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow'] : [];
});

await page.screenshot({ path: 'artifacts/palette.png' });

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
  'four of five palettes earned': head.includes('PALETTE · 4/5'),
  'default plus five chips': chips === 6,
  'only the trial palette is locked': locked === 1,
  'locked chip names its milestone': lockedText.includes('Clear trial floor 10'),
  'default accent starts worn': defaultWorn === 1,
  'wearing updates the head': afterWear.includes('CHAMPION'),
  'wearing marks the chip': wornChip.includes('WORN'),
  'palette is cosmetic only': atkBefore === atkAfter,
  'saved with v23': stored.version === 23 && stored.palette?.worn === 'champion',
  'milestones persisted': (stored.palette?.unlocked ?? []).length === 4,
  'persists after reload': reloadedHead.includes('CHAMPION') && reloadedChip.includes('WORN'),
  'default clears the accent': cleared.includes('DEFAULT TONES') && clearedSave.palette?.worn === null,
  'no overflow': overflow.length === 0,
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};
console.log(checks);
if (Object.values(checks).some((value) => !value)) process.exit(1);
