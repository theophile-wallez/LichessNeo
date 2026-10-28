import { z } from 'zod/mini';
import en from '#locales/en/messages.json' with { type: 'json' };
import fr from '#locales/fr/messages.json' with { type: 'json' };

// The extension's messages (public/_locales) as bundled, for a page whose
// language isn't the one chrome.i18n picked from the browser's.

export type Language = 'en' | 'fr';

const MessagesSchema = z.record(z.string(), z.object({ message: z.string() }));

type Messages = z.infer<typeof MessagesSchema>;

const tables = new Map<Language, Messages>();

function table(language: Language): Messages {
  let messages = tables.get(language);
  if (!messages) {
    messages = MessagesSchema.parse(language === 'fr' ? fr : en);
    tables.set(language, messages);
  }
  return messages;
}

/** A message in `language`, else in English, `$1`… filled in; empty if there's none. */
export function bundledMessage(
  language: Language,
  name: string,
  substitutions: readonly string[],
): string {
  const text = table(language)[name]?.message ?? table('en')[name]?.message ?? '';
  return text.replace(/\$(\d)/g, (_, index: string) => substitutions[Number(index) - 1] ?? '');
}
