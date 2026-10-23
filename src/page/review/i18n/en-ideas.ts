// The idea of each opening, for the coach and the practice page: what the side
// that plays it aims for. Keyed by Lichess's English name of the opening.

export const EN_IDEAS: Readonly<Record<string, string>> = {
  'Italian Game':
    'The bishop on c4 eyes f7, then c3 and d4 build a big center, or d3 keeps it slow.',
  'Italian Game: Evans Gambit':
    'Give the b4 pawn to win time: c3 and d4 follow, opening lines against the uncastled king.',
  'Italian Game: Giuoco Piano':
    'Both bishops aim at the kings; c3 prepares d4 to chase the bishop from c5 and take the center.',
  'Italian Game: Giuoco Pianissimo':
    "A slow center with d3 and c3, then the queen's knight reaches g3 via d2 and f1.",
  'Italian Game: Two Knights Defense':
    'Counterattack e4 at once with the knight on f6, accepting sharp play if White goes for f7.',
  'Italian Game: Two Knights Defense, Fried Liver Attack':
    'Sacrifice the knight on f7 to drag the king out, then pile up on the pinned knight on d5.',
  'Italian Game: Two Knights Defense, Traxler Counterattack':
    'Ignore the threat on f7 and hit f2 with the bishop on c5, trading material for a fierce attack.',
  'Ruy Lopez':
    'The bishop on b5 hits the knight that guards e5; castle short, then c3 and d4 for lasting pressure.',
  'Ruy Lopez: Morphy Defense':
    'Question the bishop with the a6 pawn early, keeping the b5 push in hand to drive it off later.',
  'Ruy Lopez: Closed':
    "The rook on e1 guards e4; c3 and h3 prepare d4, and the queen's knight heads for g3.",
  'Ruy Lopez: Exchange Variation':
    'Trade the bishop for the knight to double the c-pawns, then head for an endgame with the healthier majority.',
  'Ruy Lopez: Berlin Defense':
    'The knight on f6 hits e4 at once; Black welcomes an early queen trade and a solid, hard-to-crack endgame.',
  'Ruy Lopez: Marshall Attack':
    "The d5 push gives up the e5 pawn for a lasting attack on White's king.",
  'Scotch Game':
    'Open the center at once with d4, then use the knight on d4 and quick development.',
  'Scotch Game: Scotch Gambit':
    'Leave the d4 pawn hanging to bring the bishop to c4 and develop fast against f7.',
  'Four Knights Game':
    'Develop both knights first, then the bishop to b5 or the d4 push, keeping a safe, flexible center.',
  'Three Knights Opening':
    'Natural knight moves keep the game flexible, ready to turn into a Four Knights or a Scotch setup.',
  'Ponziani Opening':
    'The c3 pawn prepares d4 for a full center, with the queen to a4 or b3 as a sting.',
  "Bishop's Opening":
    'The bishop on c4 targets f7 early, keeping the f4 push or an Italian setup in reserve.',
  'Vienna Game':
    "The knight on c3 guards e4 and prepares f4: a King's Gambit with a piece already out.",
  'Vienna Game: Vienna Gambit':
    'The f4 push opens the f-file and drives Black from the center, with the pieces aimed at f7.',
  "King's Gambit":
    'Offer the f4 pawn to deflect e5, then take the center with d4 and attack down the f-file.',
  "King's Gambit Accepted":
    'Take the pawn, then hold it with g5 or give it back with the d5 push for free development.',
  'Danish Gambit':
    'Give one or two pawns for a big lead in development and two bishops raking the kingside.',
  'Center Game':
    'Open the center with d4 at once; the queen takes back, then long castling and quick piece play.',
  "Petrov's Defense":
    'Mirror White with the knight to f6 and hit e4, aiming for a solid, symmetrical game.',
  "Petrov's Defense: Stafford Gambit":
    'Give the e5 pawn for quick development and traps, with the bishop on c5 aimed at f2.',
  'Philidor Defense':
    'The d6 pawn holds e5 firmly; develop behind it with the bishop on e7 and the knights.',
  'Elephant Gambit':
    'Strike back with the d5 push at once, giving a pawn to open lines for active pieces.',
  'Latvian Gambit':
    "The f5 push attacks e4 at once: a risky King's Gambit with the colors reversed.",
  'Sicilian Defense':
    'The c5 pawn fights for d4 from the side, trades itself for a center pawn and opens the c-file.',
  'Sicilian Defense: Najdorf Variation':
    'The a6 pawn keeps the knights off b5 and prepares e5 or e6, with queenside play through b5.',
  'Sicilian Defense: Dragon Variation':
    'The bishop on g7 rakes the long diagonal; castle short, then attack down the c-file.',
  'Sicilian Defense: Accelerated Dragon':
    'Fianchetto at once with the pawn still on d7, so the d5 push frees the game in one move.',
  'Sicilian Defense: Taimanov Variation':
    'Pawns on e6 and a6 with the knight on c6 keep things flexible, the queen often on c7.',
  'Sicilian Defense: Kan Variation':
    'Pawns on e6 and a6, knights held back: the queen to c7 and the b5 push follow.',
  'Sicilian Defense: Scheveningen Variation':
    'Pawns on d6 and e6 guard d5 and e5, ready for the d5 or b5 breaks.',
  'Sicilian Defense: Classical Variation':
    'Knights on c6 and f6 with the pawn on d6 develop fast and keep the center solid.',
  'Sicilian Defense: Lasker-Pelikan Variation':
    'The e5 push kicks the knight and grabs the center, accepting a hole on d5 for active pieces.',
  'Sicilian Defense: Alapin Variation':
    'The c3 pawn prepares d4, so a pawn can take back there and keep a full center.',
  'Sicilian Defense: Smith-Morra Gambit':
    'Give a pawn for open c- and d-files, quick development and pressure on d6 and f7.',
  'Sicilian Defense: Closed':
    'The knight on c3 keeps the center closed, then a fianchetto and the f4 push start a kingside attack.',
  'Sicilian Defense: Nyezhmetdinov-Rossolimo Attack':
    "The bishop on b5 pins the knight on c6, ready to trade it and double Black's pawns.",
  'French Defense':
    "The e6 pawn backs a strike on d5; the c5 break then hits White's center at its base.",
  'French Defense: Advance Variation':
    'The e5 pawn cramps Black; c3 backs the d4 base so the chain holds against the c5 break.',
  'French Defense: Exchange Variation':
    'Trade on d5 for an open, symmetrical game where faster development counts most.',
  'French Defense: Tarrasch Variation':
    "The knight goes to d2, not c3, dodging the bishop's pin and keeping the c3 push free.",
  'French Defense: Winawer Variation':
    "The bishop on b4 pins the knight on c3, ready to double White's c-pawns and press on e4.",
  'French Defense: Classical Variation':
    'The knight on f6 hits e4 at once, steering for solid play with the bishop on e7.',
  'French Defense: Rubinstein Variation':
    'Take on e4 to free the game, then develop calmly and break with c5 or e5.',
  'Caro-Kann Defense':
    'The c6 pawn backs a strike on d5, leaving the light-squared bishop free to reach f5 or g4.',
  'Caro-Kann Defense: Advance Variation':
    'The e5 pawn gains space; g4 or h4 then chase the bishop from f5.',
  'Caro-Kann Defense: Exchange Variation':
    'Trade on d5, put the bishop on d3, then play down the half-open e-file and on the kingside.',
  'Caro-Kann Defense: Classical Variation':
    'Take on e4, bring the bishop to f5 and then g6, and build a sound, solid position.',
  'Caro-Kann Defense: Panov Attack':
    'The c4 pawn turns it into an isolated d-pawn game: quick development and chances on the kingside.',
  'Scandinavian Defense':
    'Hit e4 at once; the queen takes back on d5, then drops to a5 or d6 for fast development.',
  'Pirc Defense': 'Let White build the center, then fianchetto and hit it with the c5 or e5 break.',
  'Pirc Defense: Austrian Attack':
    'Pawns on d4, e4 and f4 grab the center, aiming for e5 to drive off the knight on f6.',
  'Modern Defense':
    "Fianchetto at once, keep the knight home a while, and strike White's center later with c5 or e5.",
  'Alekhine Defense':
    "Tempt White's pawns forward with the knight, then undermine the overextended center with the d6 push.",
  'Nimzowitsch Defense':
    'The knight on c6 eyes d4 and e5, inviting White to overextend before striking with d5 or e5.',
  'Owen Defense':
    'The bishop on b7 presses e4 from afar, with e6 and c5 to follow against the center.',
  'St. George Defense':
    'The a6 pawn prepares b5 and the bishop on b7 against e4, while White builds the center.',
  "Queen's Pawn Game":
    "Take space with d4 and keep the choice of setup: a Queen's Gambit, a London or a Colle.",
  "Queen's Pawn Game: London System":
    'A fixed setup: the bishop to f4 before e3, pawns on c3, d4 and e3, a knight on e5.',
  'London System': 'The bishop comes out to f4 before e3 shuts it in, then pawns on c3, d4 and e3.',
  "Queen's Pawn Game: Colle System":
    'Pawns on c3, d4 and e3 with the bishop on d3, then the e4 push opens the center.',
  "Queen's Pawn Game: Torre Attack":
    'The bishop on g5 pins the knight on f6; e3, c3 and a knight on d2 prepare e4.',
  'Rapport-Jobava System':
    'The knight on c3 and the bishop on f4 eye c7 via b5, often with long castling.',
  'Blackmar-Diemer Gambit':
    'Give a center pawn, then f3 opens the f-file for fast development and a kingside attack.',
  'Trompowsky Attack':
    "The bishop to g5 at once offers to take the knight on f6 and spoil Black's pawns.",
  "Queen's Gambit": "The c4 pawn hits d5 from the side; if it's taken, e4 builds a full center.",
  "Queen's Gambit Declined":
    'The e6 pawn holds d5 firmly; develop calmly, then free the game with the c5 or e5 break.',
  "Queen's Gambit Declined: Exchange Variation":
    'Trade on d5 to fix the structure, then a minority attack with b4 and b5 on the queenside.',
  "Queen's Gambit Declined: Orthodox Defense":
    'Hold d5 with knights on f6 and d7, the bishop on e7, then trade pieces to breathe.',
  "Queen's Gambit Declined: Tarrasch Defense":
    'The c5 break frees the pieces, at the cost of an isolated pawn on d5.',
  "Queen's Gambit Accepted":
    'Take on c4, give the pawn back later, and use the time to strike with e6 and c5.',
  'Slav Defense':
    'The c6 pawn holds d5 and leaves the light-squared bishop free to come out to f5 or g4.',
  'Slav Defense: Exchange Variation':
    'Trade on d5 for a symmetrical game, then press down the open c-file with the bishop on f4.',
  'Semi-Slav Defense':
    'Pawns on c6, d5 and e6 form a firm triangle, ready to take on c4 and push b5.',
  'Catalan Opening':
    'The bishop on g2 rakes the long diagonal toward d5 and b7, for lasting pressure on the queenside.',
  'Indian Defense':
    "The knight on f6 stops e4 and keeps every setup open: King's Indian, Nimzo, Grünfeld or Benoni.",
  'Indian Defense: Budapest Gambit':
    'Give the e5 pawn, then win it back by hitting e5 with the knights from g4 and c6.',
  "King's Indian Defense":
    'Let White take the center, fianchetto and castle, then strike it with the e5 push or the c5 break.',
  "King's Indian Defense: Normal Variation":
    'With the d6 pawn in, prepare the e5 push and, once the center closes, attack with f5.',
  'Nimzo-Indian Defense':
    "The bishop on b4 pins the knight on c3 to stop e4, ready to double White's pawns.",
  'Grünfeld Defense':
    'Let White build a big center, then hit it with the c5 push and the bishop on g7.',
  "Queen's Indian Defense":
    'The bishop on b7 controls e4 from afar, in a solid, flexible setup with the e6 pawn.',
  'Bogo-Indian Defense':
    'Check with the bishop on b4 to make White block, then trade it off for easy, solid development.',
  'Old Indian Defense':
    'The d6 pawn and the knights on d7 and f6 prepare the e5 push, the bishop staying on e7.',
  'Benoni Defense':
    'The c5 pawn invites d5, then e6 and a fianchetto bring a queenside majority and active pieces.',
  'Benoni Defense: Modern Variation':
    'Trade on d5 for a queenside majority: the bishop on g7 and the b5 push make the plan.',
  'Benko Gambit':
    "Give the b5 pawn to open the a- and b-files, with lasting pressure on White's queenside.",
  'Dutch Defense':
    'The f5 pawn holds e4 and prepares a kingside attack, at the cost of a looser king.',
  'Dutch Defense: Stonewall Variation':
    'Pawns on c6, d5, e6 and f5 lock down e4; a knight settles there and the kingside attack follows.',
  'Dutch Defense: Leningrad Variation':
    "Fianchetto the king's bishop behind the f5 pawn, then push e5 with the d6 pawn's support.",
  'Dutch Defense: Classical Variation':
    'The bishop on e7 and the d6 pawn back the e5 push, the queen often going to h5.',
  'Englund Gambit':
    'Give a pawn at once; the knight to c6 and the queen to e7 hit e5 and set traps.',
  'English Opening':
    "The c4 pawn controls d5 from the side; fianchetto the king's bishop and play on the queenside.",
  'Réti Opening':
    'Attack d5 from the flanks with the c4 pawn and a fianchettoed bishop, leaving the center pawns home.',
  'Zukertort Opening':
    "Start with the knight to f3 and decide later: a Queen's Gambit, an English or a King's Indian Attack.",
  "King's Indian Attack":
    "A King's Indian with the colors reversed: fianchetto, castle short, then e4 and e5 for a kingside attack.",
  'Bird Opening':
    'The f4 pawn grabs e5; the bishop on b2 and the knight on f3 back a kingside attack.',
  'Polish Opening':
    'The b4 pawn gains queenside space and makes room for the bishop on b2 to hit e5.',
  'Nimzo-Larsen Attack':
    "Fianchetto the queen's bishop at once to press on e5 and the long diagonal, then fight for the center.",
  "Van't Kruijs Opening":
    'A quiet e3 opens lines for the bishop and the queen, keeping a flexible center for later.',
  'Grob Opening':
    'The g4 pawn grabs space and opens the long diagonal for the bishop on g2, aimed at b7.',
};
