import { parseJson } from '#shared/json.ts';
import { type Answer, AnswerSchema } from './schema.ts';

// Lichess POSTs a question to /insights/data/<user> and draws the answer
// straight into a canvas: its numbers reach the DOM only as formatted text in
// the table beside it, which a locale writes its own way. So we read the
// response. The page world runs at document_start, before the first request,
// and the page asks again on every question, which redraws our chart.

const DATA_PATH = '/insights/data/';

const urlOf = (input: RequestInfo | URL): string =>
  input instanceof Request ? input.url : String(input);

/** Calls `onAnswer` with the answer to every question the page asks. */
export function captureAnswers(onAnswer: (answer: Answer) => void): void {
  const fetched = window.fetch;
  const read = async (response: Response): Promise<void> => {
    const answer = parseJson(await response.text(), AnswerSchema);
    if (answer) onAnswer(answer);
  };
  window.fetch = async (input, init) => {
    const response = await fetched(input, init);
    // A clone, so the page still reads the body it asked for.
    if (urlOf(input).includes(DATA_PATH)) void read(response.clone()).catch(() => undefined);
    return response;
  };
}
