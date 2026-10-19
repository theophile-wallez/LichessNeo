import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseServiceAccount, signedAssertion, TOKEN_URL } from './google-auth.ts';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const KEY = { client_email: 'ci@example.iam.gserviceaccount.com', private_key: privateKey };

const decode = (part: string | undefined): unknown =>
  JSON.parse(Buffer.from(part ?? '', 'base64url').toString('utf8'));

describe('signedAssertion', () => {
  it('signs a token request for the scope, valid for an hour', () => {
    const jwt = signedAssertion(KEY, 'https://example.com/scope', 1_700_000_000);
    const [header, claims, signature] = jwt.split('.');
    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decode(claims)).toEqual({
      iss: KEY.client_email,
      scope: 'https://example.com/scope',
      aud: TOKEN_URL,
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
    const verifier = createVerify('RSA-SHA256').update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, signature ?? '', 'base64url')).toBe(true);
  });
});

describe('parseServiceAccount', () => {
  it('reads the key', () => {
    expect(parseServiceAccount(JSON.stringify({ ...KEY, type: 'service_account' }))).toEqual(KEY);
  });

  it('never quotes the secret when it is wrong', () => {
    const secret = '{"private_key": "-----BEGIN PRIVATE KEY-----\\nabc';
    expect(() => parseServiceAccount(secret)).toThrow(/is not JSON/);
    expect(() => parseServiceAccount(secret)).not.toThrow(/PRIVATE KEY|abc/);
    expect(() => parseServiceAccount('{"private_key": "abc"}')).toThrow(/no client_email/);
    expect(() => parseServiceAccount('{"private_key": "abc"}')).not.toThrow(/abc/);
  });
});
