// The game's events in its chat: lila's server writes them in English whatever the
// player's language (round's Messenger translates with the default language), so each
// is known by that text, with the `i18n.site` key that says it in the page's language.

type ChatTopic = 'rematch' | 'draw' | 'takeback' | 'time';
type ChatTone = 'offer' | 'accept' | 'decline' | 'cancel';

export interface ChatEvent {
  readonly topic: ChatTopic;
  readonly tone: ChatTone;
  /** Its `i18n.site` key; none for the clock's, which lila never translates. */
  readonly key: string | null;
}

const event = (topic: ChatTopic, tone: ChatTone, key: string | null): ChatEvent => ({
  topic,
  tone,
  key,
});

const EVENTS: ReadonlyMap<string, ChatEvent> = new Map([
  ['Rematch offer sent', event('rematch', 'offer', 'rematchOfferSent')],
  ['Rematch offer accepted', event('rematch', 'accept', 'rematchOfferAccepted')],
  ['Rematch offer declined', event('rematch', 'decline', 'rematchOfferDeclined')],
  ['Rematch offer cancelled', event('rematch', 'cancel', 'rematchOfferCanceled')],
  ['Draw offer sent', event('draw', 'offer', 'drawOfferSent')],
  ['White offers draw', event('draw', 'offer', 'whiteOffersDraw')],
  ['Black offers draw', event('draw', 'offer', 'blackOffersDraw')],
  ['Draw offer accepted', event('draw', 'accept', 'drawOfferAccepted')],
  ['White declines draw', event('draw', 'decline', 'whiteDeclinesDraw')],
  ['Black declines draw', event('draw', 'decline', 'blackDeclinesDraw')],
  ['Takeback sent', event('takeback', 'offer', 'takebackPropositionSent')],
  ['White proposes takeback', event('takeback', 'offer', 'whiteProposesTakeback')],
  ['Black proposes takeback', event('takeback', 'offer', 'blackProposesTakeback')],
  ['White accepts takeback', event('takeback', 'accept', 'whiteAcceptsTakeback')],
  ['Black accepts takeback', event('takeback', 'accept', 'blackAcceptsTakeback')],
  ['White declines takeback', event('takeback', 'decline', 'whiteDeclinesTakeback')],
  ['Black declines takeback', event('takeback', 'decline', 'blackDeclinesTakeback')],
  ['White cancels takeback', event('takeback', 'cancel', 'whiteCancelsTakeback')],
  ['Black cancels takeback', event('takeback', 'cancel', 'blackCancelsTakeback')],
]);

// "white + 15 seconds", "black gets more time": the clock's, written by lila as such.
const MORE_TIME = /^(?:white|black) (?:\+ \d+ seconds|gets more time)$/;
const TIME_EVENT = event('time', 'offer', null);

/** Who made the offer a line reports, when the page can tell. */
export type Offerer = 'me' | 'opponent';

/**
 * The `i18n.site` key that says an event in the page's language. lila writes "Rematch offer
 * sent" to both players, whoever sent it: the opponent's offer gets the words Lichess's
 * rematch button has for it.
 */
export function eventKey(found: ChatEvent, offerer: Offerer | null): string | null {
  const theirRematch =
    found.topic === 'rematch' && found.tone === 'offer' && offerer === 'opponent';
  return theirRematch ? 'yourOpponentWantsToPlayANewGameWithYou' : found.key;
}

/** The event a system line of the chat reports, if it's one of the game's. */
export function chatEvent(text: string): ChatEvent | null {
  const trimmed = text.trim();
  return EVENTS.get(trimmed) ?? (MORE_TIME.test(trimmed) ? TIME_EVENT : null);
}
