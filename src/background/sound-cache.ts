// The sounds used to be downloaded and cached here; installs that had the
// cache drop it.

const OLD_CACHE_KEY = 'sounds:v1';

export function dropOldSoundCache(): void {
  void chrome.storage.local.remove(OLD_CACHE_KEY);
}
