import { createHash } from 'node:crypto';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export function toJsonValue(value: unknown, path = '$'): JsonValue {
  if (value === null) {
    return null;
  }

  switch (typeof value) {
    case 'boolean':
    case 'string':
      return value;
    case 'number':
      if (!Number.isFinite(value)) {
        throw new Error(`Non-finite number at ${path}.`);
      }
      return Object.is(value, -0) ? 0 : value;
    case 'undefined':
    case 'bigint':
    case 'function':
    case 'symbol':
      throw new Error(`Unsupported JSON value at ${path}.`);
    case 'object':
      break;
    default:
      throw new Error(`Unsupported JSON value at ${path}.`);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => toJsonValue(item, `${path}[${index}]`));
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`Only plain JSON objects are supported at ${path}.`);
  }

  const result: Record<string, JsonValue> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const child = (value as Record<string, unknown>)[key];
    if (child === undefined) {
      continue;
    }
    result[key] = toJsonValue(child, `${path}.${key}`);
  }
  return result;
}

export function canonicalizeJson(value: unknown): string {
  return serializeJsonValue(toJsonValue(value));
}

function serializeJsonValue(value: JsonValue): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializeJsonValue).join(',')}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${serializeJsonValue(value[key])}`)
    .join(',')}}`;
}

export function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
