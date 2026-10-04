import { DEV_BUILD } from '#shared/build-mode.ts';
import { startDevReload } from './dev-reload.ts';
import { servePackDownloads } from './packs.ts';
import { dropOldSoundCache } from './sound-cache.ts';

// The background worker: a service worker in Chrome, background scripts in Firefox.

chrome.runtime.onInstalled.addListener(dropOldSoundCache);
servePackDownloads();
if (DEV_BUILD) startDevReload();
