# The store listings

What the Chrome Web Store's developer dashboard and Firefox Add-ons (AMO) ask
for, ready to paste. The name and the
summary come from the manifest (`extDescription` in `public/_locales`); the
images are in `store/en` and `store/fr`, made from `store/templates`
(`pnpm store:render`).

## The package

`pnpm package` writes `dist/LichessNeo-v<version>-store.zip`: the release build,
minified, without source maps. Upload that one.

## Store listing

- **Category:** Lifestyle › Games
- **Languages:** English (default) and French, each with its own description
  and images.
- **Screenshots (1280×800):** `1-game`, `2-debrief`, `3-coach`, `4-looks`,
  `5-pages`, in that order.
- **Small promo tile (440×280):** `promo-small`.
- **Marquee promo tile (1400×560):** `promo-marquee`.
- **Store icon (128×128):** `public/icons/icon128.png`.

### Description, English

```text
Lichess Neo gives lichess.org a modern look, and a coach who goes over your games with you.

It's still Lichess: your account, your games, your friends and every feature stay as they are. Only the look and the sounds change.

A ROOMY, MODERN LAYOUT
• A sidebar that stays put, a board that takes all the room it can, and one panel beside it for the moves, the controls and the chat.
• Player bars with avatars and clocks, the players' intro at the start, the kings' badges and confetti for the winner at the end.
• Every page redesigned: home, puzzles, lessons, practice, profiles, tournaments, the forum.

A DEBRIEF FOR EVERY GAME
• Every move classified, from brilliant to blunder.
• The advantage graph, with each swing marked.
• Accuracy and a game rating for each player, phase by phase.
• A coach who explains each move in plain words, shows the better one and lets you try again.

26 COACHES
Pick yours among 26 characters in 3D. It talks to you in the Debrief, in puzzles and in lessons.

MAKE IT YOURS
• 16 color themes, each in light and dark, or make your own.
• Boards: ours, Lichess's, or one you draw.
• Lichess's piece sets and sounds, or a pack you import.

FREE
No ads, nothing to sign up for, and no data collected: everything stays in your browser.

Lichess Neo is an unofficial fan project, not affiliated with Lichess.org.
```

### Description, French

```text
Lichess Neo donne à lichess.org un look moderne, et un coach qui revoit vos parties avec vous.

C'est toujours Lichess : votre compte, vos parties, vos amis et toutes les fonctions restent les mêmes. Seuls le style et les sons changent.

UNE MISE EN PAGE AÉRÉE ET MODERNE
• Une barre latérale fixe, un plateau qui prend toute la place possible, et un seul panneau à côté pour les coups, les commandes et le chat.
• Des barres de joueurs avec avatars et pendules, la présentation des joueurs au début, les badges des rois et des confettis pour le gagnant à la fin.
• Chaque page repensée : accueil, problèmes, leçons, exercices, profils, tournois, forum.

UN DÉBRIEF POUR CHAQUE PARTIE
• Chaque coup classé, du coup brillant à la gaffe.
• Le graphe de l'avantage, avec chaque bascule marquée.
• La précision et le niveau de jeu de chaque joueur, phase par phase.
• Un coach qui explique chaque coup avec des mots simples, montre le meilleur et vous laisse réessayer.

26 COACHS
Choisissez le vôtre parmi 26 personnages en 3D. Il vous parle dans le débrief, les problèmes et les leçons.

À VOTRE GOÛT
• 16 thèmes de couleur, chacun en clair et en sombre, ou le vôtre.
• Plateaux : les nôtres, ceux de Lichess, ou celui que vous dessinez.
• Les pièces et les sons de Lichess, ou un pack que vous importez.

GRATUIT
Sans pub, sans inscription, et aucune donnée collectée : tout reste dans votre navigateur.

Lichess Neo est un projet de fan non officiel, sans lien avec Lichess.org.
```

## Privacy practices

- **Single purpose:** Restyles lichess.org with a modern layout and adds a
  Debrief of each game, explained by a coach.
- **`storage`:** Keeps the extension's settings (color themes, the coach's
  switches, the interface's sounds), synced across the user's browsers.
- **Host access (`https://lichess.org/*`, the content scripts):** The
  extension changes the look of lichess.org and adds its features to its
  pages; it runs on no other site.
- **Remote code:** No. All the code is in the package. A pack the user
  imports from GitHub holds only images, sounds and a JSON description.
- **Data usage:** None of the listed data is collected. Settings stay in the
  browser; the only requests go to lichess.org, and to GitHub when the user
  imports a pack.
- **Certifications:** tick all three (no sale of data, no use unrelated to
  the single purpose, no use for credit).

## Firefox Add-ons (AMO)

### The packages

`pnpm package` writes both: `dist/LichessNeo-v<version>-firefox.zip`, the
add-on, and `dist/LichessNeo-v<version>-source.zip`, its sources. The add-on is
bundled and minified, so AMO asks for the sources: answer yes and upload that
zip. Check the add-on first with Mozilla's linter
(`npx addons-linter dist/LichessNeo-v<version>-firefox.zip`): it should report
no errors, and the warnings the notes below explain.

### Listing

- **Name:** Lichess Neo. **Slug:** `lichess-neo`.
- **Summary:** the manifest's (`extDescription`), in English and French.
- **Description:** the Chrome Web Store's above, in both languages.
- **Categories:** Games & Entertainment, Appearance (on Android too: the
  add-on runs on Firefox for Android 142 and later).
- **Tags:** chess, lichess, theme, dark mode, game review.
- **Support site:** https://github.com/theophile-wallez/LichessNeo/issues
- **License:** MIT.
- **Privacy policy:** none; the manifest declares no data collection
  (`data_collection_permissions: none`).
- **Screenshots:** the five 1280×800 images, with their captions:
  "A game's Debrief", "Every move explained", "26 coaches",
  "Your colors, board and sounds", "Every page redesigned".

### Notes to the reviewer

```text
The add-on is built from the attached sources with Node 24 and pnpm (corepack enable picks the version in package.json):

  pnpm install --frozen-lockfile
  pnpm build --target firefox --release --version <this version>

dist/firefox is then the submitted add-on, file for file. The README's "Building from the sources" says the same.

About the linter's warnings:
- innerHTML / insertAdjacentHTML: all markup is built with a tagged template (src/shared/html.ts) that escapes every interpolated value; constants only go through trustedHtml.
- import() in content.js loads coach-mascot.js, a chunk of the add-on itself (runtime.getURL), only when a coach shows.
- import() in page.js runs in the page's world, not the add-on's: it loads Lichess's own Stockfish build from lichess.org's assets, as Lichess's analysis board does, for the game review.

No remote code runs in the add-on's context, and no data leaves the browser: the add-on only talks to lichess.org, and to GitHub when the user imports a pack (images, sounds and a JSON file).
```
