import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

/** Local Monday of the current week, matching src/sim/week.ts. */
function weekKey(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  const month = `${copy.getMonth() + 1}`.padStart(2, '0');
  const datePart = `${copy.getDate()}`.padStart(2, '0');
  return `${copy.getFullYear()}-${month}-${datePart}`;
}

const week = weekKey();

// A strong-but-not-instant weapon keeps the fight a few seconds long, so the
// HUD row can be observed before the result modal appears.
const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Tower Cleaver',
  level: 40,
  atk: 1_500_000,
  hp: 400_000,
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
  ({ weapon, week }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem('idle-forge-onboarded-v1', '1');
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 18,
        level: 40,
        exp: 0,
        gold: 1000,
        essence: 0,
        maxStage: 40,
        farmStage: 40,
        stage: 40,
        kills: 0,
        inventory: [],
        equipped: { weapon },
        itemSeq: 1,
        lastSeen: Date.now(),
        trial: { key: week, cleared: 0, attempts: 3 },
      }),
    );
  },
  { weapon, week },
);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await openSection(page, 'RIFT');
await page.getByRole('tab', { name: 'TRIAL', exact: true }).click();
await page.waitForTimeout(300);

const head = (await page.locator('.trial-panel .section-head').innerText()).replaceAll('\n', ' | ');
const rungs = await page.locator('.trial-rung').count();
const current = await page.locator('.trial-rung.current').innerText();
const boss = (await page.locator('.trial-boss').innerText()).replaceAll('\n', ' | ');
const rules = await page.locator('.trial-panel .rift-mod').count();
console.log('head:', head);
console.log('rungs:', rungs, '· current:', current);
console.log('boss:', boss);
console.log('rules:', rules);

await page.locator('.trial-enter').click();
await page.waitForSelector('.trial-row', { timeout: 5000 });

const live = {
  row: (await page.locator('.trial-row').innerText()).replaceAll('\n', ' | '),
  pill: await page.locator('.auto-pill').innerText(),
  name: await page.locator('.combat-name').first().innerText(),
};
console.log('live row:', live.row, '· pill:', live.pill, '· foe:', live.name);

await page.waitForSelector('.trial-result', { timeout: 15000 });
const result = (await page.locator('.trial-result').innerText()).replaceAll('\n', ' | ');
console.log('result:', result);
await page.getByRole('button', { name: 'BACK TO THE RUN' }).click();
await page.waitForTimeout(400);

const storedAfterWin = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
console.log('save trial:', storedAfterWin.trial, '· version:', storedAfterWin.version);

await openSection(page, 'RIFT');
await page.getByRole('tab', { name: 'TRIAL', exact: true }).click();
await page.waitForTimeout(300);

const afterHead = (await page.locator('.trial-panel .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
const cleared = await page.locator('.trial-rung.cleared').count();
const nextBoss = await page.locator('.trial-boss-name').innerText();
console.log('after:', afterHead, '· cleared rungs:', cleared, '· next:', nextBoss);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await openSection(page, 'RIFT');
await page.getByRole('tab', { name: 'TRIAL', exact: true }).click();
await page.waitForTimeout(300);

const reloadedBoss = await page.locator('.trial-boss-name').innerText();
const reloadedHead = (await page.locator('.trial-panel .section-head').innerText()).replaceAll(
  '\n',
  ' | ',
);
console.log('after reload:', reloadedHead, '·', reloadedBoss);

const overflow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow'] : [];
});

await page.screenshot({ path: 'artifacts/trial.png' });

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
  'ten floors': rungs === 10,
  'starts on floor 1': current === '1' && head.includes('0/10'),
  'three retries': head.includes('3/3 RETRIES'),
  'two weekly rules': rules === 2,
  'boss card preview': /FLOOR 1/.test(boss) && /HP/.test(boss),
  'hud trial row': live.row.includes('TRIAL · FLOOR 1/10') && live.pill === 'TRIAL',
  'floor cleared': /Floor cleared/i.test(result),
  'rewards paid': /DUST/i.test(result) && /ESSENCE/i.test(result),
  'cleared one floor': storedAfterWin.trial?.cleared === 1,
  'no retry spent': storedAfterWin.trial?.attempts === 3,
  'save v23': storedAfterWin.version === 23,
  'panel advanced': afterHead.includes('1/10') && cleared === 1 && /FLOOR 2/.test(nextBoss),
  'persisted after reload': reloadedHead.includes('1/10') && /FLOOR 2/.test(reloadedBoss),
  'no overflow': overflow.length === 0,
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};
console.log(checks);
if (Object.values(checks).some((value) => !value)) process.exit(1);
