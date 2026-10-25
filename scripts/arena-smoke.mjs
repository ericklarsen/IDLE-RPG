import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Arena Cleaver',
  level: 20,
  atk: 150,
  hp: 400,
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
        version: 13,
        level: 40,
        exp: 0,
        gold: 5000,
        maxStage: 40,
        farmStage: 40,
        stage: 40,
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

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await openSection(page, 'ARENA');

const tabs = await page.locator('.dock-btn').allInnerTexts();
const tabOverflow = await page
  .locator('.dock')
  .evaluate((node) => node.scrollWidth - node.clientWidth);
const clippedTabs = await page
  .locator('.dock-btn')
  .evaluateAll((nodes) =>
    nodes.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent),
  );
console.log('tabs:', tabs.join(' | '));
console.log('tab overflow:', tabOverflow, 'clipped tabs:', clippedTabs);

const rank = (await page.locator('.rank-card').innerText()).replaceAll('\n', ' | ');
const rivals = await page.locator('.rival-card').count();
console.log('rank:', rank);
console.log('rivals:', rivals);
console.log('tickets:', await page.locator('.arena-panel .section-head').first().innerText());

const firstFight = page.locator('.rival-fight').first();
console.log('fight enabled:', await firstFight.isEnabled());
await firstFight.click();

// The sheet closes and the duel runs in the arena; the result modal ends it.
await page.waitForSelector('.duel-row', { timeout: 5000 });
const live = {
  badge: await page.locator('.badge').first().innerText(),
  chip: await page.locator('.auto-pill').innerText(),
  rivalName: await page.locator('.combat-name').first().innerText(),
};
console.log('live badge:', live.badge, '· chip:', live.chip, '· foe:', live.rivalName);

await page.waitForSelector('.arena-result', { timeout: 15000 });
const result = (await page.locator('.arena-result').innerText()).replaceAll('\n', ' | ');
console.log('result:', result);

const pointsAfter = await page.locator('.arena-result .report-grid b').first().innerText();
console.log('ladder delta:', pointsAfter);

await page.getByRole('button', { name: 'BACK TO THE RUN' }).click();
await page.waitForTimeout(400);

await openSection(page, 'ARENA');

const after = (await page.locator('.rank-card').innerText()).replaceAll('\n', ' | ');
const league = (await page.locator('.league-card').innerText()).replaceAll('\n', ' | ');
const fought = await page.locator('.rival-card.fought').count();
const tickets = await page.locator('.arena-panel .section-head').first().innerText();
const sheetOverflow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow'] : [];
});
console.log('after:', after);
console.log('league:', league);
console.log('fought cards:', fought, '· tickets:', tickets);
console.log('sheet overflow:', sheetOverflow.length ? sheetOverflow : 'none');

await page.screenshot({ path: 'artifacts/arena.png' });

await page.setViewportSize({ width: 360, height: 640 });
await page.waitForTimeout(250);
const narrow = await page.evaluate(() => {
  const screen = document.querySelector('.screen');
  if (!screen) return ['no screen'];
  return screen.scrollWidth > screen.clientWidth + 1 ? ['screen overflow at 360'] : [];
});
console.log('narrow layout:', narrow.length ? narrow : 'none');

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

const checks = {
  'duel hud': live.badge === 'RIVAL' && live.chip === 'DUEL',
  // Headings render in caps via CSS, so compare without case.
  'duel result': /victory/i.test(result),
  'ladder rose': pointsAfter.includes('+24'),
  'ticket spent': tickets.includes('2/3'),
  'rival marked fought': fought === 1,
  'season points follow the win': league.includes('24 PTS'),
  'no clipped tabs': tabOverflow === 0 && clippedTabs.length === 0,
  'no sheet overflow': sheetOverflow.length === 0,
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};
console.log(checks);
if (Object.values(checks).some((value) => !value)) process.exit(1);
