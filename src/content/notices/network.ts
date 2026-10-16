import Loading03Icon from '@hugeicons/core-free-icons/Loading03Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import WifiDisconnected02Icon from '@hugeicons/core-free-icons/WifiDisconnected02Icon';
import type { Toaster } from './toaster.ts';

// The connection's toast. Lichess's socket puts `offline` on <body> once it gives up waiting,
// and its words in `#network-status`: "Reconnecting", or "Offline" when the browser has no
// network. Once back it only swaps the class, so the toast says so in our words.

const ID = 'network';
const BACK_MS = 2500;

export function createNetworkSync(toaster: Toaster, backOnline: string): () => void {
  let lost = false;
  let closed = false;
  return () => {
    if (document.body.classList.contains('offline')) {
      const words = document.getElementById('network-status')?.textContent.trim();
      if (!words || closed) return;
      lost = true;
      const reachable = navigator.onLine;
      toaster.show(ID, {
        kind: reachable ? 'loading' : 'error',
        icon: reachable ? Loading03Icon : WifiDisconnected02Icon,
        title: words,
        onClose: () => (closed = true),
      });
    } else if (lost) {
      lost = false;
      closed = false;
      toaster.show(ID, { kind: 'success', icon: Tick02Icon, title: backOnline, duration: BACK_MS });
    }
  };
}
