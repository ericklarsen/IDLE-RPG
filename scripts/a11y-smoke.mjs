import { chromium } from 'playwright';
import { DOCK } from './nav.mjs';

/**
 * Keyboard behaviour for the overlays: focus moves into the dialog, Tab stays
 * inside, Escape closes it, focus returns, and the page behind is inert.
 */
const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
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

function active() {
  return page.evaluate(() => {
    const element = document.activeElement;
    return {
      tag: element?.tagName ?? null,
      className: typeof element?.className === 'string' ? element.className : '',
      inDialog: Boolean(element?.closest('[role="dialog"]')),
    };
  });
}

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.onboard-card');
await page.waitForTimeout(300);

check('the tour takes focus on open', (await active()).inDialog);

for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab');
check('tab stays inside the tour', (await active()).inDialog);

await page.keyboard.press('Shift+Tab');
check('shift+tab stays inside the tour', (await active()).inDialog);

await page.keyboard.press('Escape');
check('escape cannot skip the tour', (await page.locator('.onboard-card').count()) === 1);

await page.getByRole('button', { name: 'SKIP TOUR' }).click();
await page.waitForTimeout(350);
check('hud is interactive after the tour', await page.locator('.hud').evaluate((el) => !el.inert));

await page.locator('.plan-btn').click();
await page.waitForTimeout(400);
check('forecast takes focus', (await active()).inDialog);
check('hud is inert behind the modal', await page.locator('.hud').evaluate((el) => el.inert));

let contained = true;
for (let i = 0; i < 8; i += 1) {
  await page.keyboard.press('Tab');
  if (!(await active()).inDialog) contained = false;
}
check('tab cycles inside the forecast', contained);

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('escape closes the forecast', (await page.locator('.forecast-card').count()) === 0);
check('hud becomes interactive again', await page.locator('.hud').evaluate((el) => !el.inert));
check('focus returns to the PLAN button', (await active()).className.includes('plan-btn'));

await page.locator(DOCK.GEAR).click();
await page.waitForTimeout(400);
await page.locator('.gear-slot').first().click();
await page.waitForTimeout(350);
check('item detail opens', (await page.locator('.item-detail').count()) === 1);
check(
  'the page stays usable for the item detail',
  await page.locator('.screen-layer').evaluate((el) => !el.inert),
);

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('escape closes the item detail', (await page.locator('.item-detail').count()) === 0);
check('the gear list is still open', (await page.locator('.gear-grid').count()) === 1);
check('the gear tab is still active', (await page.locator(`${DOCK.GEAR}[aria-current="page"]`).count()) === 1);

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (failures.length > 0) {
  console.log('failures:', failures);
  process.exit(1);
}
if (errors.length > 0) process.exit(1);
