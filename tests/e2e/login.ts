import { parseArgs } from 'node:util';
import { launchWithExtension } from './support/extension.ts';
import { hasSession, SESSION_PROFILE, signedInUser } from './support/session.ts';

// Signs the kept profile (support/session.ts) in to lichess.org, once.
//   pnpm lichess:login              a window opens on Lichess's sign-in page:
//                                   sign in there, it closes once you're in.
//   pnpm lichess:login --cookie V   no window: V is the `lila2` cookie of a
//                                   browser already signed in (DevTools,
//                                   Application, Cookies), for when the
//                                   sign-in page's bot check won't pass.
//   pnpm lichess:login --check      tells who the profile is signed in as.

const SIGN_IN_WAIT_MS = 10 * 60 * 1000;

const { values } = parseArgs({
  options: { cookie: { type: 'string' }, check: { type: 'boolean' } },
});

if (values.check === true && !hasSession()) {
  console.log('Not signed in: no profile yet.');
  process.exit(1);
}

const headless = values.cookie !== undefined || values.check === true;
const context = await launchWithExtension({
  baseURL: 'https://lichess.org',
  viewport: { width: 1366, height: 900 },
  colorScheme: 'dark',
  reducedMotion: null,
  userDataDir: SESSION_PROFILE,
  headless,
});
const page = context.pages()[0] ?? (await context.newPage());

if (values.cookie !== undefined) {
  await context.addCookies([
    {
      name: 'lila2',
      value: values.cookie,
      domain: '.lichess.org',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
}

if (headless) await page.goto('/');
else {
  await page.goto('/login');
  await page.waitForSelector('#user_tag', { timeout: SIGN_IN_WAIT_MS });
}

const user = await signedInUser(page);
await context.close();
console.log(user ? `Signed in as ${user} (${SESSION_PROFILE}).` : 'Not signed in.');
process.exitCode = user ? 0 : 1;
