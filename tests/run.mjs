/**
 * Test runner for the game rules and data layer.
 *
 *   npm test               run every tests/*.test.mjs file
 *   npm test -- magic      run only files whose name contains "magic"
 *   npm test -- --verbose  also print passing checks and info lines
 *
 * Source files are loaded through Vite (same config as the app), so `@/` imports,
 * JSX and extensionless imports work exactly as they do in the browser build.
 *
 * Each test file default-exports `async function ({ gameData, db, storage, load, ok, log })`:
 *   gameData  the exports of src/data/gameData.ts
 *   db        the exports of src/api/db.ts (backed by an in-memory localStorage)
 *   storage   the Map behind that localStorage, so a test can inspect or reset it
 *   load(path)  any other source module, e.g. load('/src/components/game/RoomMap.tsx')
 *              (screen tests render components with it: see tests/screen.mjs)
 *
 * There's a page to render into: jsdom provides `window` and `document` (with the localStorage
 * above), so screen tests can use React Testing Library to render, find and click. Whatever a
 * test file renders is unmounted when it finishes.
 *   ok(cond, message)  record a check
 *   log(...)           info output, shown with --verbose
 *
 * Some checks are statistical (they roll dice thousands of times and compare rates).
 * Their thresholds have wide margins, but a very rare flaky failure is possible —
 * rerun before assuming something broke.
 */
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const filters = args.filter((a) => !a.startsWith('--'));

// A page for screen tests to render into (jsdom), with its window's globals (document,
// HTMLElement, getComputedStyle…) available the way they are in a browser
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
globalThis.window = dom.window;
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (key in globalThis) continue;
  Object.defineProperty(globalThis, key, { configurable: true, get: () => dom.window[key] });
}
// Node has its own Event classes; components dispatch events on the page, which only takes the
// page's own (e.g. Radix's dialogs build a CustomEvent), so use jsdom's
for (const key of ['Event', 'CustomEvent', 'EventTarget']) globalThis[key] = dom.window[key];
// jsdom has no layout: scrolling into view does nothing, and nothing ever resizes
dom.window.Element.prototype.scrollIntoView = function scrollIntoView() {};
dom.window.ResizeObserver ??= class ResizeObserver { observe() {} unobserve() {} disconnect() {} };
globalThis.ResizeObserver = dom.window.ResizeObserver;
// React: renders here happen inside act() (Testing Library does that), so say so
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// In-memory localStorage for the data layer (a Map, so a test can inspect or reset it)
const storage = new Map();
Object.defineProperty(dom.window, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
});
// Loaded after the page exists: Testing Library binds `screen` to document.body when it loads
const { cleanup } = await import('@testing-library/react');

// Use the app's own Vite config, whatever its extension
const configFile = ['vite.config.mjs', 'vite.config.js', 'vite.config.ts']
  .map((name) => path.join(root, name))
  .find((file) => existsSync(file));

const server = await createServer({
  root,
  configFile,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
});

let totalPassed = 0;
let totalFailed = 0;
try {
  const gameData = await server.ssrLoadModule('/src/data/gameData.ts');
  const db = await server.ssrLoadModule('/src/api/db.ts');

  const files = readdirSync(testsDir)
    .filter((f) => f.endsWith('.test.mjs'))
    .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
    .sort();

  for (const file of files) {
    let passed = 0;
    const failures = [];
    const ok = (cond, message) => {
      if (cond) {
        passed++;
        if (verbose) console.log(`    ok    ${message}`);
      } else {
        failures.push(message);
        console.log(`    FAIL  ${message}`);
      }
    };
    const log = (...parts) => { if (verbose) console.log('    ·', ...parts); };

    console.log(`${file}`);
    const { default: run } = await import(pathToFileURL(path.join(testsDir, file)).href);
    try {
      await run({ gameData, db, storage, load: (p) => server.ssrLoadModule(p), ok, log });
    } catch (err) {
      failures.push(`threw: ${err?.stack || err}`);
      console.log(`    FAIL  threw: ${err?.stack || err}`);
    } finally {
      cleanup();
    }
    console.log(failures.length ? `  ✗ ${failures.length} failed, ${passed} passed\n` : `  ✓ ${passed} passed\n`);
    totalPassed += passed;
    totalFailed += failures.length;
  }

  if (files.length === 0) console.log(`No test files matched: ${filters.join(', ')}`);
  console.log(totalFailed ? `FAILED: ${totalFailed} failed, ${totalPassed} passed` : `All ${totalPassed} checks passed`);
} finally {
  await server.close();
}
process.exitCode = totalFailed ? 1 : 0;
