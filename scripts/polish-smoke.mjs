import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch();
const errors = [];

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

function measureOverflow() {
  return page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('.app *')) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1)) {
        bad.push(el.className || el.tagName);
      }
    }
    return bad.slice(0, 8);
  });
}

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.onboard-card');

console.log('step 1:', (await page.locator('.onboard-card').innerText()).replaceAll('\n', ' | '));
console.log('step 1 overflow:', (await measureOverflow()).length ? await measureOverflow() : 'none');
await page.screenshot({ path: 'artifacts/polish-onboarding.png' });

await page.getByRole('button', { name: 'NEXT', exact: true }).click();
console.log('step 2 eyebrow:', await page.locator('.onboard-card .eyebrow').innerText());

await page.getByRole('button', { name: 'NEXT', exact: true }).click();
console.log('step 3:', (await page.locator('.onboard-card').innerText()).replaceAll('\n', ' | '));

await page.getByRole('button', { name: 'START FIGHTING' }).click();
await page.waitForTimeout(300);
console.log('onboarding closed:', (await page.locator('.onboard-card').count()) === 0);
console.log(
  'onboarded flag:',
  await page.evaluate(() => localStorage.getItem('idle-forge-onboarded-v1')),
);

await page.reload({ waitUntil: 'networkidle' });
console.log('onboarding after reload:', await page.locator('.onboard-card').count());

// Give the install handler a moment, then make sure the page is controlled.
await page.waitForTimeout(600);
const sw = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return {
    scope: reg.scope,
    active: Boolean(reg.active),
    controlling: Boolean(navigator.serviceWorker.controller),
  };
});
console.log('service worker:', sw);

if (sw && !sw.controlling) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
}

const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return null;
  const url = new URL(link.href, location.href);
  const response = await fetch(url);
  return {
    href: url.href,
    status: response.status,
    data: await response.json(),
  };
});
console.log('manifest:', manifest?.status, manifest?.data?.name, manifest?.data?.display);
console.log(
  'manifest icons:',
  manifest?.data?.icons?.map((icon) => `${icon.sizes}/${icon.purpose}`).join(', '),
);

const icons = await page.evaluate(async (entries) => {
  const out = [];
  for (const entry of entries) {
    const url = new URL(entry.src, entry.base);
    const response = await fetch(url);
    const bitmap = await createImageBitmap(await response.blob());
    out.push({ src: entry.src, status: response.status, width: bitmap.width, height: bitmap.height });
  }
  return out;
}, (manifest?.data?.icons ?? []).map((icon) => ({ src: icon.src, base: manifest.href })));
console.log('icon files:', icons);

const cacheNames = await page.evaluate(() => caches.keys());
console.log('cache buckets:', cacheNames);

await page.waitForTimeout(500);
await context.setOffline(true);
let offlineLoaded = true;
try {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1200);
} catch (error) {
  offlineLoaded = false;
  console.log('offline reload failed:', error.message);
}
console.log('offline loaded:', offlineLoaded);
console.log('offline panel:', await page.locator('.panel').count());
console.log('offline canvas:', await page.locator('canvas').count());
console.log('offline title:', await page.title());
await context.setOffline(false);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);

await openSection(page, 'OPTIONS');
const muteButton = page.getByRole('button', { name: 'Mute sound' });
console.log('sound button visible:', await muteButton.isVisible());
await muteButton.click();
console.log(
  'muted pressed state:',
  await page.getByRole('button', { name: 'Unmute sound' }).getAttribute('aria-pressed'),
);
console.log(
  'muted persisted:',
  await page.evaluate(() => localStorage.getItem('idle-forge-settings-v1')),
);
console.log('options overflow:', (await measureOverflow()).length ? await measureOverflow() : 'none');
await page.screenshot({ path: 'artifacts/polish-options.png' });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await openSection(page, 'OPTIONS');
console.log(
  'muted after reload:',
  (await page.getByRole('button', { name: 'Unmute sound' }).count()) === 1,
);
await page.screenshot({ path: 'artifacts/polish-muted.png' });

// Forge tabs and bag tools must stay inside 360px.
await openSection(page, 'FORGE');
console.log('forge overflow:', (await measureOverflow()).length ? await measureOverflow() : 'none');
console.log('forge tabs:', await page.locator('.forge-tab').count());

await openSection(page, 'GEAR');
console.log('gear overflow:', (await measureOverflow()).length ? await measureOverflow() : 'none');
console.log('gear chips:', await page.locator('.bag-chip').count());

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
