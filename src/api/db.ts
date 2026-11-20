/**
 * Local data layer (replacement for the Base44 SDK's `base44.entities`).
 *
 * Each entity exposes the same async API the pages used with Base44:
 *   list(sort?, limit?)
 *   filter(query, sort?, limit?)
 *   get(id)
 *   create(data)
 *   update(id, partialData)
 *   delete(id)
 *
 * `sort` is a field name, prefixed with "-" for descending (e.g. "-created_date").
 * Records get `id`, `created_date` and `updated_date` automatically.
 *
 * Every record is validated against its zod schema (src/api/schemas) on the way in
 * and on the way out:
 *   - create/update throw if the data is invalid, so bad data is never stored.
 *   - reads fill in defaults for fields added since a record was saved, and skip
 *     (with a console warning) any stored record that can't be repaired.
 *
 * Storage is pluggable: today records live in the browser's localStorage. To move to
 * a real database, write a `StorageAdapter` (or replace the entity methods with fetch
 * calls to your API) and pass it to `createEntity` below. Pages don't need to change.
 */
import { z } from 'zod';
import { MimicCharacterFieldsSchema, MimicCharacterSchema, keepWornForm } from './schemas/mimicCharacter';

/** Where raw records are kept. Records are untrusted until validated. */
export interface StorageAdapter {
  readAll(entityName: string): unknown[];
  writeAll(entityName: string, records: unknown[]): void;
  clear(entityName: string): void;
}

/** Fields every stored record has, managed by the data layer. */
interface StoredRecord {
  id: string;
  created_date: string;
  updated_date: string;
}

/** A field to sort by: "name" ascending, "-name" descending. */
export type SortKey<T> = Extract<keyof T, string> | `-${Extract<keyof T, string>}`;

const STORAGE_PREFIX = 'mm_entity_';

