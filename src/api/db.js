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
 * a real database, write an adapter with the same methods as `localStorageAdapter`
 * (or replace the entity methods with fetch calls to your API) and pass it to
 * `createEntity` below. Pages don't need to change.
 */
import { z } from 'zod';
import { MimicCharacterFieldsSchema, MimicCharacterSchema } from './schemas/mimicCharacter';

const STORAGE_PREFIX = 'mm_entity_';

const localStorageAdapter = {
  readAll(entityName) {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + entityName);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  writeAll(entityName, records) {
    window.localStorage.setItem(STORAGE_PREFIX + entityName, JSON.stringify(records));
  },
  clear(entityName) {
    window.localStorage.removeItem(STORAGE_PREFIX + entityName);
  },
};

const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`)
    .replace(/-/g, '');

const matches = (record, query = {}) =>
  Object.entries(query).every(([key, value]) => record[key] === value);

const sortRecords = (records, sort) => {
  if (!sort) return records;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
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

const applyLimit = (records, limit) => (limit ? records.slice(0, limit) : records);

/** Error thrown when data fails schema validation. `issues` holds zod's details. */
export class ValidationError extends Error {
  constructor(entityName, zodError) {
    super(`Invalid ${entityName}:\n${z.prettifyError(zodError)}`);
    this.name = 'ValidationError';
    this.issues = zodError.issues;
  }
}

function createEntity(name, { fieldsSchema, recordSchema }, adapter = localStorageAdapter) {
  const validate = (schema, data) => {
    const result = schema.safeParse(data);
    if (!result.success) throw new ValidationError(name, result.error);
    return result.data;
  };

  /** All stored records, validated and with defaults applied. Unrepairable ones are skipped. */
  const readValid = () =>
    adapter.readAll(name).flatMap((raw) => {
      const result = recordSchema.safeParse(raw);
      if (result.success) return [result.data];
      console.warn(`Skipping invalid stored ${name} ${raw?.id ?? '(no id)'}:\n${z.prettifyError(result.error)}`);
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
      const raw = adapter.readAll(name).find((r) => r.id === id);
      if (!raw) throw new Error(`${name} ${id} not found`);
      return validate(recordSchema, raw);
    },

    async create(data) {
      const fields = validate(fieldsSchema, data);
      const now = new Date().toISOString();
      const record = validate(recordSchema, { ...fields, id: newId(), created_date: now, updated_date: now });
      adapter.writeAll(name, [...adapter.readAll(name), record]);
      return record;
    },

    async update(id, data) {
      const records = adapter.readAll(name);
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) throw new Error(`${name} ${id} not found`);
      const { id: _id, created_date: _created, updated_date: _updated, ...changes } = data ?? {};
      const updated = validate(recordSchema, {
        ...records[index],
        ...changes,
        updated_date: new Date().toISOString(),
      });
      records[index] = updated;
      adapter.writeAll(name, records);
      return updated;
    },

    async delete(id) {
      adapter.writeAll(name, adapter.readAll(name).filter((r) => r.id !== id));
    },
  };
}

export const db = {
  entities: {
    MimicCharacter: createEntity('MimicCharacter', {
      fieldsSchema: MimicCharacterFieldsSchema,
      recordSchema: MimicCharacterSchema,
    }),
  },
};
