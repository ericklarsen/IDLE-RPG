import { chromium } from 'playwright';
import { DOCK } from './nav.mjs';

/**
 * The system back gesture must walk back through the dock pages instead of
 * leaving the game. This drives real history pops through Playwright.
 */
const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 800 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
const failures = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

function check(label, ok) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures.push(label);
}

const onScreen = (id) => page.locator(`${DOCK[id.toUpperCase()]}[aria-current="page"]`).count();

async function back() {
  await page.goBack();
  await page.waitForTimeout(300);
}

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

if (await page.locator('.onboard-card').count()) {
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await page.getByRole('button', { name: 'START FIGHTING' }).click();
  await page.waitForTimeout(300);
}

check('starts on the battle HUD', (await onScreen('battle')) === 1);

await page.locator(DOCK.GEAR).click();
await page.waitForTimeout(350);
check('gear opens from the dock', (await onScreen('gear')) === 1);

await back();
check('back from gear returns to battle', (await onScreen('battle')) === 1);
check('battle HUD is visible again', await page.locator('.dock').isVisible());

await page.locator(DOCK.FORGE).click();
await page.waitForTimeout(350);
check('forge opens from the dock', (await onScreen('forge')) === 1);

await page.locator(DOCK.GEAR).click();
await page.waitForTimeout(350);
await back();
check('back after switching tabs lands on battle', (await onScreen('battle')) === 1);

await page.locator(DOCK.MENU).click();
await page.waitForTimeout(350);
check('menu index opens', (await page.locator('.menu-grid').count()) === 1);

await page.locator('.menu-rift').click();
await page.waitForTimeout(350);
check('rift page opens', (await page.locator('.screen').count()) === 1);

await back();
check('back from rift returns to the menu index', (await page.locator('.menu-grid').count()) === 1);
check('menu tab is still active', (await onScreen('menu')) === 1);

await back();
check('second back returns to battle', (await onScreen('battle')) === 1);

await page.locator(DOCK.MENU).click();
await page.waitForTimeout(350);
await page.locator('.menu-options').click();
await page.waitForTimeout(350);
await back();
check('back from options returns to the menu index', (await page.locator('.menu-grid').count()) === 1);

await back();
check('back from options root returns to battle', (await onScreen('battle')) === 1);

// Item detail and modals are history layers too.
await page.locator(DOCK.GEAR).click();
await page.waitForTimeout(350);
await page.locator('.gear-slot').first().click();
await page.waitForTimeout(300);
check('item detail opens', (await page.locator('.item-detail').count()) === 1);
await back();
check('back closes the item detail', (await page.locator('.item-detail').count()) === 0);
check('gear list stays open behind it', (await onScreen('gear')) === 1);
await back();
check('second back leaves gear', (await onScreen('battle')) === 1);
check(
  'item detail did not reopen',
  (await page.locator('.item-detail').count()) === 0 && (await page.locator('.gear-grid').count()) === 0,
);

await page.locator('.plan-btn').click();
await page.waitForTimeout(400);
check('forecast modal opens', (await page.locator('.forecast-card').count()) === 1);
await back();
check('back closes the forecast', (await page.locator('.forecast-card').count()) === 0);
check('battle HUD is still current', (await onScreen('battle')) === 1);

const historyLength = await page.evaluate(() => history.length);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check('reload starts on the battle HUD', (await onScreen('battle')) === 1);
console.log('history length at root:', historyLength);

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (failures.length > 0) {
  console.log('failures:', failures);
  process.exit(1);
}
if (errors.length > 0) process.exit(1);
