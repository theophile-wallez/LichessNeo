import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod/mini';
import { authorize } from './google-auth.ts';
import { fetchJson, PublishError } from './http.ts';

// Sends the store zip to the Chrome Web Store and submits it for review, with
// the store's API v2, or only checks that it has no version in review.

export const ITEM_ID = 'diklhheikbkkodchopfhidgjkdjdjpla';
export const API = 'https://chromewebstore.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const UPLOAD_CHECKS = 60;
const UPLOAD_CHECK_INTERVAL_MS = 5000;

const ChannelsSchema = z.optional(z.array(z.object({ crxVersion: z.optional(z.string()) })));

const StatusSchema = z.object({
  publishedItemRevisionStatus: z.optional(z.object({ distributionChannels: ChannelsSchema })),
  submittedItemRevisionStatus: z.optional(
    z.object({ state: z.optional(z.string()), distributionChannels: ChannelsSchema }),
  ),
  lastAsyncUploadState: z.optional(z.string()),
});

// Loose, so a failed upload is reported with everything the store said.
const UploadSchema = z.looseObject({
  uploadState: z.optional(z.string()),
  crxVersion: z.optional(z.string()),
});

const PublishSchema = z.object({
  state: z.optional(z.string()),
  warningInfo: z.optional(
    z.object({
      warnings: z.optional(
        z.array(z.object({ reason: z.optional(z.string()), description: z.optional(z.string()) })),
      ),
    }),
  ),
});

type Channels = z.infer<typeof ChannelsSchema>;

export interface StoreAccess {
  /** The service account's JSON key. */
  readonly serviceAccount: string;
  readonly publisherId: string;
  readonly log?: (line: string) => void;
}

export interface PublishOptions extends StoreAccess {
  readonly zip: Uint8Array;
  readonly version: string;
  readonly sleep?: (ms: number) => Promise<void>;
}

interface Session {
  readonly item: string;
  readonly auth: Record<string, string>;
}

// An empty version means no version, as in the store's dashboard.
function channelVersion(channels: Channels): string | undefined {
  const version = channels?.[0]?.crxVersion;
  return version === '' ? undefined : version;
}

const fetchStatus = ({ item, auth }: Session): Promise<z.infer<typeof StatusSchema>> =>
  fetchJson(`${API}/v2/${item}:fetchStatus`, StatusSchema, { headers: auth });

// The store reviews one submission at a time: say so rather than have the
// upload fail on it.
async function checkNothingInReview(session: Session, log: (line: string) => void): Promise<void> {
  const status = await fetchStatus(session);
  const live = channelVersion(status.publishedItemRevisionStatus?.distributionChannels);
  log(`On the store: ${live ?? 'nothing yet'}.`);
  const pending = status.submittedItemRevisionStatus;
  if (pending?.state !== 'PENDING_REVIEW') return;
  const inReview = channelVersion(pending.distributionChannels) ?? 'a version';
  throw new PublishError(
    `${inReview} is still in review: wait for it, or cancel it in the dashboard, then run this again`,
  );
}

async function upload(
  session: Session,
  { zip, version, sleep = delay }: PublishOptions,
): Promise<void> {
  const uploaded = await fetchJson(`${API}/upload/v2/${session.item}:upload`, UploadSchema, {
    method: 'POST',
    headers: session.auth,
    body: zip,
  });
  let state = uploaded.uploadState;
  // A big package is processed after the request returns.
  for (let i = 0; i < UPLOAD_CHECKS && /IN_PROGRESS/.test(state ?? ''); i++) {
    await sleep(UPLOAD_CHECK_INTERVAL_MS);
    state = (await fetchStatus(session)).lastAsyncUploadState;
  }
  if (state !== 'SUCCEEDED')
    throw new PublishError(`the upload ended as ${String(state)}: ${JSON.stringify(uploaded)}`);
  const read = uploaded.crxVersion;
  if (read !== undefined && read !== '' && read !== version)
    throw new PublishError(`the store read version ${read} in the zip, not ${version}`);
}

// Published as soon as it's approved, with the visibility set in the dashboard.
async function submit(
  session: Session,
  version: string,
  log: (line: string) => void,
): Promise<void> {
  const published = await fetchJson(`${API}/v2/${session.item}:publish`, PublishSchema, {
    method: 'POST',
    headers: { ...session.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }),
  });
  for (const warning of published.warningInfo?.warnings ?? [])
    log(`::warning::${String(warning.reason)}: ${String(warning.description)}`);
  log(`${version} submitted: ${String(published.state)}.`);
}

const openSession = async ({ serviceAccount, publisherId }: StoreAccess): Promise<Session> => ({
  item: `publishers/${publisherId}/items/${ITEM_ID}`,
  auth: await authorize(serviceAccount, SCOPE),
});

/** Fails if a version is in review, as the store would refuse the next one. */
export async function checkChromeWebStore(access: StoreAccess): Promise<void> {
  const log = access.log ?? console.log;
  await checkNothingInReview(await openSession(access), log);
  log('Nothing in review: a new version can be sent.');
}

export async function publishToChromeWebStore(options: PublishOptions): Promise<void> {
  const log = options.log ?? console.log;
  const session = await openSession(options);
  await checkNothingInReview(session, log);
  log(`Sending ${options.version}.`);
  await upload(session, options);
  await submit(session, options.version, log);
}
