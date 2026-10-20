import { describe, expect, it } from 'vitest';
import type { Piece } from '#shared/chess/index.ts';
import { en, english } from './en.ts';
import { fr, french } from './fr.ts';

// The coach's sentences on what a line wins, the tactic that wins it, and a
// quiet move's plan, in both languages.

const black = (role: Piece['role']): Piece => ({ role, color: 'black' });
const white = (role: Piece['role']): Piece => ({ role, color: 'white' });

describe('the material won', () => {
  it('names pieces of up to two kinds, and what they cost', () => {
    const cases = [
      { won: [black('knight')], lost: [] },
      { won: [black('pawn'), black('pawn')], lost: [] },
      { won: [black('rook'), black('pawn')], lost: [] },
      { won: [black('queen')], lost: [white('rook')] },
      { won: [black('rook')], lost: [white('bishop')] },
    ];
    expect(cases.map(en.facts.material)).toEqual([
      'a [[p:bn]]knight',
      'two [[p:bp]]pawns',
      'a [[p:br]]rook and a [[p:bp]]pawn',
      'a [[p:bq]]queen for a [[p:wr]]rook',
      'the exchange',
    ]);
    expect(cases.map(fr.facts.material)).toEqual([
      'un [[p:bn]]cavalier',
      'deux [[p:bp]]pions',
      'une [[p:br]]tour et un [[p:bp]]pion',
      'une [[p:bq]]dame contre une [[p:wr]]tour',
      'la qualité',
    ]);
  });

  it('says nothing of three kinds of pieces', () => {
    const won = [black('rook'), black('knight'), black('pawn')];
    expect(en.facts.material({ won, lost: [] })).toBeNull();
    expect(fr.facts.material({ won, lost: [] })).toBeNull();
  });
});

describe('the tactic', () => {
  const MOVE = '16. [[m:w:Qc7+]]';

  it('names a fork, two of a kind as a pair', () => {
    expect(en.facts.motif('fork', MOVE, [black('king'), black('rook')])).toContain(
      `${MOVE} forks the [[p:bk]]king and the [[p:br]]rook.`,
    );
    expect(en.facts.motif('fork', MOVE, [black('rook'), black('rook')])).toContain(
      `${MOVE} forks both [[p:br]]rooks.`,
    );
    expect(fr.facts.motif('fork', MOVE, [black('rook'), black('rook')])).toContain(
      `${MOVE} fait une fourchette sur les deux [[p:br]]tours.`,
    );
    expect(french('white').facts.motif('fork', MOVE, [black('rook'), black('rook')])).toContain(
      `${MOVE} fait une fourchette sur les deux [[p:br]]tours adverses.`,
    );
  });

  it('says what a pinned piece is pinned to, agreed in French', () => {
    expect(en.facts.motif('pin', MOVE, [black('queen'), black('king')])).toContain(
      'The [[p:bq]]queen is pinned to the [[p:bk]]king.',
    );
    expect(fr.facts.motif('pin', MOVE, [black('queen'), black('king')])).toContain(
      'La [[p:bq]]dame est clouée au [[p:bk]]roi.',
    );
  });

  it('speaks of the viewer’s own pieces as theirs', () => {
    expect(english('black').facts.motif('trappedPiece', MOVE, [black('bishop')])).toContain(
      'Your [[p:bb]]bishop is trapped: it has nowhere to go.',
    );
    expect(french('black').facts.motif('trappedPiece', MOVE, [black('bishop')])).toContain(
      'Ton [[p:bb]]fou est pris au piège : il n’a plus de case.',
    );
  });

  it('names the piece a pin holds without saying whose it is again', () => {
    expect(english('white').facts.motif('pin', MOVE, [black('queen'), black('king')])).toContain(
      'The opponent’s [[p:bq]]queen is pinned to the [[p:bk]]king.',
    );
    expect(french('black').facts.motif('pin', MOVE, [black('queen'), black('king')])).toContain(
      'Ta [[p:bq]]dame est clouée au [[p:bk]]roi.',
    );
  });

  it('needs the piece a check wins to name it', () => {
    expect(en.facts.motif('doubleCheck', MOVE, [black('king')])).toBeNull();
    expect(fr.facts.motif('discoveredCheck', MOVE, [black('king')])).toBeNull();
  });
});

