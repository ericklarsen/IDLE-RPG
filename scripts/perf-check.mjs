import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

/**
 * First-paint gate. Runs the production build behind `vite preview` and loads
 * it on a throttled 4G profile (1.6 Mbps down, 150 ms RTT, cold cache).
 *
 * Budgets cover the entry chunk and the Phaser chunk (see bundle-check.mjs).
 * They are measured, not assumed: change them together with a real measurement.
 */
const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
const FCP_BUDGET_MS = 2000;
const CANVAS_BUDGET_MS = 4000;

await access('dist/index.html').catch(() => {
  console.error('perf-check: dist/index.html missing — run `npm run build` first.');
  process.exit(1);
});

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
server.stdout.on('data', (chunk) => {
  serverLog += chunk;
});
server.stderr.on('data', (chunk) => {
  serverLog += chunk;
});

const ready = await waitForServer();
if (!ready) {
  console.error(`perf-check: preview server did not start.\n${serverLog}`);
  server.kill();
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const client = await page.context().newCDPSession(page);
await client.send('Network.enable');
await client.send('Network.setCacheDisabled', { cacheDisabled: true });
await client.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
});

await page.goto(URL, { waitUntil: 'commit' });

const metrics = await page.evaluate(async () => {
  const deadline = performance.now() + 20000;

  const paint = () => performance.getEntriesByName('first-contentful-paint')[0];
  while (!paint() && performance.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const fcp = paint()?.startTime ?? null;

  while (!document.querySelector('canvas') && performance.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return {
    fcp,
    canvas: document.querySelector('canvas') ? performance.now() : null,
    canvasCount: document.querySelectorAll('canvas').length,
  };
});

await browser.close();
server.kill();

const show = (value) => (value === null ? 'missing' : `${Math.round(value)} ms`);
console.log(`first contentful paint: ${show(metrics.fcp)}`);
console.log(`canvas ready: ${show(metrics.canvas)}`);
console.log(`documents with canvas: ${metrics.canvasCount}`);

const failed =
  metrics.fcp === null ||
  metrics.canvas === null ||
  metrics.fcp > FCP_BUDGET_MS ||
  metrics.canvas > CANVAS_BUDGET_MS;

if (failed) {
  console.error(
    `perf-check: over budget (FCP ≤ ${FCP_BUDGET_MS} ms, canvas ≤ ${CANVAS_BUDGET_MS} ms).`,
  );
  process.exit(1);
}

console.log('perf-check: ok');
// The preview child and Playwright keep handles open; exit explicitly.
process.exit(0);

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(URL);
      if (response.ok) return true;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}
