import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });

const BASE = 'http://localhost:5173/';
const browser = await chromium.launch();
const errors = [];

function makeSave(overrides = {}) {
  return {
    version: 7,
    level: 9,
    exp: 0,
    gold: 1234,
    essence: 0,
    cores: 0,
    books: 0,
    boosts: {},
    skills: { active: ['heavy-strike', null, null], passive: null, levels: {} },
    ascension: { count: 0, shards: 0, nodes: {} },
    maxStage: 3,
    kills: 20,
    inventory: [],
    equipped: {},
    itemSeq: 0,
    ...overrides,
  };
}

async function open(seed) {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  await page.addInitScript(({ data }) => {
    // Seed once per context so a reset can actually leave the game empty.
    if (!localStorage.getItem('idle-forge-seeded')) {
      localStorage.setItem('idle-forge-save-v1', JSON.stringify(data));
      localStorage.setItem('idle-forge-seeded', '1');
    }
  }, { data: seed });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return { context, page };
}

async function openSavePanel(page) {
  await openSection(page, 'SAVE');
  await page.locator('.save-panel').scrollIntoViewIfNeeded();
}

const first = await open(makeSave());
await openSavePanel(first.page);
console.log('save panel:', await first.page.locator('.save-panel').isVisible());
console.log('code before export:', await first.page.locator('.save-code').count());

await first.page.getByRole('button', { name: 'EXPORT' }).click();
const code = await first.page.locator('.save-code').inputValue();
console.log('code prefix:', code.slice(0, 4), 'length:', code.length);

const overflow = await first.page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('.save-panel *')) {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    if (parent && rect.right > parent.right + 0.5) bad.push(el.className || el.tagName);
  }
  return bad.slice(0, 6);
});
console.log('save panel overflow:', overflow.length ? overflow : 'none');
await first.page.screenshot({ path: 'artifacts/save-panel.png' });
await first.context.close();

// Fresh context and a different save: importing must restore the exported one.
const second = await open(makeSave({ level: 1, gold: 99, maxStage: 1, kills: 0 }));
console.log('decoy gold:', (await second.page.locator('.gold-chip').innerText()).replaceAll('\n', ' '));

await openSavePanel(second.page);
await second.page.getByRole('button', { name: 'IMPORT' }).click();
await second.page.locator('.save-import textarea').fill(code);
await second.page.getByRole('button', { name: 'APPLY IMPORT' }).click();

await second.page.waitForFunction(
  () => document.querySelector('.gold-chip')?.textContent?.includes('1.2k'),
  null,
  { timeout: 15000 },
);
console.log(
  'imported gold:',
  (await second.page.locator('.gold-chip').innerText()).replaceAll('\n', ' '),
);
console.log('imported level:', await second.page.locator('.level-tag').innerText());

await openSavePanel(second.page);
await second.page.getByRole('button', { name: 'RESET' }).click();
console.log(
  'reset armed:',
  await second.page.getByRole('button', { name: 'CONFIRM ERASE' }).isVisible(),
);
console.log('reset message:', await second.page.locator('.save-message').innerText());

await second.page.getByRole('button', { name: 'CONFIRM ERASE' }).click();
await second.page.waitForSelector('.onboard-card', { timeout: 15000 });
console.log('reset onboarding:', await second.page.locator('.onboard-card').isVisible());
console.log(
  'save cleared:',
  await second.page.evaluate(() => localStorage.getItem('idle-forge-save-v1') === null),
);

console.log('errors:', errors.length ? errors : 'none');
await second.context.close();
await browser.close();

if (errors.length > 0) process.exit(1);
