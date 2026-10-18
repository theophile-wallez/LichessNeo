import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon';
import { userInHref } from '#shared/avatar.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { isSignedInUser } from '#shared/own-avatar.ts';
import { message } from '#content/platform/runtime.ts';
import { settingsUrl } from '#content/settings/address.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// On the user's own profile, their avatar (the header's `::before`,
// styles/profile/hero.css) leads to the settings' Profile customization page, to pick another.

const HEADER = '.user-show > .user-show__header';
const LINK = 'ln-ext-avatar-edit';

function buildLink(): HTMLAnchorElement {
  const label = message('avatarEdit');
  const link = createElement('a', {
    className: LINK,
    attrs: { href: settingsUrl('profile'), title: label, 'aria-label': label },
  });
  setHtml(link, hugeicon(PencilEdit02Icon));
  return link;
}

export function syncAvatarLink(): void {
  const header = queryOne(document, HEADER, HTMLElement);
  if (!header) return;
  const user = userInHref(queryOne(header, 'h1 [data-href]', HTMLElement)?.dataset.href);
  const own = user !== undefined && isSignedInUser(user);
  const link = queryOne(header, `:scope > .${LINK}`, HTMLElement);
  if (own && !link) header.append(buildLink());
  else if (!own && link) link.remove();
}

export const profileAvatarLink: Feature = {
  name: 'profile avatar link',
  start: () => onEveryTick('profile avatar link', syncAvatarLink),
};
