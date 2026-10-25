import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';
await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch();
const errors = [];
let failures = 0;

function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

async function open(save) {
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
  await page.addInitScript(({ save }) => {
    localStorage.setItem('idle-forge-onboarded-v1', '1');
    if (save) localStorage.setItem('idle-forge-save-v1', JSON.stringify(save));
  }, { save });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  return page;
}

// Healthy hero: the danger vignette stays hidden while the battle runs.
const healthy = await open({
  version: 2,
  level: 80,
  exp: 0,
  enhanceLevel: 15,
  gold: 5000,
  maxStage: 3,
  stage: 3,
  kills: 20,
  inventory: [],
  equipped: {},
  itemSeq: 1,
  bestStage: 3,
});
check('canvas mounted', (await healthy.locator('canvas').count()) === 1);
check('danger veil exists', (await healthy.locator('.danger-veil').count()) === 1);
check('danger veil hidden at full HP', (await healthy.locator('.danger-veil.on').count()) === 0);
console.log('panel:', (await healthy.locator('.panel').innerText()).split('\n').slice(0, 2).join(' | '));
await healthy.screenshot({ path: 'artifacts/juice-healthy.png' });
await healthy.close();

// Outmatched hero: HP drops under 30% and the vignette turns on.
const low = await open({
  version: 2,
  level: 1,
  exp: 0,
  enhanceLevel: 0,
  gold: 0,
  maxStage: 6,
  stage: 6,
  kills: 0,
  inventory: [],
  equipped: {},
  itemSeq: 1,
  bestStage: 6,
});

let dangerSeen = false;
let lowHp = '';
for (let i = 0; i < 60 && !dangerSeen; i += 1) {
  await low.waitForTimeout(500);
  if (await low.locator('.danger-veil.on').count()) {
    dangerSeen = true;
    lowHp = (await low.locator('.panel .combat-line.hero').innerText()).replaceAll('\n', ' ');
    await low.screenshot({ path: 'artifacts/juice-danger.png' });
  }
}
check('danger veil appears at low HP', dangerSeen, lowHp);
await low.close();

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();

if (failures > 0) process.exit(1);
