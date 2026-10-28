import { z } from 'zod/mini';

// The chat's quick replies, the user's own in place of Lichess's (settings' Play page): one
// list for a game's start, one for its end, as lila's ui/lib/src/chat/preset.ts groups them.

export const REPLY_GROUPS = ['start', 'end'] as const;

export type ReplyGroup = (typeof REPLY_GROUPS)[number];

/** As many as one line holds. */
export const MAX_REPLIES = 5;

/** lila refuses a longer chat line. */
export const MAX_REPLY_LENGTH = 140;

/** Lichess's replies, by their key (the text of its chips) and their words, which it sends. */
const LICHESS_PRESETS: Readonly<Record<ReplyGroup, ReadonlyMap<string, string>>> = {
  start: new Map([
    ['hi', 'Hello'],
    ['gl', 'Good luck'],
    ['hf', 'Have fun!'],
    ['u2', 'You too!'],
  ]),
  end: new Map([
    ['gg', 'Good game'],
    ['wp', 'Well played'],
    ['ty', 'Thank you'],
    ['gtg', "I've got to go"],
    ['bye', 'Bye!'],
  ]),
};

/** Lichess's own replies of `group`, in its order. */
export const lichessReplies = (group: ReplyGroup): string[] => [...LICHESS_PRESETS[group].values()];

const ReplySchema = z.string().check(z.minLength(1), z.maxLength(MAX_REPLY_LENGTH));

const RepliesSchema = z.array(ReplySchema).check(z.maxLength(MAX_REPLIES));

export const ChatRepliesSchema = z.object({
  start: z.catch(RepliesSchema, lichessReplies('start')),
  end: z.catch(RepliesSchema, lichessReplies('end')),
});

export type ChatReplies = z.infer<typeof ChatRepliesSchema>;

export const DEFAULT_REPLIES: ChatReplies = {
  start: lichessReplies('start'),
  end: lichessReplies('end'),
};

/** The group Lichess's chips show, told by their keys; null for none. */
export function groupOf(keys: readonly string[]): ReplyGroup | null {
  const key = keys[0];
  return REPLY_GROUPS.find(group => key !== undefined && LICHESS_PRESETS[group].has(key)) ?? null;
}

const replyText = (text: string): string | null => {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_REPLY_LENGTH ? trimmed : null;
};

/** `list` with `text` at its end; null when it can't go in: empty, already there, or full. */
export function withReply(list: readonly string[], text: string): string[] | null {
  const reply = replyText(text);
  if (!reply || list.includes(reply) || list.length >= MAX_REPLIES) return null;
  return [...list, reply];
}

/** `list` with its reply at `index` changed to `text`; null when it can't be. */
export function withEdited(list: readonly string[], index: number, text: string): string[] | null {
  const reply = replyText(text);
  if (!reply || index < 0 || index >= list.length) return null;
  if (list.some((other, at) => at !== index && other === reply)) return null;
  return list.with(index, reply);
}

/** `list` with its reply at `index` moved `by` places. */
export function moved(list: readonly string[], index: number, by: number): string[] {
  const next = [...list];
  const [reply] = next.splice(index, 1);
  if (reply !== undefined) next.splice(Math.max(0, index + by), 0, reply);
  return next;
}
