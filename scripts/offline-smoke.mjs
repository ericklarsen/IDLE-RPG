import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function openWithGap(gapMs, viewport = { width: 390, height: 844 }, nodes = {}) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  await page.addInitScript(({ lastSeen, nodes }) => {
    localStorage.clear();
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 6,
        level: 6,
        exp: 0,
        gold: 100,
        essence: 0,
        cores: 0,
        books: 0,
        boosts: {},
        skills: { active: ['heavy-strike', null, null], passive: null, levels: {} },
        ascension: { count: 0, shards: 0, nodes },
        maxStage: 5,
        kills: 40,
        inventory: [],
        equipped: {},
        itemSeq: 3,
        lastSeen,
      }),
    );
  }, { lastSeen: Date.now() - gapMs, nodes });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return page;
}

const page = await openWithGap(2 * 60 * 60 * 1000);
console.log('report visible:', await page.locator('.report-card').isVisible());
console.log('duration:', await page.locator('.report-duration').innerText());
console.log('grid:', (await page.locator('.report-grid').innerText()).replaceAll('\n', ' | '));
console.log('note:', await page.locator('.report-note').innerText());
console.log('hints:', (await page.locator('.report-hints').innerText()).replaceAll('\n', ' | '));
console.log('cap badge:', await page.locator('.report-cap').count());

const hpBefore = await page.locator('.combat-line').first().innerText();
await page.waitForTimeout(1200);
const hpAfter = await page.locator('.combat-line').first().innerText();
console.log('battle paused:', hpBefore === hpAfter);
console.log('pre-claim gold:', (await page.locator('.gold-chip').innerText()).replaceAll('\n', ' '));

await page.getByRole('button', { name: 'CLAIM REWARDS' }).click();
await page.waitForTimeout(700);
console.log('report after claim:', await page.locator('.report-card').count());
console.log('post-claim gold:', (await page.locator('.gold-chip').innerText()).replaceAll('\n', ' '));
await openSection(page, 'GEAR');
console.log('log:', await page.locator('.log-line').innerText());
console.log(
  'lastSeen updated:',
  await page.evaluate(() => {
    const raw = localStorage.getItem('idle-forge-save-v1');
    return raw ? Date.now() - JSON.parse(raw).lastSeen < 60_000 : 'no save';
  }),
);
await page.close();

// The report is a history layer: back must claim it instead of losing the rewards.
const backPage = await openWithGap(2 * 60 * 60 * 1000);
console.log('back report visible:', await backPage.locator('.report-card').count());
const goldBeforeBack = (await backPage.locator('.gold-chip').innerText()).replaceAll('\n', ' ');
await backPage.goBack();
await backPage.waitForTimeout(700);
console.log('report after back:', await backPage.locator('.report-card').count());
console.log(
  'gold after back:',
  goldBeforeBack,
  '->',
  (await backPage.locator('.gold-chip').innerText()).replaceAll('\n', ' '),
);
console.log(
  'claimed on back:',
  await backPage.evaluate(() => {
    const raw = localStorage.getItem('idle-forge-save-v1');
    return raw ? Date.now() - JSON.parse(raw).lastSeen < 60_000 : 'no save';
  }),
);
await backPage.close();

const capped = await openWithGap(20 * 60 * 60 * 1000, { width: 360, height: 740 });
console.log('capped duration:', await capped.locator('.report-duration').innerText());
console.log('capped badge:', await capped.locator('.report-cap').innerText());
const cappedOverflow = await capped.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.report-card *')) {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    if (parent && rect.right > parent.right + 0.5) out.push(el.className || el.tagName);
  }
  return out;
});
console.log('report overflow:', cappedOverflow.length ? cappedOverflow : 'none');
await capped.getByRole('button', { name: 'CLAIM REWARDS' }).click();
await capped.waitForTimeout(500);
console.log('capped report after claim:', await capped.locator('.report-card').count());
console.log('capped gold:', (await capped.locator('.gold-chip').innerText()).replaceAll('\n', ' '));
await capped.close();

const longHaul = await openWithGap(20 * 60 * 60 * 1000, { width: 360, height: 740 }, {
  'long-haul': 3,
});
console.log('long-haul cap:', await longHaul.locator('.report-cap').innerText());
console.log('long-haul duration:', await longHaul.locator('.report-duration').innerText());
console.log('long-haul note:', await longHaul.locator('.report-note').innerText());
await longHaul.getByRole('button', { name: 'CLAIM REWARDS' }).click();
await longHaul.waitForTimeout(400);
await longHaul.close();

const shortGap = await openWithGap(30_000);
console.log('short gap report:', await shortGap.locator('.report-card').count());
await shortGap.close();

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
