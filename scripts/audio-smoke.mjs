import { chromium } from 'playwright';
import { openSection } from './nav.mjs';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';
await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch();
const errors = [];
const context = (viewport, extra = {}) =>
  browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });

function watch(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
}

// Records every frequency the engine schedules, without touching app code.
function probeAudio() {
  const Native = window.AudioContext;
  if (!Native) return;
  window.__freqs = [];
  window.AudioContext = class extends Native {
    createOscillator() {
      const osc = super.createOscillator();
      const setValue = osc.frequency.setValueAtTime.bind(osc.frequency);
      osc.frequency.setValueAtTime = (value, time) => {
        window.__freqs.push(value);
        return setValue(value, time);
      };

      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(osc.frequency),
        'value',
      );
      Object.defineProperty(osc.frequency, 'value', {
        configurable: true,
        get() {
          return descriptor.get.call(this);
        },
        set(value) {
          window.__freqs.push(value);
          descriptor.set.call(this, value);
        },
      });
      return osc;
    }
  };
}

const main = await context({ width: 390, height: 844 });
const page = await main.newPage();
watch(page);
await page.addInitScript(() => {
  localStorage.setItem('idle-forge-onboarded-v1', '1');
});
await page.addInitScript(probeAudio);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

await openSection(page, 'OPTIONS');

const calmFreqs = await page.evaluate(() => window.__freqs ?? []);
const calmChord = [110, 164.81, 220];
console.log('calm notes scheduled:', [...new Set(calmFreqs)].slice(0, 6));
console.log('calm chord playing:', calmChord.every((freq) => calmFreqs.includes(freq)));

const music = page.getByLabel('Music volume');
const sfx = page.getByLabel('Sound effects volume');
console.log('option rows:', await page.locator('.option-row').count());
console.log('default levels:', await music.inputValue(), await sfx.inputValue());

// Keyboard drives range inputs exactly like a real device, and fires React's onChange.
await music.focus();
await music.press('Home');
for (let i = 0; i < 4; i += 1) await music.press('ArrowRight');
await sfx.focus();
await sfx.press('Home');
for (let i = 0; i < 8; i += 1) await sfx.press('ArrowRight');

console.log('levels after adjust:', await music.inputValue(), await sfx.inputValue());
console.log('labels:', (await page.locator('.options-panel').innerText()).replaceAll('\n', ' | '));
console.log(
  'settings stored:',
  await page.evaluate(() => localStorage.getItem('idle-forge-settings-v1')),
);

await page.getByRole('button', { name: 'Reduce motion' }).click();
console.log(
  'motion class:',
  await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')),
);
console.log(
  'looping css animation off:',
  await page.evaluate(() => {
    const dot = document.querySelector('.auto-pill i');
    return dot ? getComputedStyle(dot).animationName : 'missing';
  }),
);
console.log(
  'motion stored:',
  await page.evaluate(
    () => JSON.parse(localStorage.getItem('idle-forge-settings-v1') ?? '{}').reducedMotion,
  ),
);

await page.screenshot({ path: 'artifacts/audio-panel.png' });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await openSection(page, 'OPTIONS');
console.log(
  'levels after reload:',
  await page.getByLabel('Music volume').inputValue(),
  await page.getByLabel('Sound effects volume').inputValue(),
);
console.log('sliders enabled:', await page.locator('.options-panel input').first().isEnabled());
console.log(
  'motion after reload:',
  (await page.getByRole('button', { name: 'Enable motion effects' }).count()) === 1,
  await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')),
);

await page.setViewportSize({ width: 360, height: 740 });
await page.waitForTimeout(200);
const overflow = await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll('.app *')) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1)) {
      bad.push(el.className || el.tagName);
    }
  }
  return bad.slice(0, 8);
});
console.log('360px overflow with audio open:', overflow.length ? overflow : 'none');

await page.getByRole('button', { name: 'Mute sound' }).click();
console.log(
  'mute still works:',
  (await page.getByRole('button', { name: 'Unmute sound' }).count()) === 1,
);

// A rift swaps the score to the faster arpeggio, which schedules notes on every beat.
const weapon = {
  id: 'it_1',
  slot: 'weapon',
  rarity: 'epic',
  name: 'Rift Cleaver',
  level: 12,
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

const riftContext = await context({ width: 390, height: 844 });
const riftPage = await riftContext.newPage();
watch(riftPage);
await riftPage.addInitScript(
  ({ weapon: seeded }) => {
    if (localStorage.getItem('idle-forge-save-v1')) return;
    localStorage.setItem('idle-forge-onboarded-v1', '1');
    localStorage.setItem(
      'idle-forge-save-v1',
      JSON.stringify({
        version: 9,
        level: 30,
        exp: 0,
        gold: 5000,
        maxStage: 12,
        farmStage: 12,
        stage: 12,
        rift: { day: '2020-01-01', kills: 0 },
        kills: 0,
        inventory: [],
        equipped: { weapon: seeded },
        itemSeq: 1,
        lastSeen: Date.now(),
      }),
    );
  },
  { weapon },
);
await riftPage.addInitScript(probeAudio);

await riftPage.goto(BASE, { waitUntil: 'networkidle' });
await riftPage.waitForTimeout(1000);
await openSection(riftPage, 'RIFT');
await riftPage.getByRole('button', { name: 'ENTER RIFT' }).click();
await riftPage.evaluate(() => {
  window.__freqs = [];
});
await riftPage.waitForTimeout(1400);

const riftFreqs = await riftPage.evaluate(() => window.__freqs ?? []);
console.log('rift notes scheduled:', [...new Set(riftFreqs)].slice(0, 10));
console.log(
  'rift arpeggio playing:',
  [261.63, 293.66, 329.63].filter((freq) => riftFreqs.includes(freq)).length >= 2,
);
console.log('rift row active:', (await riftPage.locator('.rift-row').count()) === 1);

// With no stored preference, the OS setting should win on first load.
const osContext = await context({ width: 390, height: 844 }, { reducedMotion: 'reduce' });
const osPage = await osContext.newPage();
watch(osPage);
await osPage.goto(BASE, { waitUntil: 'networkidle' });
await osPage.waitForTimeout(500);
console.log(
  'os reduce respected:',
  await osPage.evaluate(() => document.documentElement.classList.contains('reduce-motion')),
);

console.log('errors:', errors.length ? errors : 'none');
await browser.close();

if (errors.length > 0) process.exit(1);
