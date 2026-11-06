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
 * Each test file default-exports `async function ({ gameData, db, storage, ok, log })`:
 *   gameData  the exports of src/components/game/gameData.ts
 *   db        the exports of src/api/db.ts (backed by an in-memory localStorage)
 *   storage   the Map behind that localStorage, so a test can inspect or reset it
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

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const filters = args.filter((a) => !a.startsWith('--'));

// In-memory localStorage for the data layer
const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
};

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
  const gameData = await server.ssrLoadModule('/src/components/game/gameData.ts');
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
      await run({ gameData, db, storage, ok, log });
    } catch (err) {
      failures.push(`threw: ${err?.stack || err}`);
      console.log(`    FAIL  threw: ${err?.stack || err}`);
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