/** The stored list, or null if what's stored isn't a readable list (damaged, or not ours). */
const parseList = (raw: string | null): unknown[] | null => {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const localStorageAdapter: StorageAdapter = {
  // Unreadable data reads as empty, so the game still opens...
  readAll(entityName) {
    return parseList(window.localStorage.getItem(STORAGE_PREFIX + entityName)) ?? [];
  },
  // ...but is never written over: it's kept under a backup key first, so it can be recovered
  writeAll(entityName, records) {
    const key = STORAGE_PREFIX + entityName;
    const current = window.localStorage.getItem(key);
    if (parseList(current) === null) {
      const backup = `${key}.unreadable-${new Date().toISOString()}`;
      window.localStorage.setItem(backup, current as string);
      console.error(`Saved ${entityName} data couldn't be read; kept it under "${backup}" before saving anew.`);
    }
    window.localStorage.setItem(key, JSON.stringify(records));
  },
  clear(entityName) {
    window.localStorage.removeItem(STORAGE_PREFIX + entityName);
  },
};

const newId = (): string =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`)
    .replace(/-/g, '');

/** The `id` of a raw stored record, if it has one. */
const rawId = (raw: unknown): unknown =>
  raw !== null && typeof raw === 'object' && 'id' in raw ? raw.id : undefined;

const matches = <T>(record: T, query: Partial<T> = {}): boolean =>
  (Object.entries(query) as [keyof T, unknown][]).every(([key, value]) => record[key] === value);

const sortRecords = <T>(records: T[], sort?: SortKey<T>): T[] => {
  if (!sort) return records;
  const desc = sort.startsWith('-');
  const field = (desc ? sort.slice(1) : sort) as keyof T;
  return [...records].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    const result = av < bv ? -1 : 1;
    return desc ? -result : result;
  });
};

const applyLimit = <T>(records: T[], limit?: number): T[] => (limit === undefined ? records : records.slice(0, limit));

/** Error thrown when data fails schema validation. `issues` holds zod's details. */
export class ValidationError extends Error {
  issues: z.core.$ZodIssue[];

  constructor(entityName: string, zodError: z.ZodError) {
    super(`Invalid ${entityName}:\n${z.prettifyError(zodError)}`);
    this.name = 'ValidationError';
    this.issues = zodError.issues;
  }
}

const isPlainObject = (v: unknown): v is Record<PropertyKey, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The value at `path` inside `root` (undefined if the path leads nowhere). */
const valueAt = (root: unknown, path: readonly PropertyKey[]): unknown =>
  path.reduce<unknown>((v, key) => (v !== null && typeof v === 'object' ? (v as Record<PropertyKey, unknown>)[key] : undefined), root);

/**
 * Fits a stored record to the current schema rather than losing it, for saves made before
 * something changed: fields the game no longer has are dropped, and so is anything naming what
 * the game no longer has (a renamed form, a removed material). In a list, that entry goes; a
 * single field goes back to its default. What can't be fitted (no name, say) still fails.
 * Only reading is this forgiving: what the game writes is checked strictly.
 */
function fitToSchema<S extends z.ZodType>(schema: S, raw: unknown): { result: z.ZodSafeParseResult<z.output<S>>; dropped: string[] } {
  const record: unknown = structuredClone(raw);
  const dropped: string[] = [];
  let result = schema.safeParse(record);
  for (let pass = 0; pass < 5 && !result.success && isPlainObject(record); pass++) {
    let changed = false;
    const removals = new Map<unknown[], Set<number>>();
    for (const issue of result.error.issues) {
      const path = issue.path;
      if (issue.code === 'unrecognized_keys') {
        const target = valueAt(record, path);
        if (!isPlainObject(target)) continue;
        for (const key of issue.keys) {
          delete target[key];
          dropped.push([...path, key].join('.'));
          changed = true;
        }
        continue;
      }
      // Inside a list: drop that entry. Otherwise: drop the field, so its default applies
      let listDepth = -1;
      for (let i = path.length - 1; i >= 0 && listDepth < 0; i--) if (Array.isArray(valueAt(record, path.slice(0, i)))) listDepth = i;
      if (listDepth >= 0) {
        const list = valueAt(record, path.slice(0, listDepth)) as unknown[];
        if (!removals.has(list)) removals.set(list, new Set());
        removals.get(list)!.add(Number(path[listDepth]));
        dropped.push(path.slice(0, listDepth + 1).join('.'));
      } else if (path.length > 0 && path[0] in record) {
        delete record[path[0]];
        dropped.push(String(path[0]));
        changed = true;
      }
    }
    // Highest index first, so the earlier ones stay where they are
    for (const [list, indexes] of removals) {
      [...indexes].sort((a, b) => b - a).forEach((i) => list.splice(i, 1));
      changed = true;
    }
    if (!changed) break;
    result = schema.safeParse(record);
  }
  return { result, dropped };
}

export interface Entity<TRecord extends StoredRecord, TInput> {
  list(sort?: SortKey<TRecord>, limit?: number): Promise<TRecord[]>;
  filter(query: Partial<TRecord>, sort?: SortKey<TRecord>, limit?: number): Promise<TRecord[]>;
  get(id: string): Promise<TRecord>;
  create(data: TInput): Promise<TRecord>;
  update(id: string, data: Partial<TInput>): Promise<TRecord>;
  delete(id: string): Promise<void>;
}

function createEntity<
  TFieldsSchema extends z.ZodType,
  TRecordSchema extends z.ZodType<StoredRecord>,
>(
  name: string,
  schemas: {
    fieldsSchema: TFieldsSchema;
    recordSchema: TRecordSchema;
    /** Entity-specific tidying of a stored record before it's fitted to the schema (see fitToSchema), saying what it dropped. */
    prepareStored?: (raw: unknown) => { record: unknown; dropped: string[] };
  },
  adapter: StorageAdapter = localStorageAdapter,
): Entity<z.output<TRecordSchema>, z.input<TFieldsSchema>> {
  type TRecord = z.output<TRecordSchema>;
  const { fieldsSchema, recordSchema, prepareStored = (raw) => ({ record: raw, dropped: [] }) } = schemas;

  /** A stored record, fitted to the current schema (saying what was dropped, if anything). */
  const readStored = (raw: unknown) => {
    const prepared = prepareStored(raw);
    const { result, dropped: alsoDropped } = fitToSchema(recordSchema, prepared.record);
    const dropped = [...prepared.dropped, ...alsoDropped];
    if (result.success && dropped.length > 0) {
      console.warn(`Stored ${name} ${String(rawId(raw) ?? '(no id)')} no longer fit; dropped: ${dropped.join(', ')}`);
    }
    return result;
  };

  const validate = <S extends z.ZodType>(schema: S, data: unknown): z.output<S> => {
    const result = schema.safeParse(data);
    if (!result.success) throw new ValidationError(name, result.error);
    return result.data;
  };

  /** All stored records, fitted to the schema with defaults applied. Ones that can't be fitted are skipped. */
  const readValid = (): TRecord[] =>
    adapter.readAll(name).flatMap((raw) => {
      const result = readStored(raw);
      if (result.success) return [result.data];
      console.warn(`Skipping invalid stored ${name} ${String(rawId(raw) ?? '(no id)')}:\n${z.prettifyError(result.error)}`);
      return [];
    });

  return {
    async list(sort, limit) {
      return applyLimit(sortRecords(readValid(), sort), limit);
    },

    async filter(query, sort, limit) {
      return applyLimit(sortRecords(readValid().filter((r) => matches(r, query)), sort), limit);
    },

    async get(id) {
      const raw = adapter.readAll(name).find((r) => rawId(r) === id);
      if (!raw) throw new Error(`${name} ${id} not found`);
      const result = readStored(raw);
      if (!result.success) throw new ValidationError(name, result.error);
      return result.data;
    },

    async create(data) {
      const fields = validate(fieldsSchema, data);
      const now = new Date().toISOString();
      const record = validate(recordSchema, { ...(fields as object), id: newId(), created_date: now, updated_date: now });
      adapter.writeAll(name, [...adapter.readAll(name), record]);
      return record;
    },

    async update(id, data) {
      const records = adapter.readAll(name);
      const index = records.findIndex((r) => rawId(r) === id);
      if (index === -1) throw new Error(`${name} ${id} not found`);
      // id and timestamps are managed here; ignore them if a caller passes them in
      const { id: _id, created_date: _created, updated_date: _updated, ...changes } =
        (data ?? {}) as Partial<StoredRecord> & Record<string, unknown>;
      // An older record is fitted first; the changes themselves are checked strictly
      const stored = readStored(records[index]);
      const updated = validate(recordSchema, {
        ...((stored.success ? stored.data : records[index]) as object),
        ...changes,
        updated_date: new Date().toISOString(),
      });
      records[index] = updated;
      adapter.writeAll(name, records);
      return updated;
    },

    async delete(id) {
      adapter.writeAll(name, adapter.readAll(name).filter((r) => rawId(r) !== id));
    },
  };
}

export const db = {
  entities: {
    MimicCharacter: createEntity('MimicCharacter', {
      fieldsSchema: MimicCharacterFieldsSchema,
      recordSchema: MimicCharacterSchema,
      prepareStored: keepWornForm,
    }),
  },
};
