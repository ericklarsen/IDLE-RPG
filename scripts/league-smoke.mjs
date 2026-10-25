import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

// A save from a past season: Silver with 340 points. Opening the arena should
// settle the week into Gold and leave one crate ready.
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
      version: 15,
      level: 40,
      exp: 0,
      gold: 1000,
      essence: 0,
      cores: 0,
      maxStage: 40,
      farmStage: 40,
      stage: 40,
      kills: 0,
      inventory: [],
      equipped: {},
      itemSeq: 5,
      lastSeen: Date.now(),
      league: {
        key: '2000-01-03',
        points: 340,
        division: 1,
        rewardDivision: null,
        rewardClaimed: true,
      },
    }),
  );
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await openSection(page, 'ARENA');

const leagueCard = (await page.locator('.league-card').innerText()).replaceAll('\n', ' | ');
const crate = (await page.locator('.league-reward').innerText()).replaceAll('\n', ' | ');
const claimEnabled = await page.locator('.league-claim').isEnabled();
console.log('league:', leagueCard);
console.log('crate:', crate);
console.log('claim enabled:', claimEnabled);

const storedBefore = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
console.log('save league:', storedBefore.league);

await page.locator('.league-claim').click();
await page.waitForTimeout(600);

const stored = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
const claimedCard = (await page.locator('.league-reward').innerText()).replaceAll('\n', ' | ');
const claimGone = await page.locator('.league-claim').count();

// The log only lives on the GEAR page; the claim itself happened in ARENA.
await openSection(page, 'GEAR');
const lastLog = await page.locator('.log-line').last().innerText().catch(() => '');
console.log('crate after claim:', claimedCard);
console.log('claim buttons left:', claimGone);
console.log('log:', lastLog.replaceAll('\n', ' | '));
console.log('gold:', storedBefore.gold, '→', stored.gold);
console.log('essence:', storedBefore.essence, '→', stored.essence);
console.log('cores:', storedBefore.cores, '→', stored.cores);
console.log('items:', stored.inventory?.length, '· seq:', stored.itemSeq);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await openSection(page, 'ARENA');

const reloaded = (await page.locator('.league-reward').innerText()).replaceAll('\n', ' | ');
const claimAfterReload = await page.locator('.league-claim').count();
const leagueAfterReload = (await page.locator('.league-card').innerText()).replaceAll('\n', ' | ');
console.log('after reload:', leagueAfterReload, '·', reloaded, '· claim buttons:', claimAfterReload);

const overflow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow'] : [];
});

await page.screenshot({ path: 'artifacts/league.png' });

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

const rewardGold = stored.gold - storedBefore.gold;
const crateEggs = Object.values(stored.pets?.kinds ?? {}).reduce(
  (sum, pet) => sum + (pet?.eggs ?? 0),
  0,
);
const snapshot = {
  'settled into gold': /GOLD/.test(leagueCard),
  'season points reset': leagueCard.includes('0 PTS'),
  'week countdown': /ENDS IN/.test(leagueCard),
  'crate is gold tier': /SEASON CRATE · GOLD/.test(crate) && /READY/.test(crate),
  'crate pays gold': rewardGold > 0,
  'crate pays materials':
    stored.essence > storedBefore.essence && stored.cores > storedBefore.cores,
  'gold set piece': stored.inventory.length === 1 && stored.inventory[0].rarity === 'epic',
  'crate lists a wisp egg': /1 wisp egg/.test(crate),
  'crate pays the egg': crateEggs === 1,
  'save v23': stored.version === 23,
  'reward marked claimed': stored.league?.rewardClaimed === true,
  'claim button removed': claimGone === 0 && claimAfterReload === 0,
  'claim logged': /League crate/i.test(lastLog),
  'stays claimed after reload': /CLAIMED/.test(reloaded),
  'no overflow': overflow.length === 0,
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};
console.log(snapshot);
if (Object.values(snapshot).some((value) => !value)) process.exit(1);
