import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { API, ITEM_ID, publishToChromeWebStore, type PublishOptions } from './chrome-web-store.ts';
import { TOKEN_URL } from './google-auth.ts';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const ITEM = `${API}/v2/publishers/publisher/items/${ITEM_ID}`;
const STATUS = `${ITEM}:fetchStatus`;
const UPLOAD = `${API}/upload/v2/publishers/publisher/items/${ITEM_ID}:upload`;
const PUBLISH = `${ITEM}:publish`;
const ZIP = new Uint8Array([80, 75, 5, 6]);

interface Reply {
  readonly status?: number;
  readonly body: unknown;
}

interface Request {
  readonly url: string;
  readonly init: RequestInit;
}

// The store's answers per URL, in the order it gives them.
function fakeStore(replies: Record<string, Reply[]>): Request[] {
  const requests: Request[] = [];
  const token: Reply = { body: { access_token: 'tok' } };
  const queues = new Map<string, Reply[]>(Object.entries({ [TOKEN_URL]: [token], ...replies }));
  vi.stubGlobal('fetch', (url: string, init: RequestInit = {}) => {
    requests.push({ url, init });
    const reply = queues.get(url)?.shift();
    if (reply === undefined) return Promise.reject(new Error(`unexpected request to ${url}`));
    const body = JSON.stringify(reply.body);
    return Promise.resolve(new Response(body, { status: reply.status ?? 200 }));
  });
  return requests;
}

function publish(overrides: Partial<PublishOptions> = {}): {
  lines: string[];
  done: Promise<void>;
} {
  const lines: string[] = [];
  const done = publishToChromeWebStore({
    zip: ZIP,
    version: '0.1.295',
    serviceAccount: JSON.stringify({ client_email: 'ci@example.com', private_key: privateKey }),
    publisherId: 'publisher',
    log: line => lines.push(line),
    sleep: () => Promise.resolve(),
    ...overrides,
  });
  return { lines, done };
}

const nothingInReview = {
  body: { publishedItemRevisionStatus: { distributionChannels: [{ crxVersion: '0.1.290' }] } },
};

describe('publishToChromeWebStore', () => {
  it('uploads the zip, then submits it for review', async () => {
    const requests = fakeStore({
      [STATUS]: [nothingInReview],
      [UPLOAD]: [{ body: { uploadState: 'SUCCEEDED', crxVersion: '0.1.295' } }],
      [PUBLISH]: [
        {
          body: {
            state: 'PENDING_REVIEW',
            warningInfo: { warnings: [{ reason: 'SLOW', description: 'Review may take longer.' }] },
          },
        },
      ],
    });
    const { lines, done } = publish();
    await done;
    expect(lines).toEqual([
      'On the store: 0.1.290. Sending 0.1.295.',
      '::warning::SLOW: Review may take longer.',
      '0.1.295 submitted: PENDING_REVIEW.',
    ]);
    const upload = requests.find(request => request.url === UPLOAD);
    expect(upload?.init).toMatchObject({
      method: 'POST',
      body: ZIP,
      headers: { Authorization: 'Bearer tok' },
    });
    const submit = requests.find(request => request.url === PUBLISH);
    expect(submit?.init.body).toBe('{"publishType":"DEFAULT_PUBLISH"}');
  });

  it('stops while another version is in review, before uploading', async () => {
    const requests = fakeStore({
      [STATUS]: [
        {
          body: {
            submittedItemRevisionStatus: {
              state: 'PENDING_REVIEW',
              distributionChannels: [{ crxVersion: '0.1.294' }],
            },
          },
        },
      ],
    });
    const { lines, done } = publish();
    await expect(done).rejects.toThrow(
      '0.1.294 is still in review: wait for it, or cancel it in the dashboard, then run this again',
    );
    expect(lines).toEqual(['On the store: nothing yet. Sending 0.1.295.']);
    expect(requests.map(request => request.url)).not.toContain(UPLOAD);
  });

  it('waits for a package the store is still processing', async () => {
    fakeStore({
      [STATUS]: [
        nothingInReview,
        { body: { lastAsyncUploadState: 'IN_PROGRESS' } },
        { body: { lastAsyncUploadState: 'SUCCEEDED' } },
      ],
      [UPLOAD]: [{ body: { uploadState: 'IN_PROGRESS' } }],
      [PUBLISH]: [{ body: { state: 'PENDING_REVIEW' } }],
    });
    const sleep = vi.fn<(ms: number) => Promise<void>>(() => Promise.resolve());
    const { lines, done } = publish({ sleep });
    await done;
    expect(sleep.mock.calls).toEqual([[5000], [5000]]);
    expect(lines.at(-1)).toBe('0.1.295 submitted: PENDING_REVIEW.');
  });

  it('reports a failed upload with all the store said', async () => {
    fakeStore({
      [STATUS]: [nothingInReview],
      [UPLOAD]: [{ body: { uploadState: 'FAILURE', itemError: [{ error_code: 'PKG_INVALID' }] } }],
    });
    await expect(publish().done).rejects.toThrow(
      'the upload ended as FAILURE: {"uploadState":"FAILURE","itemError":[{"error_code":"PKG_INVALID"}]}',
    );
  });

  it('refuses a zip the store reads as another version', async () => {
    fakeStore({
      [STATUS]: [nothingInReview],
      [UPLOAD]: [{ body: { uploadState: 'SUCCEEDED', crxVersion: '0.1.294' } }],
    });
    await expect(publish().done).rejects.toThrow(
      'the store read version 0.1.294 in the zip, not 0.1.295',
    );
  });

  it('says what the store answered to a refused request', async () => {
    fakeStore({
      [STATUS]: [nothingInReview],
      [UPLOAD]: [{ body: { uploadState: 'SUCCEEDED' } }],
      [PUBLISH]: [{ status: 403, body: { error: { message: 'denied' } } }],
    });
    await expect(publish().done).rejects.toThrow(
      `POST ${PUBLISH}: 403 {"error":{"message":"denied"}}`,
    );
  });
});
