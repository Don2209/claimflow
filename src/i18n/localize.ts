import dictionary from '@locale';

function merge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;
  if (Array.isArray(base)) {
    const list = override as unknown[];
    return base.map((item, index) => merge(item, list[index])) as T;
  }
  if (typeof base === 'object' && base !== null) {
    const result = { ...base } as Record<string, unknown>;
    for (const key of Object.keys(result)) {
      result[key] = merge(result[key], (override as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return override as T;
}

/**
 * Returns a block of copy in this build's language. Anything the language file does not
 * translate stays in English, so a partial translation can never leave a gap on the page.
 */
export function t<T>(key: string, english: T): T {
  return merge(english, (dictionary as Record<string, unknown>)[key]);
}
