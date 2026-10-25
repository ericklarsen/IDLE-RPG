import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';
await mkdir('artifacts', { recursive: true });

const FRIDAY = new Date('2026-10-23T12:00:00');
const MONDAY = new Date('2026-10-26T12:00:00');

const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Rift Cleaver',
  level: 20,
  atk: 4000,
  hp: 0,
  def: 0,
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
const errors = [];

async function openAt(date, event) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  await page.clock.setFixedTime(date);
  await page.addInitScript(
    ({ now, eventState, weapon: seeded }) => {
      if (localStorage.getItem('idle-forge-save-v1')) return;
      localStorage.clear();
      localStorage.setItem('idle-forge-onboarded-v1', '1');
      localStorage.setItem(
        'idle-forge-save-v1',
        JSON.stringify({
          version: 12,
          level: 30,
          exp: 0,
          gold: 5000,
          maxStage: 12,
          farmStage: 12,
          stage: 12,
          kills: 0,
          inventory: [],
          equipped: { weapon: seeded },
          itemSeq: 1,
          event: eventState,
          lastSeen: now,
        }),
      );
    },
    { now: date.getTime(), eventState: event, weapon },
  );

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  return page;
}

const page = await openAt(FRIDAY, { key: '2026-10-23', bosses: 5, claimed: false });

await openSection(page, 'EVENT');

console.log('panel:', (await page.locator('.event-panel').innerText()).replaceAll('\n', ' | '));
console.log('section:', await page.locator('.event-panel .section-head').first().innerText());
await page.screenshot({ path: 'artifacts/event-ready.png' });

const tabOverflow = await page.evaluate(() => {
  const dock = document.querySelector('.dock');
  if (!dock) return ['no dock'];
  return dock.scrollWidth > dock.clientWidth + 1 ? ['dock overflow'] : [];
});
console.log('tabs overflow:', tabOverflow.length ? tabOverflow : 'none');

await page.getByRole('button', { name: 'CLAIM CACHE · 5/5' }).click();
await page.waitForTimeout(500);

const afterClaim = await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  const save = raw ? JSON.parse(raw) : null;
  return {
    claimed: save?.event?.claimed,
    bosses: save?.event?.bosses,
    setPieces: (save?.inventory ?? []).filter((item) => item.set === 'emberforged'),
  };
});
console.log(
  'claimed:',
  afterClaim.claimed,
  'bosses:',
  afterClaim.bosses,
  'piece:',
  afterClaim.setPieces[0]?.name,
  afterClaim.setPieces[0]?.rarity,
);
await openSection(page, 'GEAR');
console.log('log:', await page.locator('.log-line').innerText());
await openSection(page, 'EVENT');
console.log('panel after claim:', (await page.locator('.event-panel').innerText()).replaceAll('\n', ' | '));
await page.screenshot({ path: 'artifacts/event-claimed.png' });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await openSection(page, 'EVENT');
console.log('after reload:', (await page.locator('.event-panel').innerText()).replaceAll('\n', ' | '));

await page.setViewportSize({ width: 360, height: 740 });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('.event-panel *')) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1)) {
      bad.push(el.className || el.tagName);
    }
  }
  return bad.slice(0, 8);
});
console.log('event overflow at 360:', overflow.length ? overflow : 'none');
await page.setViewportSize({ width: 390, height: 844 });

const monday = await openAt(MONDAY, { key: '2026-10-30', bosses: 0, claimed: false });
await openSection(monday, 'EVENT');
console.log('closed panel:', (await monday.locator('.event-panel').innerText()).replaceAll('\n', ' | '));
console.log(
  'claim disabled while closed:',
  await monday.getByRole('button', { name: 'EVENT NOT RUNNING' }).isDisabled(),
);

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
