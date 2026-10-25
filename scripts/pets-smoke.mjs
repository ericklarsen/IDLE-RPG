import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await page.addInitScript(() => {
  if (localStorage.getItem('idle-forge-save-v1')) return;
  localStorage.setItem('idle-forge-onboarded-v1', '1');
  localStorage.setItem(
    'idle-forge-save-v1',
    JSON.stringify({
      version: 18,
      level: 45,
      exp: 0,
      gold: 5000,
      maxStage: 45,
      farmStage: 45,
      stage: 45,
      kills: 400,
      inventory: [],
      equipped: {},
      itemSeq: 4,
      pets: {
        active: 'ember',
        kinds: {
          ember: { level: 5, maxLevel: 10, eggs: 1 },
          frost: { level: 1, maxLevel: 10, eggs: 0 },
        },
      },
    }),
  );
});

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

const kennelHead = async () =>
  (await page.locator('.boost-panel .section-head', { hasText: 'WISPS' }).innerText()).replaceAll(
    '\n',
    ' | ',
  );
const card = (index) => page.locator('.boost-panel .companion-card').nth(index);
const cardText = async (index) => (await card(index).innerText()).replaceAll('\n', ' | ');
const goldChip = () => page.locator('.gold-chip').innerText();

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await openSection(page, 'BOOSTS');

const head = await kennelHead();
const cards = await page.locator('.boost-panel .companion-card').count();
const emberBefore = await cardText(0);
const frostBefore = await cardText(1);
const stormBefore = await cardText(2);
const goldBefore = await goldChip();
console.log('head:', head, '· cards:', cards);
console.log('ember:', emberBefore);
console.log('frost:', frostBefore);
console.log('storm:', stormBefore);
console.log('gold:', goldBefore);

await card(1).getByText('SET ACTIVE').click();
await page.waitForTimeout(400);
const headAfterSelect = await kennelHead();

await card(0).getByText(/TRAIN/).click();
await page.waitForTimeout(400);
const emberAfterTrain = await cardText(0);
const goldAfterTrain = await goldChip();

await card(0).getByText(/SYNTHESISE/).click();
await page.waitForTimeout(400);
const emberAfterSynth = await cardText(0);

const stored = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'),
);
console.log('after select:', headAfterSelect);
console.log('ember after train:', emberAfterTrain, '· gold:', goldAfterTrain);
console.log('ember after synth:', emberAfterSynth);
console.log('save pets:', stored.pets, '· version:', stored.version);

const overflow = await page
  .locator('.boost-panel')
  .evaluate((node) => node.scrollWidth - node.clientWidth);

await page.screenshot({ path: 'artifacts/pets.png' });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await openSection(page, 'BOOSTS');
const reloadedHead = await kennelHead();
const reloadedEmber = await cardText(0);
const reloadedFrost = await cardText(1);
console.log('after reload:', reloadedHead, '·', reloadedEmber);
console.log('frost still active:', reloadedFrost.includes('REST'));

await page.setViewportSize({ width: 360, height: 640 });
await page.waitForTimeout(250);
const narrow = await page.evaluate(() => {
  const panel = document.querySelector('.boost-panel');
  if (!panel) return ['no panel'];
  return panel.scrollWidth > panel.clientWidth + 1 ? ['panel overflow at 360'] : [];
});

// Storm's chained hit draws a lightning arc; run a live battle long enough for
// a couple of storm strikes so a broken effect would surface as a page error.
const stormPage = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const stormErrors = [];
stormPage.on('console', (message) => {
  if (message.type() === 'error') stormErrors.push(`console: ${message.text()}`);
});
stormPage.on('pageerror', (error) => stormErrors.push(`pageerror: ${error.message}`));
await stormPage.addInitScript(() => {
  localStorage.setItem('idle-forge-onboarded-v1', '1');
  localStorage.setItem(
    'idle-forge-save-v1',
    JSON.stringify({
      version: 18,
      level: 55,
      exp: 0,
      gold: 1000,
      maxStage: 60,
      farmStage: 60,
      stage: 60,
      kills: 400,
      inventory: [],
      equipped: {},
      itemSeq: 4,
      pets: { active: 'storm', kinds: { storm: { level: 5, maxLevel: 10, eggs: 0 } } },
    }),
  );
});
await stormPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await stormPage.waitForTimeout(6000);
// The autosave rewrites lastSeen every five seconds, so a later value proves the
// battle loop kept ticking while the storm wisp was on the field.
const stormSeen = await stormPage.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  return raw ? (JSON.parse(raw).lastSeen ?? 0) : 0;
});
console.log('storm battle ticked:', stormSeen > Date.now() - 60_000, '· errors:', stormErrors.length);

// A separate page keeps its own storage, so the autosave cannot overwrite this seed.
const lockedPage = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await lockedPage.addInitScript(() => {
  localStorage.setItem('idle-forge-onboarded-v1', '1');
  localStorage.setItem(
    'idle-forge-save-v1',
    JSON.stringify({
      version: 18,
      level: 10,
      exp: 0,
      gold: 100,
      maxStage: 15,
      farmStage: 15,
      stage: 15,
      kills: 100,
      inventory: [],
      equipped: {},
      itemSeq: 0,
    }),
  );
});
await lockedPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await lockedPage.waitForTimeout(1500);
await openSection(lockedPage, 'BOOSTS');
const lockedText = await lockedPage.locator('.boost-panel').innerText();
console.log('locked tail:', lockedText.split('\n').slice(-5).join(' | '));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

const checks = {
  'three wisps': cards === 3,
  'ember is active': head.includes('ACTIVE: EMBER'),
  'ember shows level and eggs': emberBefore.includes('LV 5/10') && emberBefore.includes('1 EGG'),
  'frost awakened at stage 40': frostBefore.includes('LV 1/10'),
  'storm locked at stage 60': stormBefore.includes('STAGE 60'),
  'selecting frost moves the crown': headAfterSelect.includes('ACTIVE: FROST'),
  'training raises level and spends gold':
    emberAfterTrain.includes('LV 6/10') && goldBefore !== goldAfterTrain,
  'synthesis raises the ceiling': emberAfterSynth.includes('LV 6/12'),
  'eggs are consumed': emberAfterSynth.includes('0 EGGS') && !emberAfterSynth.includes('SYNTHESISE'),
  'save keeps the kennel':
    stored.version === 23 &&
    stored.pets?.active === 'frost' &&
    stored.pets?.kinds?.ember?.maxLevel === 12,
  'persists after reload':
    reloadedHead.includes('ACTIVE: FROST') &&
    reloadedEmber.includes('LV 6/12') &&
    reloadedFrost.includes('REST'),
  'locked below stage 20': lockedText.includes('Clear stage 20 to awaken the Ember Wisp.'),
  'storm effects run clean': stormErrors.length === 0,
  'storm battle ticked': stormSeen > 0,
  'no overflow': overflow <= 0,
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};

console.log('checks:', checks);
if (Object.values(checks).some((passed) => !passed)) process.exit(1);
