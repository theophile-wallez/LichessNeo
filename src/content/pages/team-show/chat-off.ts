import { queryOne, setData } from '#shared/dom.ts';

// A team's chat can be turned off by its toggle, in its title: Lichess then empties it and
// leaves it its height. Its state on the chat lets the stylesheet fold it to its title and
// give the room to the recent members above it (styles/team-show/chat.css).

export function syncChatOff(): void {
  const chat = queryOne(document, 'main.team-show section.mchat', HTMLElement);
  const toggle = chat && queryOne(chat, '.mchat__tab.discussion input', HTMLInputElement);
  if (chat) setData(chat, 'lnExtOff', toggle && !toggle.checked ? '' : null);
}
