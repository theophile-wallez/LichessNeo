import type { z } from 'zod/mini';

/** A failure to report as is: its message says what went wrong. */
export class PublishError extends Error {}

/** Fetches `url` and parses its JSON answer, or says what the server answered instead. */
export async function fetchJson<T>(
  url: string,
  schema: z.ZodMiniType<T>,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  const request = `${init.method ?? 'GET'} ${url}`;
  if (!response.ok) throw new PublishError(`${request}: ${response.status} ${text}`);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new PublishError(`${request}: not JSON: ${text}`);
  }
  const result = schema.safeParse(value);
  if (!result.success) throw new PublishError(`${request}: unexpected answer: ${text}`);
  return result.data;
}