describe('a quiet move’s plan', () => {
  const discovery = {
    kind: 'discovery',
    slider: white('queen'),
    screen: white('knight'),
    target: black('king'),
  } as const;

  it('says a discovery set up, a check or an attack', () => {
    expect(
      english('white').facts.discovery(white('queen'), white('knight'), black('king')),
    ).toContain(
      'Your [[p:wq]]queen lines up behind your [[p:wn]]knight on the opponent’s [[p:bk]]king: once your [[p:wn]]knight moves, that’s a discovered check.',
    );
    expect(fr.facts.discovery(white('bishop'), white('rook'), black('queen'))).toContain(
      'Le [[p:wb]]fou se place derrière la [[p:wr]]tour, braqué sur la [[p:bq]]dame : dès qu’elle bougera, ce sera une attaque à la découverte.',
    );
  });

  it('says why a move was played, a discovery and two plans at once', () => {
    const queen = { ...discovery, target: black('queen') };
    const both = {
      kind: 'both',
      first: { kind: 'guards', piece: white('knight') },
      second: discovery,
    } as const;
    expect([discovery, queen, both].map(reason => english('white').facts.why(reason))).toEqual([
      'setting up a discovered check',
      'setting up a discovered attack on the opponent’s [[p:bq]]queen',
      'defending your [[p:wn]]knight and setting up a discovered check',
    ]);
    expect([discovery, queen, both].map(reason => french('white').facts.why(reason))).toEqual([
      'préparait un échec à la découverte',
      'préparait une attaque à la découverte sur la [[p:bq]]dame adverse',
      'protégeait ton [[p:wn]]cavalier et préparait un échec à la découverte',
    ]);
    expect(fr.facts.why(both, true)).toBe(
      'protège le [[p:wn]]cavalier et prépare un échec à la découverte',
    );
  });

  it('says a double threat, mate and a piece at once', () => {
    const threat = { kind: 'doubleThreat', target: black('rook') } as const;
    expect(english('white').facts.why(threat)).toBe(
      'threatening mate and the opponent’s [[p:br]]rook at once, and only one can be saved',
    );
    expect(french('white').facts.why(threat)).toBe(
      'menaçait à la fois le mat et la [[p:br]]tour adverse, et un seul des deux pouvait être paré',
    );
  });

  it('says a pin without naming twice whose the pieces are', () => {
    expect(english('white').facts.pins(black('knight'), black('king'))).toContain(
      'The opponent’s [[p:bn]]knight is pinned to the [[p:bk]]king.',
    );
    expect(french('white').facts.pins(black('knight'), black('king'))).toContain(
      'Le [[p:bn]]cavalier adverse est cloué sur le [[p:bk]]roi.',
    );
    expect(
      french('black').facts.why({ kind: 'pins', piece: black('knight'), behind: black('king') }),
    ).toBe('clouait ton [[p:bn]]cavalier sur le [[p:bk]]roi');
  });

  it('says a battery made or made ready, a file contested, a pawn left undefended', () => {
    const reasons = [
      { kind: 'fileBattery', mover: white('rook'), partner: white('queen'), halfOpen: false },
      {
        kind: 'diagonalBattery',
        mover: white('queen'),
        partner: white('bishop'),
        target: black('pawn'),
      },
      { kind: 'openFile', halfOpen: true, contested: true },
      {
        kind: 'both',
        first: { kind: 'preparesBattery', partner: white('rook'), halfOpen: false },
        second: { kind: 'attacksPawn', piece: black('pawn'), square: 'a7' },
      },
    ] as const;
    expect(reasons.map(reason => english('white').facts.why(reason))).toEqual([
      'forming a battery with your [[p:wq]]queen on the open file',
      'forming a battery with your [[p:wb]]bishop, aimed at the opponent’s [[p:bp]]pawn',
      'contesting the half-open file',
      'preparing a battery with your [[p:wr]]rook on the open file and attacking the undefended [[p:bp]]pawn on [[s:a7]]',
    ]);
    expect(reasons.map(reason => french('white').facts.why(reason))).toEqual([
      'formait une batterie avec ta [[p:wq]]dame sur la colonne ouverte',
      'formait une batterie avec ton [[p:wb]]fou, braquée sur le [[p:bp]]pion adverse',
      'contestait la colonne semi-ouverte',
      'préparait une batterie avec ta [[p:wr]]tour sur la colonne ouverte et attaquait le [[p:bp]]pion [[s:a7]], que rien ne défendait',
    ]);
    expect(en.facts.attacksPawn(black('pawn'), 'a7')).toContain(
      'That attacks the undefended [[p:bp]]pawn on [[s:a7]].',
    );
    expect(fr.facts.attacksPawn(black('pawn'), 'a7')).toContain(
      'Le [[p:bp]]pion [[s:a7]] est en prise : rien ne le défend.',
    );
    expect(en.facts.openFile(false, true)).toContain('That contests the open file.');
    expect(fr.facts.openFile(false, true)).toContain('Ça conteste la colonne ouverte.');
  });

  it('is said in both languages', () => {
    expect(en.facts.develops(white('knight'))).toContain('The [[p:wn]]knight comes into play.');
    expect(fr.facts.develops(white('knight'))).toContain('Le [[p:wn]]cavalier entre en jeu.');
    expect(en.facts.openFile(true, false)).toContain(
      'The rook takes the half-open file, where it belongs.',
    );
    expect(fr.facts.passedPawn(true)).toContain('Un pion passé est né.');
  });
});

describe('a line’s gain', () => {
  const LINE = '13. [[m:w:Qe4]] [[m:b:g6]] 14. [[m:w:Qxa8]]';

  it('says who wins what after the line', () => {
    const gain = { material: 'a rook', line: LINE, moves: 2 };
    expect(en.facts.losesMaterial('white', gain, false)[0]).toBe(
      `White wins a rook in two moves: ${LINE}.`,
    );
    expect(en.facts.losesMaterial('white', { ...gain, moves: 1 }, false)[0]).toBe(
      `White wins a rook on the next move: ${LINE}.`,
    );
    expect(en.facts.winsAlong({ ...gain, moves: 1 })[0]).toBe(
      `This wins a rook right away: ${LINE}.`,
    );
    expect(fr.facts.winsAlong({ ...gain, material: 'une tour', moves: 1 })[0]).toBe(
      `De quoi gagner une tour tout de suite : ${LINE}.`,
    );
    expect(fr.facts.wouldHaveWon('black', { ...gain, material: 'une tour' })[0]).toBe(
      `Le mieux était de gagner une tour en deux coups : ${LINE}.`,
    );
  });
});
