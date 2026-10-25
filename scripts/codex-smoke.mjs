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
  localStorage.setItem(
    'idle-forge-save-v1',
    JSON.stringify({
      version: 10,
      level: 4,
      exp: 0,
      gold: 300,
      maxStage: 1,
      farmStage: 1,
      stage: 1,
      kills: 12,
      inventory: [],
      equipped: {},
      itemSeq: 3,
      codex: {
        enemies: ['Moss Slime', 'Elite Moss Slime'],
        items: ['Ember Cleaver'],
        modifiers: [],
        mounts: ['ember-steed'],
        wings: ['rimepinions'],
      },
    }),
  );
});

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await openSection(page, 'CODEX');

const tabs = await page.locator('.dock-btn').allInnerTexts();
console.log('tabs:', tabs);
const tabOverflow = await page
  .locator('.dock')
  .evaluate((node) => node.scrollWidth - node.clientWidth);
const clippedTabs = await page
  .locator('.dock-btn')
  .evaluateAll((nodes) =>
    nodes
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => node.textContent),
  );
console.log('tab overflow:', tabOverflow, 'clipped tabs:', clippedTabs);

const panel = page.locator('.codex');
const text = (await panel.innerText()).replaceAll('\n', ' | ');
console.log('codex:', text);
const bestiaryCount = Number(/BESTIARY \| (\d+)\/35/.exec(text)?.[1] ?? 0);
console.log('bestiary learned:', bestiaryCount);

const sections = await page.locator('.section-head').allInnerTexts();
console.log('sections:', sections.map((line) => line.replaceAll('\n', ' ')));

const unknownRows = await page.locator('.codex-row.unknown').count();
const knownRows = await page.locator('.codex-row:not(.unknown)').count();
const unknownChips = await page.locator('.codex-chip:not(.known)').count();
const knownChips = await page.locator('.codex-chip.known').count();
const setCards = await page.locator('.codex-set').allInnerTexts();
console.log('rows known/unknown:', knownRows, unknownRows);
console.log('chips known/unknown:', knownChips, unknownChips);
console.log('set cards:', setCards.map((line) => line.replaceAll('\n', ' ')));

const panelOverflow = await page
  .locator('.codex')
  .evaluate((node) => node.scrollWidth - node.clientWidth);
console.log('panel overflow:', panelOverflow);
await page.screenshot({ path: 'artifacts/codex.png' });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await openSection(page, 'CODEX');
const afterReload = (await page.locator('.codex').innerText()).replaceAll('\n', ' | ');
console.log('after reload:', afterReload.slice(0, 160));

// A brand-new save should still log the enemy that is on screen.
await page.evaluate(() => localStorage.removeItem('idle-forge-save-v1'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
if (await page.locator('.onboard-skip').isVisible().catch(() => false)) {
  await page.locator('.onboard-skip').click();
  await page.waitForTimeout(300);
}
await openSection(page, 'CODEX');
const fresh = (await page.locator('.codex').innerText()).replaceAll('\n', ' | ');
console.log('fresh save:', fresh.slice(0, 120));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

const checks = {
  'five dock tabs': tabs.length === 5 && tabs.includes('ARENA') && tabs.includes('MENU'),
  'tabs fit': tabOverflow <= 0 && clippedTabs.length === 0,
  'panel fits': panelOverflow <= 0,
  'bestiary grows': bestiaryCount >= 2,
  'arsenal count': /ARSENAL \| [1-9]\d*\/36/.test(text),
  'rift count': text.includes('RIFT MODIFIERS | 0/8'),
  'enemies masked': unknownRows > 0,
  'items masked': unknownChips > 0,
  'known gear shown': knownChips >= 1 && text.includes('Ember Cleaver'),
  'sets tracked': setCards.some(
    (card) => card.includes('ASHFORGED') && /[1-6]\/6 PIECES/.test(card),
  ),
  'empty rift masked': text.includes('???'),
  'stable tracked': text.includes('STABLE | 1/4') && text.includes('Ember Steed'),
  'wing vault tracked': text.includes('WING VAULT | 1/3') && text.includes('Rimepinions'),
  'unknown mounts masked': text.includes('???') && /STABLE \| 1\/4/.test(text),
  'persisted':
    afterReload.includes('Ember Cleaver') &&
    afterReload.includes('Elite Moss Slime') &&
    Number(/BESTIARY \| (\d+)\/35/.exec(afterReload)?.[1] ?? 0) >= bestiaryCount,
  'fresh save logs spawn': /BESTIARY \| [1-9]\d*\/35/.test(fresh) && fresh.includes('Moss Slime'),
  'no console errors': errors.length === 0,
};

console.log('checks:', checks);
if (Object.values(checks).some((passed) => !passed)) process.exit(1);
