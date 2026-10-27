import { describe, expect, it } from 'vitest';
import { namesPlayers, readChapters, studyName } from './chapters.ts';

function studyPage(list: string): HTMLElement {
  document.body.innerHTML =
    '<main class="analyse"><div class="analyse__side"><div class="study__side">' +
    `<div class="study__chapters"><div class="study-list">${list}</div></div></div></div></main>`;
  const page = document.querySelector('main');
  if (!(page instanceof HTMLElement)) throw new Error('no page');
  return page;
}

describe('a study’s chapters', () => {
  it('are read from Lichess’s list, with the one on the board', () => {
    const page = studyPage(
      '<button><h3>Introduction</h3></button>' +
        '<button class="active"><h3> Main line </h3></button>' +
        '<button><h3>Sidelines</h3></button>',
    );
    const chapters = readChapters(page);
    expect(chapters?.buttons).toHaveLength(3);
    expect(chapters?.index).toBe(1);
    expect(chapters?.title).toBe('Main line');
  });

  it('are none while no chapter is on the board', () => {
    expect(readChapters(studyPage('<button><h3>Introduction</h3></button>'))).toBeNull();
  });
});

describe('a study’s name', () => {
  it('drops the chapter Lichess adds to it', () => {
    expect(studyName('Caro-Kann: Introduction', 'Introduction')).toBe('Caro-Kann');
  });

  it('stays whole when it doesn’t end with the chapter', () => {
    expect(studyName('Caro-Kann', 'Introduction')).toBe('Caro-Kann');
    expect(studyName('Caro-Kann', '')).toBe('Caro-Kann');
  });
});

describe('a chapter’s player bars', () => {
  it('name players when the game has a result', () => {
    expect(namesPlayers(['Kasparov', 'Anand'], 'Kasparov - Anand', true)).toBe(true);
  });

  it('name players the title doesn’t hold', () => {
    expect(namesPlayers(['Kasparov', 'Anand'], 'A sharp line', false)).toBe(true);
  });

  it('name nobody when they hold parts of the title, or nothing', () => {
    expect(
      namesPlayers(['Introduction', 'The Caro-Kann'], 'Introduction: The Caro-Kann', false),
    ).toBe(false);
    expect(namesPlayers(['', ''], 'Introduction', true)).toBe(false);
  });
});
