// How the rule modules (src/data) import each other: each from the module a name lives in,
// never through gameData.ts (the front door, which re-exports them all), and never in a circle.
// A circle works only while nothing runs at load time, and fails confusingly once something does.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default async function ({ ok }) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data');
  const modules = readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => f.slice(0, -3));
  // What each module imports at run time (type-only imports vanish when the code runs)
  const deps = Object.fromEntries(modules.map((m) => {
    const source = readFileSync(path.join(dir, `${m}.ts`), 'utf8');
    const found = new Set();
    for (const [, typeOnly, names, from] of source.matchAll(/^import (type )?\{([^}]*)\} from "\.\/(\w+)";/gm)) {
      const real = names.split(',').map((n) => n.trim()).filter((n) => n && !n.startsWith('type '));
      if (!typeOnly && real.length > 0) found.add(from);
    }
    if (m !== 'gameData') for (const [, from] of source.matchAll(/^export \* from "\.\/(\w+)";/gm)) found.add(from);
    return [m, found];
  }));

  const throughFrontDoor = modules.filter((m) => m !== 'gameData' && deps[m].has('gameData'));
  ok(throughFrontDoor.length === 0, `no rule module imports gameData.ts${throughFrontDoor.length ? ` (${throughFrontDoor.join(', ')} ${throughFrontDoor.length === 1 ? 'does' : 'do'})` : ''}`);

  // A circle: a module that can reach itself by following imports
  const reaches = (from, target, seen = new Set()) =>
    [...deps[from] ?? []].some((d) => d === target || (!seen.has(d) && (seen.add(d), reaches(d, target, seen))));
  const looping = modules.filter((m) => m !== 'gameData' && reaches(m, m));
  ok(looping.length === 0, `no module imports itself round a circle${looping.length ? ` (${looping.join(', ')})` : ''}`);
}
