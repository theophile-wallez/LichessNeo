import { shownCoach } from '#shared/coach.ts';
import { createElement, isParsing, onDomReady, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { html, setHtml } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { liveMascot } from '#content/puzzle-dashboard/coach.ts';
import { overview } from '#content/puzzle-dashboard/data.ts';
import { fetchDashboard, isOwn } from '#content/puzzle-dashboard/page.ts';
import { coachWord, type Week } from './coach-word.ts';
import { readSessions } from './read.ts';
import { decorateSessions } from './sessions.ts';
import { heroMarkup, shelfMarkup } from './view.ts';
import { bestRun, toRetry } from './week.ts';

// The puzzle history (/training/history): over Lichess's sessions, the
// player's mascot on the last 7 days (Lichess's dashboard API, whose replay
// link retries the week's misses) and the puzzles missed and not solved
// since; each session a card with its score, under a heading per day.

const PAGE = /\/training\/history\/?$/;
const BOX = 'main .page-menu__content';
const WEEK_DAYS = 7;
const DAY_MS = 86_400_000;

async function fetchWeek(): Promise<Week | null> {
  const data = await fetchDashboard(WEEK_DAYS);
  if (!data) return null;
  const { puzzles, firstWins, toReplay } = overview(data);
  return { puzzles, firstWins, toReplay };
}

function addHead(box: HTMLElement, week: Week | null): void {
  const title = queryOne(box, ':scope > .box__top', HTMLElement);
  if (!title) return;
  const now = new Date();
  const sessions = readSessions(box);
  const retry = toRetry(sessions);
  const coachId = shownCoach();
  const word =
    week &&
    coachWord(
      week,
      bestRun(sessions, new Date(now.getTime() - WEEK_DAYS * DAY_MS)),
      now,
      pageLocale(),
    );
  const head = createElement('div', { className: 'ln-ext-phist' });
  setHtml(
    head,
    html`${week && word && heroMarkup(week, word, coachId)}${retry.length > 0 && shelfMarkup(retry)}`,
  );
  if (!head.firstElementChild) return;
  title.after(head);
  const mascot = queryOne(head, '.ln-ext-pdash__mascot', HTMLElement);
  if (mascot && word && coachId !== null) liveMascot(mascot, coachId, () => word.mood);
}

function start(): void {
  if (!PAGE.test(location.pathname)) return;
  const asked = fetchWeek().catch(() => null);
  onDomReady(() => {
    const box = queryOne(document, BOX, HTMLElement);
    if (!box || !queryOne(box, '.puzzle-history', HTMLElement)) return;
    decorateSessions(box, new Date());
    // Only the player's own history: the API has no one else's week.
    if (isOwn(location.href)) void asked.then(week => addHead(box, week));
  });
  // A session still parsing would be counted short.
  onEveryTick('puzzle history', () => {
    if (!isParsing()) decorateSessions(document, new Date());
  });
}

export const puzzleHistory: Feature = { name: 'puzzle history', start };
