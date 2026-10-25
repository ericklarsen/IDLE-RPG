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
console.log('hud party bars while solo:', await page.locator('.party-bars').count());
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
console.log('hud party bars:', await page.locator('.party-bar').count());
console.log('hud party rows:', (await page.locator('.party-bars').innerText()).replaceAll('\n', ' | '));
console.log('hud leader name:', await page.locator('.party-bar.active .party-bar-name').innerText());
console.log('hud leader hp:', await page.locator('.party-bar.active .party-bar-hp').innerText());
// The single hero bar has to be gone once the party is real.
console.log('hud solo bar with party:', await page.locator('.combat-line.hero').count());
console.log('hud dead veil:', await page.locator('.dead-veil').count());
console.log(
  'hud strip overflow:',
  await page.locator('.party-bars').evaluate((strip) => {
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

// The bars come back from the save, not just from the click that made them.
await openSection(page, 'BATTLE');
await page.waitForTimeout(600);
console.log('after reload leader:', await page.locator('.party-bar.active .party-bar-name').innerText());
console.log('after reload bars:', await page.locator('.party-bar').count());
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
console.log('hud party bars after remove:', await page.locator('.party-bars').count());
console.log('hud solo bar after remove:', await page.locator('.combat-line.hero').count());

// A full party of five: the arena draws four mates behind the leader, and the
// strip has to hold all five bars at once.
await openSection(page, 'PARTY');
for (const name of ['Ranger', 'Cleric', 'Mage', 'Rogue']) {
  // Match the name plate, not any card whose description happens to mention it.
  const card = page
    .locator('.party-card')
    .filter({ has: page.locator('.party-name', { hasText: name }) });
  await card.getByRole('button', { name: 'ADD' }).click();
  await page.waitForTimeout(250);
}
await openSection(page, 'BATTLE');
await page.waitForTimeout(2000);
console.log('full party bars:', await page.locator('.party-bar').count());
console.log('full party leader:', await page.locator('.party-bar.active .party-bar-name').innerText());
console.log(
  'full party numbers:',
  (await page.locator('.party-bar-hp').allInnerTexts()).join(' | '),
);
// A five-member party faces a packed wave, so the HUD has to say how many are left.
const packChip = page.locator('.pack-chip');
console.log('pack chip:', (await packChip.count()) ? await packChip.innerText() : 'none');

// Five full rows have to survive the smallest supported width, with the bar
// still readable instead of squeezed to nothing by the name and numbers.
await page.setViewportSize({ width: 360, height: 640 });
await page.waitForTimeout(500);
console.log(
  'narrow bars overflow:',
  await page.locator('.party-bars').evaluate((bars) => {
    const rect = bars.getBoundingClientRect();
    return Math.round(Math.max(0, bars.scrollWidth - bars.clientWidth, -rect.left, rect.right - window.innerWidth));
  }),
);
console.log(
  'narrow bar widths:',
  await page.locator('.party-bar .track.hp.party').evaluateAll((tracks) =>
    tracks.map((track) => Math.round(track.getBoundingClientRect().width)).join(' | '),
  ),
);
// Five rows make the HUD panel taller, so it must still start below the arena
// ground line (370 of the 844 design height, scaled to the viewport).
console.log(
  'narrow panel top vs ground:',
  await page.locator('.panel').evaluate((panel) => {
    const top = Math.round(panel.getBoundingClientRect().top);
    const ground = Math.round((370 / 844) * window.innerHeight);
    return `${top} vs ${ground} -> ${top > ground ? 'clear' : 'COVERS ARENA'}`;
  }),
);
console.log('canvas:', await page.locator('canvas').count());
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
if (errors.length > 0) process.exit(1);
