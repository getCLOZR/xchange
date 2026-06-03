export type JsonParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parseJsonField<T = Record<string, unknown>>(
  raw: string,
  fieldLabel: string
): JsonParseResult<T> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: `${fieldLabel}: JSON cannot be empty` };
  }
  try {
    const value = JSON.parse(trimmed) as T;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return {
        ok: false,
        error: `${fieldLabel}: must be a JSON object`,
      };
    }
    return { ok: true, value };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON";
    return { ok: false, error: `${fieldLabel}: ${message}` };
  }
}
