import { chromium } from 'playwright';

const mk = (id, slot, rarity, name, power) => ({
  id,
  slot,
  rarity,
  name,
  level: 16,
  atk: 400,
  hp: 200,
  def: 20,
  power,
  salvage: 5,
  enhance: 2,
  pity: 0,
  refines: 0,
  enchants: 0,
  substats: [],
  runes: [null, null, null],
});

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.addInitScript(() => {
  localStorage.setItem('idle-forge-onboarded-v1', '1');
  const make = (id, slot, rarity, name, power) => ({
    id,
    slot,
    rarity,
    name,
    level: 16,
    atk: 400,
    hp: 200,
    def: 20,
    power,
    salvage: 5,
    enhance: 2,
    pity: 0,
    refines: 0,
    enchants: 0,
    substats: [],
    runes: [null, null, null],
  });
  localStorage.setItem(
    'idle-forge-save-v1',
    JSON.stringify({
      version: 14,
      level: 34,
      exp: 240,
      gold: 128400,
      essence: 90,
      dust: 120,
      cores: 4,
      books: 12,
      shards: 3,
      maxStage: 21,
      farmStage: 21,
      stage: 21,
      kills: 940,
      inventory: [
        make('it_1', 'weapon', 'epic', 'Void Reaver', 900),
        make('it_2', 'helm', 'rare', 'Sentinel Helm', 600),
        make('it_3', 'armor', 'common', 'Chainmail', 500),
        make('it_4', 'boots', 'legendary', 'Ash Striders', 850),
        make('it_5', 'ring', 'epic', 'Ember Loop', 700),
        make('it_6', 'amulet', 'common', 'Bone Charm', 350),
      ],
      equipped: {
        weapon: make('it_w', 'weapon', 'legendary', 'Ember Cleaver', 1200),
        helm: make('it_h', 'helm', 'epic', 'Crown of Ash', 800),
        armor: make('it_a', 'armor', 'rare', 'Knight Plate', 700),
      },
      itemSeq: 20,
      lastSeen: Date.now(),
    }),
  );
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'artifacts/nav-battle.png' });

for (const id of ['gear', 'forge', 'arena', 'menu']) {
  await page.locator(`.dock-${id}`).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `artifacts/nav-${id}.png` });
}

await page.locator('.menu-rift').click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'artifacts/nav-menu-rift.png' });

await page.locator('.screen-back').click();
await page.waitForTimeout(300);
await page.locator('.menu-options').click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/nav-menu-options.png' });

const metrics = await page.evaluate(() => {
  const dock = document.querySelector('.dock')?.getBoundingClientRect();
  const screen = document.querySelector('.screen')?.getBoundingClientRect();
  return {
    dockTop: dock?.top,
    dockHeight: dock?.height,
    screenBottom: screen?.bottom,
    docScrollWidth: document.documentElement.scrollWidth,
    fontLoaded: document.fonts.check('16px Anton'),
  };
});
console.log(metrics);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
