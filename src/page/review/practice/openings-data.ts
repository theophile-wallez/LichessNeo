// Written by tools/openings/generate.py from lichess-org/chess-openings (CC0):
// edit the script, not this file.

// One opening a line: the side that practices it, its ECO code, its name, its
// moves, the position they reach (a FEN's placement) and the last of them.
export const OPENINGS_TABLE = `
white|C50|Italian Game|e4 e5 Nf3 Nc6 Bc4|r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R|f1c4
white|C60|Ruy Lopez|e4 e5 Nf3 Nc6 Bb5|r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R|f1b5
white|C44|Scotch Game|e4 e5 Nf3 Nc6 d4|r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R|d2d4
white|C25|Vienna Game|e4 e5 Nc3|rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR|b1c3
white|C30|King's Gambit|e4 e5 f4|rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR|f2f4
white|C51|Italian Game: Evans Gambit|e4 e5 Nf3 Nc6 Bc4 Bc5 b4|r1bqk1nr/pppp1ppp/2n5/2b1p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R|b2b4
white|C21|Danish Gambit|e4 e5 d4 exd4 c3|rnbqkbnr/pppp1ppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR|c2c3
white|B22|Sicilian Defense: Alapin Variation|e4 c5 c3|rnbqkbnr/pp1ppppp/8/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR|c2c3
white|B21|Sicilian Defense: Smith-Morra Gambit|e4 c5 d4 cxd4 c3|rnbqkbnr/pp1ppppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR|c2c3
white|D06|Queen's Gambit|d4 d5 c4|rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR|c2c4
white|D02|Queen's Pawn Game: London System|d4 d5 Nf3 Nf6 Bf4|rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R|c1f4
white|E00|Catalan Opening|d4 Nf6 c4 e6 g3|rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR|g2g3
white|A45|Trompowsky Attack|d4 Nf6 Bg5|rnbqkb1r/pppppppp/5n2/6B1/3P4/8/PPP1PPPP/RN1QKBNR|c1g5
white|A10|English Opening|c4|rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR|c2c4
white|A09|Réti Opening|Nf3 d5 c4|rnbqkbnr/ppp1pppp/8/3p4/2P5/5N2/PP1PPPPP/RNBQKB1R|c2c4
white|A07|King's Indian Attack|Nf3 d5 g3|rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPP1P/RNBQKB1R|g2g3
white|A02|Bird Opening|f4|rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR|f2f4
black|B20|Sicilian Defense|e4 c5|rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR|c7c5
black|B90|Sicilian Defense: Najdorf Variation|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6|rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R|a7a6
black|B70|Sicilian Defense: Dragon Variation|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6|rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R|g7g6
black|B32|Sicilian Defense: Accelerated Dragon|e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6|r1bqkbnr/pp1ppp1p/2n3p1/8/3NP3/8/PPP2PPP/RNBQKB1R|g7g6
black|C00|French Defense|e4 e6|rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR|e7e6
black|B10|Caro-Kann Defense|e4 c6|rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR|c7c6
black|B01|Scandinavian Defense|e4 d5|rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR|d7d5
black|B00|Pirc Defense|e4 d6|rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR|d7d6
black|B02|Alekhine Defense|e4 Nf6|rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR|g8f6
black|B06|Modern Defense|e4 g6|rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR|g7g6
black|C42|Petrov's Defense|e4 e5 Nf3 Nf6|rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R|g8f6
black|C41|Philidor Defense|e4 e5 Nf3 d6|rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R|d7d6
black|C55|Italian Game: Two Knights Defense|e4 e5 Nf3 Nc6 Bc4 Nf6|r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R|g8f6
black|C65|Ruy Lopez: Berlin Defense|e4 e5 Nf3 Nc6 Bb5 Nf6|r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R|g8f6
black|D30|Queen's Gambit Declined|d4 d5 c4 e6|rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR|e7e6
black|D20|Queen's Gambit Accepted|d4 d5 c4 dxc4|rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR|d5c4
black|D10|Slav Defense|d4 d5 c4 c6|rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR|c7c6
black|E70|King's Indian Defense: Normal Variation|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6|rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR|d7d6
black|E20|Nimzo-Indian Defense|d4 Nf6 c4 e6 Nc3 Bb4|rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR|f8b4
black|D80|Grünfeld Defense|d4 Nf6 c4 g6 Nc3 d5|rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR|d7d5
black|E12|Queen's Indian Defense|d4 Nf6 c4 e6 Nf3 b6|rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R|b7b6
black|A57|Benko Gambit|d4 Nf6 c4 c5 d5 b5|rnbqkb1r/p2ppppp/5n2/1ppP4/2P5/8/PP2PPPP/RNBQKBNR|b7b5
black|A80|Dutch Defense|d4 f5|rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR|f7f5
`;
