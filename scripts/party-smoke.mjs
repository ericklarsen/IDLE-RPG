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
  localStorage.setItem('idle-forge-onboarded-v1', '1');
  if (localStorage.getItem('idle-forge-save-v1')) return;
  // A run past stage 50 owns the whole roster.
  localStorage.setItem(
    'idle-forge-save-v1',
    // maxStage 50 unlocks the whole roster; stage 1 keeps the hero alive so the
    // run reports steady HP instead of a constant death timer.
    JSON.stringify({
      version: 24,
      level: 30,
      exp: 0,
      gold: 500,
      maxStage: 50,
      stage: 1,
      farmStage: 1,
      kills: 0,
      inventory: [],
    }),
  );
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await openSection(page, 'PARTY');
console.log('roster cards:', await page.locator('.party-card').count());
console.log('unlocked:', await page.locator('.party-card:not(.locked)').count());
console.log('slots before:', (await page.locator('.party-slots').innerText()).replaceAll('\n', ' | '));

// A solo run must keep the old single-hero HUD.
await openSection(page, 'BATTLE');
await page.waitForTimeout(400);
console.log('hud strip while solo:', await page.locator('.party-strip').count());
console.log('hud hero name while solo:', await page.locator('.combat-line.hero .combat-name').innerText());
await openSection(page, 'PARTY');

await page.locator('.party-card', { hasText: 'Ranger' }).getByRole('button', { name: 'ADD' }).click();
await page.waitForTimeout(400);
console.log('slot 2:', (await page.locator('.party-slot').nth(1).innerText()).replaceAll('\n', ' | '));

await page.locator('.party-slot').nth(1).getByRole('button', { name: 'LEAD' }).click();
await page.waitForTimeout(400);
console.log('leader slot class:', await page.locator('.party-slot.leader').getAttribute('class'));

await openSection(page, 'BATTLE');
await page.waitForTimeout(800);
console.log('hud strip pips:', await page.locator('.party-pip').count());
console.log('hud strip:', (await page.locator('.party-strip').innerText()).replaceAll('\n', ' | '));
console.log('hud hero name:', await page.locator('.combat-line.hero .combat-name').innerText());
console.log('hud hero hp:', await page.locator('.combat-line.hero .combat-numbers').innerText());
console.log('hud dead veil:', await page.locator('.dead-veil').count());
console.log(
  'hud strip overflow:',
  await page.locator('.party-strip').evaluate((strip) => {
    const rect = strip.getBoundingClientRect();
    return Math.round(Math.max(0, -rect.left, rect.right - window.innerWidth));
  }),
);
await openSection(page, 'PARTY');
console.log('save party:', await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  const data = raw ? JSON.parse(raw) : null;
  return data ? JSON.stringify(data.party) : 'no party';
}));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await openSection(page, 'PARTY');
console.log('after reload slot 2:', (await page.locator('.party-slot').nth(1).innerText()).replaceAll('\n', ' | '));

// The strip comes back from the save, not just from the click that made it.
await openSection(page, 'BATTLE');
await page.waitForTimeout(600);
console.log('after reload hero name:', await page.locator('.combat-line.hero .combat-name').innerText());
console.log('after reload pips:', await page.locator('.party-pip').count());
// GEAR follows the fighting character: one chip per member, and picking a
// chip swaps whose gear (and whose fight) the page shows.
await openSection(page, 'GEAR');
await page.waitForTimeout(300);
console.log('gear chips:', await page.locator('.char-tab').count());
console.log('gear active chip:', await page.locator('.char-tab.on .char-tab-name').innerText());
console.log('gear eyebrow:', await page.locator('.screen-head .eyebrow').innerText());

await page.locator('.char-tab', { hasText: 'Warden' }).click();
await page.waitForTimeout(300);
console.log('after warden chip:', await page.locator('.char-tab.on .char-tab-name').innerText(), '|', await page.locator('.screen-head .eyebrow').innerText());
// Swapping the leader must not refill the bar it just left.
console.log('warden hp as leader:', await page.locator('.attune-hp').innerText());

await page.locator('.char-tab', { hasText: 'Ranger' }).click();
await page.waitForTimeout(300);
console.log('back to ranger:', await page.locator('.char-tab.on .char-tab-name').innerText());
console.log('ranger hp back as leader:', await page.locator('.attune-hp').innerText());

await openSection(page, 'PARTY');

await page.locator('.party-slot').nth(1).getByRole('button', { name: 'REMOVE' }).click();
await page.waitForTimeout(400);
console.log('after remove slot 2:', (await page.locator('.party-slot').nth(1).innerText()).replaceAll('\n', ' | '));

await openSection(page, 'BATTLE');
await page.waitForTimeout(400);
console.log('hud strip after remove:', await page.locator('.party-strip').count());

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length > 0) process.exit(1);
