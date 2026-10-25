import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

function item(overrides) {
  return {
    id: 'it_1',
    slot: 'weapon',
    rarity: 'epic',
    name: 'Test Blade',
    level: 18,
    atk: 6000,
    hp: 200,
    def: 20,
    power: 19000,
    salvage: 40,
    ...overrides,
  };
}

const weapon = item({ id: 'it_1', slot: 'weapon', name: 'Test Blade' });
const helm = item({ id: 'it_2', slot: 'helm', name: 'Test Helm', atk: 200, hp: 90000 });
const armor = item({ id: 'it_3', slot: 'armor', name: 'Test Plate', atk: 100, hp: 120000 });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await page.addInitScript(
  ({ equipped }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 11,
        level: 30,
        exp: 0,
        gold: 50000,
        maxStage: 13,
        farmStage: 12,
        stage: 12,
        kills: 600,
        inventory: [],
        equipped,
        itemSeq: 4,
      }),
    );
  },
  { equipped: { weapon, helm, armor } },
);

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const planVisible = await page.locator('.plan-btn').isVisible();
const goldBefore = await page.locator('.gold-chip').innerText();
const started = Date.now();
await page.locator('.plan-btn').click();
await page.waitForTimeout(600);
const computeMs = Date.now() - started;

const card = page.locator('.forecast-card');
const visible = await card.isVisible();
const text = (await card.innerText()).replaceAll('\n', ' | ');
const rows = await page.locator('.forecast-row').count();
const wins = await page.locator('.forecast-row.win').count();
const overflow = await card.evaluate((node) => node.scrollWidth - node.clientWidth);
const cardHeight = await card.evaluate((node) => node.getBoundingClientRect().height);
const goldAfter = await page.locator('.gold-chip').innerText();

console.log('plan visible:', planVisible, 'compute ms:', computeMs);
console.log('forecast text:', text.slice(0, 420));
console.log('rows:', rows, 'wins:', wins, 'overflow:', overflow, 'card height:', cardHeight);
console.log('gold before/after:', goldBefore.replaceAll('\n', ' '), '/', goldAfter.replaceAll('\n', ' '));
await page.screenshot({ path: 'artifacts/forecast.png' });

await page.getByRole('button', { name: 'CLOSE', exact: true }).click();
await page.waitForTimeout(300);
const closed = (await page.locator('.forecast-card').count()) === 0;

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

const checks = {
  'plan button on hud': planVisible,
  'modal opens': visible,
  // The boss heading renders in caps via CSS, so match without case.
  'names stage and boss': text.includes('FORGE FORECAST · STAGE 13') && /frost colossus/i.test(text),
  'shows baseline': text.includes('Current build') && /boss (dies|survives)/.test(text),
  'lists upgrades': rows >= 1,
  'marks a winning line': wins >= 1,
  'shows cost and odds': text.includes('◆') && text.includes('%'),
  'no horizontal overflow': overflow <= 0,
  'fits the screen': cardHeight <= 844,
  'no gold spent': goldBefore === goldAfter,
  'closes': closed,
  'no console errors': errors.length === 0,
};

console.log('checks:', checks);
if (Object.values(checks).some((passed) => !passed)) process.exit(1);
