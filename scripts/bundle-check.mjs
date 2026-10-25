import { gzipSync } from 'node:zlib';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Initial-payload gate: the entry chunk plus the Phaser chunk that is
 * modulepreloaded from index.html. Lazy panels are measured separately because
 * they never block first paint.
 *
 * 520 KB is a measured ceiling, not a guess: at 454.95 KB the perf gate still
 * reported 1608 ms first paint and 3147 ms canvas ready against 2000/4000 ms
 * budgets on the throttled 4G profile (`npm run check:perf`). The extra room is
 * for party combat; raise it again only with a fresh measurement of both.
 */
const BUDGET_KB = 520;
const DIST = 'dist';

const html = await readFile(join(DIST, 'index.html'), 'utf8');
const files = new Set();

// <script type="module" src="./assets/index-*.js"> and the modulepreload link.
for (const match of html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.js)"/g)) {
  files.add(match[1]);
}

if (files.size === 0) {
  console.error('bundle-check: no scripts found in dist/index.html — run `npm run build` first.');
  process.exit(1);
}

let total = 0;
for (const file of [...files].sort()) {
  const gzip = gzipSync(await readFile(join(DIST, file)), { level: 9 }).length;
  total += gzip;
  console.log(`${(gzip / 1024).toFixed(2).padStart(7)} KB  ${file}`);
}

const lazy = await readdir(join(DIST, 'assets'));
const lazyBytes = await Promise.all(
  lazy
    .filter((name) => name.endsWith('.js') && !files.has(`assets/${name}`))
    .map(async (name) => ({
      name,
      gzip: gzipSync(await readFile(join(DIST, 'assets', name)), { level: 9 }).length,
    })),
);
const lazyTotal = lazyBytes.reduce((sum, file) => sum + file.gzip, 0);

console.log(
  `\ninitial JS: ${(total / 1024).toFixed(2)} / ${BUDGET_KB} KB gzip ` +
    `· lazy chunks: ${lazyBytes.length} (${(lazyTotal / 1024).toFixed(2)} KB)`,
);

if (total / 1024 > BUDGET_KB) {
  console.error(`bundle-check: over budget by ${((total / 1024) - BUDGET_KB).toFixed(2)} KB.`);
  process.exit(1);
}

console.log('bundle-check: ok');
