import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { launchWithExtension } from './support/extension.ts';
import { hasSession, SESSION_PROFILE, signedInUser } from './support/session.ts';

// Signs the kept profile (support/session.ts) in to lichess.org, once.
//   pnpm lichess:login              Playwright's Chromium opens on Lichess's
//                                   sign-in page, as a plain browser: sign in,
//                                   then close the window.
//   pnpm lichess:login --cookie V   no window: V is the `lila2` cookie of a
//                                   browser already signed in (DevTools,
//                                   Application, Cookies).
//   pnpm lichess:login --check      tells who the profile is signed in as.
// The sign-in page's bot check fails a browser Playwright drives, so the
// window is the browser on its own; the profile is read back once it's closed.

const { values } = parseArgs({
  options: { cookie: { type: 'string' }, check: { type: 'boolean' } },
});

// Playwright runs Chromium with a mock keychain: the profile's cookies are
// encrypted with it, so the plain browser must use it too to share them.
async function signInByHand(): Promise<void> {
  const browser = spawn(
    chromium.executablePath(),
    [
      `--user-data-dir=${SESSION_PROFILE}`,
      '--use-mock-keychain',
      '--no-first-run',
      '--no-default-browser-check',
      'https://lichess.org/login',
    ],
    { stdio: 'ignore' },
  );
  console.log('Sign in to Lichess in the window that opened, then close it.');
  await once(browser, 'exit');
}

async function readSession(cookie: string | undefined): Promise<string | null> {
  const context = await launchWithExtension({
    baseURL: 'https://lichess.org',
    viewport: { width: 1366, height: 900 },
    colorScheme: 'dark',
    reducedMotion: null,
    userDataDir: SESSION_PROFILE,
  });
  if (cookie !== undefined) {
    await context.addCookies([
      {
        name: 'lila2',
        value: cookie,
        domain: '.lichess.org',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ]);
  }
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto('/');
  const user = await signedInUser(page);
  await context.close();
  return user;
}

if (values.check === true && !hasSession()) {
  console.log('Not signed in: no profile yet.');
  process.exit(1);
}
if (values.cookie === undefined && values.check !== true) await signInByHand();
const user = await readSession(values.cookie);
console.log(user ? `Signed in as ${user} (${SESSION_PROFILE}).` : 'Not signed in.');
process.exitCode = user ? 0 : 1;
