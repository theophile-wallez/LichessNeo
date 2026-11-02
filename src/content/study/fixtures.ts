// A study's page as Lichess serves it, cut to what the study's features read.

export interface StudyOptions {
  readonly active?: number;
  readonly players?: readonly [string, string];
  readonly result?: boolean;
  /** A gamebook's underboard has no buttons. */
  readonly buttons?: boolean;
  readonly chapters?: number;
  /** Lichess opens a study of one chapter on its members. */
  readonly tab?: 'chapters' | 'members';
  /** Whether the viewer can edit the study, which gives the list its button for a new chapter. */
  readonly editable?: boolean;
}

const CHAPTERS = ['Introduction', 'Main line', 'Sidelines'];

const player = (side: string, name: string, result: boolean): string =>
  `<div class="study__player study__player-${side}">` +
  `${result ? '<span class="result">1</span>' : ''}<div class="info">${name}</div></div>`;

export function studyMarkup(options: StudyOptions = {}): string {
  const { active = 0, players = ['', ''], result = false, buttons = true } = options;
  const { chapters = CHAPTERS.length, tab = 'chapters', editable = false } = options;
  const list = CHAPTERS.slice(0, chapters)
    .map((title, i) => `<button class="${i === active ? 'active' : ''}"><h3>${title}</h3></button>`)
    .join('');
  const add = editable ? '<button class="add"><h3>Add a new chapter</h3></button>' : '';
  const content =
    tab === 'chapters'
      ? `<div class="study__chapters"><div class="study-list">${list}</div>${add}</div>`
      : '<div class="study__members"></div>';
  const tabClass = (name: string): string => (name === tab ? `${name} active` : name);
  return (
    '<main class="analyse"><div class="analyse__side"><div class="study__side">' +
    `<div class="tabs-horiz"><button class="${tabClass('chapters')}">${chapters} Chapters</button>` +
    `<button class="${tabClass('members')}">2 Members</button></div>` +
    `${content}</div></div>` +
    player('top', players[0], result) +
    player('bot', players[1], result) +
    '<div class="analyse__underboard"><div class="study__metadata"><h2>' +
    '<span class="name"><img class="icon-flair" src="https://lichess1.org/flair/a.webp">' +
    `Caro-Kann: ${CHAPTERS[active] ?? ''}</span>` +
    '<span class="liking text liked" title="Like">42</span></h2></div>' +
    (buttons ? '<div class="study__buttons"><span class="share" title="Share"></span></div>' : '') +
    '</div></main>'
  );
}
