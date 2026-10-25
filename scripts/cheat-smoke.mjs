import { chromium } from 'playwright';
import { openSection } from './nav.mjs';

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
      version: 22,
      level: 1,
      exp: 0,
      gold: 0,
      crystals: 0,
      maxStage: 1,
      farmStage: 1,
      stage: 1,
      kills: 0,
      inventory: [],
      equipped: {},
      itemSeq: 1,
      lastSeen: Date.now(),
    }),
  );
});

const readSave = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('idle-forge-save-v1') ?? '{}'));
const row = (name) => page.locator('.cheat-row', { hasText: name });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1300);

const toggle = page.locator('.cheat-toggle');
const visible = await toggle.isVisible();
await toggle.click();
await page.waitForTimeout(300);

const panel = page.locator('.cheat-panel');
const headings = (await panel.innerText()).replaceAll('\n', ' | ');
const mountRows = await page.locator('.cheat-group').first().locator('.cheat-row').count();
const wingRows = await page.locator('.cheat-group').last().locator('.cheat-row').count();
console.log('toggle visible:', visible, '· rows:', mountRows, '/', wingRows);

// Grant a wing at level 1, then push it to 2 with the free level button.
await row('Emberpinions').locator('.cheat-btn').click();
await page.waitForTimeout(400);
const wingSave = await readSave();
const wingRow = (await row('Emberpinions').innerText()).replaceAll('\n', ' | ');
await row('Emberpinions').locator('.cheat-btn').click();
await page.waitForTimeout(400);
const leveledRow = (await row('Emberpinions').innerText()).replaceAll('\n', ' | ');
const leveledSave = await readSave();
console.log('wing grant:', wingRow, '· save:', wingSave.wings);
console.log('wing level:', leveledRow, '· save:', leveledSave.wings);

// Grant a mount too, so the stable and the wing slot coexist.
await row('Storm Gryphon').locator('.cheat-btn').click();
await page.waitForTimeout(400);
const mountSave = await readSave();
console.log('mount save:', mountSave.mounts);

await page.getByRole('button', { name: '+1M GOLD' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: '+100 ◈' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: '+5 TICKETS' }).click();
await page.waitForTimeout(300);
const richSave = await readSave();
console.log('resources:', richSave.gold, '·', richSave.crystals, '· tickets:', richSave.dungeon?.tickets);

await page.getByRole('button', { name: 'UNLOCK 70' }).click();
await page.waitForTimeout(500);
const unlockedSave = await readSave();
const hudStage = (await page.locator('.stage-value').innerText()).split('\n')[0].trim();
console.log('unlock save:', unlockedSave.farmStage, unlockedSave.maxStage, unlockedSave.stage, '· HUD:', hudStage);

await page.keyboard.press('Escape');
await page.waitForTimeout(250);
const closed = await page.locator('.cheat-panel').count();

await page.locator('.cheat-toggle').click();
await page.waitForTimeout(250);
const openOverflow = await page.evaluate(() => {
  const root = document.querySelector('.cheat');
  const panel = document.querySelector('.cheat-panel');
  if (!root || !panel) return ['no panel'];
  const rect = panel.getBoundingClientRect();
  const issues = [];
  if (rect.left < 0 || rect.right > window.innerWidth + 1) issues.push('panel off screen');
  if (rect.top < 0) issues.push('panel overflows top');
  return issues;
});

await page.screenshot({ path: 'artifacts/cheats.png' });
// The panel floats over the page, so close it before navigating underneath.
await page.keyboard.press('Escape');
await page.waitForTimeout(250);

// The dungeon must be open at stage 70, and the empty tier gate gone.
await openSection(page, 'DUNGEON');
const tiers = await page.locator('.dungeon-card').count();
const locked = await page.locator('.dungeon-card.locked').count();
const lock = await page.locator('.rift-locked').count();
await openSection(page, 'GEAR');
const anyWing = await page.locator('.outfit-chip').count();
console.log('dungeon tiers:', tiers, '· locked:', locked, '· lock note:', lock, '· hud chips:', anyWing);

await openSection(page, 'MOUNTS');
const stable = (await page.locator('.mount-panel').innerText()).replaceAll('\n', ' | ');
console.log('stable:', stable.slice(0, 140));
await openSection(page, 'WINGS');
const vault = (await page.locator('.wing-panel').innerText()).replaceAll('\n', ' | ');
console.log('vault:', vault.slice(0, 140));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1300);
const reloadedSave = await readSave();
const reloadedStage = (await page.locator('.stage-value').innerText()).split('\n')[0].trim();
await page.locator('.cheat-toggle').click();
await page.waitForTimeout(300);
const afterReloadRow = (await row('Emberpinions').innerText()).replaceAll('\n', ' | ');
console.log('after reload:', reloadedStage, '· wings:', reloadedSave.wings, '·', afterReloadRow);

await page.setViewportSize({ width: 360, height: 640 });
await page.waitForTimeout(300);
const narrow = await page.evaluate(() => {
  const panel = document.querySelector('.cheat-panel');
  const dock = document.querySelector('.dock');
  if (!panel || !dock) return ['missing'];
  const rect = panel.getBoundingClientRect();
  const dockRect = dock.getBoundingClientRect();
  const issues = [];
  if (rect.left < 0 || rect.right > window.innerWidth + 1) issues.push('panel off 360');
  if (rect.bottom > dockRect.top + 1) issues.push('panel over dock');
  if (document.documentElement.scrollWidth > window.innerWidth + 1) issues.push('page overflow');
  return issues;
});
console.log('overflow:', openOverflow.length ? openOverflow : 'none', '· 360:', narrow.length ? narrow : 'none');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();

const checks = {
  'dev toggle visible': visible,
  'panel lists everything': headings.includes('CHEATS · TEST ONLY') && headings.includes('+1M GOLD'),
  'stable rows': mountRows === 4 && wingRows === 3,
  'wing grant works': wingSave.wings?.owned?.emberpinions?.level === 1,
  'wing is worn': wingSave.wings?.active === 'emberpinions',
  'free level up works': leveledSave.wings?.owned?.emberpinions?.level === 2,
  'mount grant works': mountSave.mounts?.owned?.['storm-gryphon']?.level === 1,
  'gold cheat lands': richSave.gold >= 1_000_000,
  'crystal cheat lands': richSave.crystals >= 100,
  'tickets refill to the cap': richSave.dungeon?.tickets === 10,
  'stage jump lands': unlockedSave.farmStage === 70 && hudStage === '70',
  'escape closes the panel': closed === 0,
  'panel stays on screen': openOverflow.length === 0,
  'dungeon fully open': tiers === 3 && locked === 0 && lock === 0,
  'stable shows the mount': stable.includes('STORM GRYPHON'),
  'vault shows the wing': vault.includes('EMBERPINIONS'),
  'survives reload': reloadedStage === '70' && afterReloadRow.includes('LV 2 +1'),
  'fits 360px': narrow.length === 0,
  'no console errors': errors.length === 0,
};
console.log(checks);
if (Object.values(checks).some((value) => !value)) process.exit(1);
