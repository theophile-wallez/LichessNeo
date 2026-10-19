import { createSign } from 'node:crypto';
import { z } from 'zod/mini';
import { fetchJson, PublishError } from './http.ts';

// A Google service account signs its own token request (a JWT), so there's no
// refresh token to expire.

export const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const LIFETIME_SECONDS = 3600;

const ServiceAccountSchema = z.object({
  client_email: z.string(),
  private_key: z.string(),
});

export type ServiceAccount = z.infer<typeof ServiceAccountSchema>;

const TokenSchema = z.object({ access_token: z.string() });

export function parseServiceAccount(json: string): ServiceAccount {
  // Neither JSON.parse's message nor zod's is shown, as both can quote the key.
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new PublishError('CWS_SERVICE_ACCOUNT is not JSON: it must be the service account key');
  }
  const result = ServiceAccountSchema.safeParse(value);
  if (!result.success)
    throw new PublishError('CWS_SERVICE_ACCOUNT has no client_email or private_key');
  return result.data;
}

const base64url = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

/** The signed JWT asking for a token with `scope`, `now` in seconds. */
export function signedAssertion(key: ServiceAccount, scope: string, now: number): string {
  const claims = `${base64url({ alg: 'RS256', typ: 'JWT' })}.${base64url({
    iss: key.client_email,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + LIFETIME_SECONDS,
  })}`;
  const signature = createSign('RSA-SHA256').update(claims).sign(key.private_key, 'base64url');
  return `${claims}.${signature}`;
}

/** The Authorization header for the service account `key` (its JSON), within `scope`. */
export async function authorize(key: string, scope: string): Promise<Record<string, string>> {
  const assertion = signedAssertion(parseServiceAccount(key), scope, Math.floor(Date.now() / 1000));
  const token = await fetchJson(TOKEN_URL, TokenSchema, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  return { Authorization: `Bearer ${token.access_token}` };
}
