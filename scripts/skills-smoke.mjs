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
      version: 5,
      level: 8,
      exp: 0,
      gold: 100000,
      essence: 100,
      cores: 4,
      books: 12,
      boosts: {},
      skills: {
        active: ['heavy-strike', 'holy-mend', null],
        passive: null,
        levels: {},
      },
      maxStage: 2,
      kills: 30,
      inventory: [],
      equipped: {},
      itemSeq: 1,
    }),
  );
});

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await openSection(page, 'GEAR');
const statsBefore = (await page.locator('.stats').innerText()).replaceAll('\n', ' | ');
await openSection(page, 'SKILLS');

console.log('slots:', (await page.locator('.skill-slots').innerText()).replaceAll('\n', ' | '));
console.log('library rows:', await page.locator('.skill-row').count());
console.log('books:', (await page.locator('.skills-panel .section-head').first().innerText()).replaceAll('\n', ' | '));

await page.locator('.skill-slot').first().click();
await page.waitForTimeout(300);
console.log('picker options:', await page.locator('.skill-pick').count());
console.log('picker first:', (await page.locator('.skill-pick').first().innerText()).replaceAll('\n', ' | '));
await page.locator('.skill-pick', { hasText: 'Ember Burst' }).click();
await page.waitForTimeout(300);
console.log('slot 1 after pick:', (await page.locator('.skill-slot').first().innerText()).replaceAll('\n', ' | '));

await page.locator('.skill-slot.passive').click();
await page.waitForTimeout(300);
await page.locator('.skill-pick', { hasText: 'Keen Edge' }).click();
await page.waitForTimeout(400);
console.log('passive slot:', (await page.locator('.skill-slot.passive').innerText()).replaceAll('\n', ' | '));
console.log('stats before:', statsBefore);
await openSection(page, 'GEAR');
console.log('stats after passive:', (await page.locator('.stats').innerText()).replaceAll('\n', ' | '));
await openSection(page, 'SKILLS');

await page.locator('.skill-slot').nth(5).click();
await page.waitForTimeout(300);
await page.locator('.skill-pick', { hasText: 'Umbral Rend' }).click();
await page.waitForTimeout(300);
console.log('slot 6 after pick:', (await page.locator('.skill-slot').nth(5).innerText()).replaceAll('\n', ' | '));

const emberRow = page.locator('.skill-row', { hasText: 'Ember Burst' });
await emberRow.locator('.skill-up').click();
await page.waitForTimeout(400);
console.log('ember after upgrade:', (await emberRow.innerText()).replaceAll('\n', ' | '));
console.log('books after upgrade:', (await page.locator('.skills-panel .section-head').first().innerText()).replaceAll('\n', ' | '));

const overflow = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.skills-panel *')) {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement?.getBoundingClientRect();
    if (parent && rect.right > parent.right + 0.5) out.push(el.className || el.tagName);
  }
  return out;
});
console.log('skills overflow:', overflow.length ? overflow : 'none');

const saved = await page.evaluate(() => {
  const raw = localStorage.getItem('idle-forge-save-v1');
  const data = raw ? JSON.parse(raw) : null;
  return data
    ? {
        version: data.version,
        books: data.books,
        skills: data.skills,
      }
    : 'no save';
});
console.log('saved:', JSON.stringify(saved));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await openSection(page, 'GEAR');
console.log('stats after reload:', (await page.locator('.stats').innerText()).replaceAll('\n', ' | '));
await openSection(page, 'SKILLS');
console.log('slot 1 after reload:', (await page.locator('.skill-slot').first().innerText()).replaceAll('\n', ' | '));
console.log('passive after reload:', (await page.locator('.skill-slot.passive').innerText()).replaceAll('\n', ' | '));
console.log('slot 6 after reload:', (await page.locator('.skill-slot').nth(5).innerText()).replaceAll('\n', ' | '));
console.log(
  'ember after reload:',
  (await page.locator('.skill-row', { hasText: 'Ember Burst' }).innerText()).replaceAll('\n', ' | '),
);

await page.locator('.skill-slot').first().click();
await page.waitForTimeout(300);
await page.locator('.skill-pick', { hasText: 'Aegis' }).click();
await page.waitForTimeout(300);
await openSection(page, 'BATTLE');
await page.waitForTimeout(2600);
console.log('shield chip:', await page.locator('.shield-chip').count());

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
