# Warm wood, an example pack

Everything a pack can hold, to try in the extension and to copy when making
your own. In the extension's settings, under **Packs** (or, signed out, in the
Extension tab of the user menu's Board, Piece set or Sound panel):

- **The whole pack at once:** download [warm-wood.zip](../warm-wood.zip)
  (the download button at the top right of its page), and drop it on
  **Import a local pack (.zip)**. Or paste this folder's link in the
  GitHub field:

      https://github.com/theophile-wallez/LichessNeo/tree/main/packs/example

- **A part at a time:** unzip warm-wood.zip, then drop each part on its zone:

  | Zone       | Drop                     | Named                                                       |
  | ---------- | ------------------------ | ----------------------------------------------------------- |
  | **Pieces** | [`pieces/`](pieces)      | `wK` `wQ` `wR` `wB` `wN` `wP` `bK` `bQ` `bR` `bB` `bN` `bP` |
  | **Board**  | [`board.svg`](board.svg) | any name                                                    |
  | **Sounds** | [`sounds/`](sounds)      | what they play: `move-self`, `capture`…                     |

  A dialog opens with each file in its place: name it, and import it.
  Each part is listed on its own, and **Make a pack to share** puts the ones
  you pick in a pack of your own, exported as a zip, ready for a
  `LichessNeoPack_…` repository of its own
  ([Sharing a pack](../../docs/packs.md#sharing-a-pack)). The same files in other
  formats (PNG, WebP, JPEG, MP3, Ogg) are in [samples](../samples/README.md).

[`pack.json`](pack.json) uses every field: [docs/packs.md](../../docs/packs.md)
says what each one does.

| Files       | From                                                                                                                                    | License                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pieces/`   | the [RhosGFX](https://rhosgfx.itch.io/) set, as Lichess serves it ([lila](https://github.com/lichess-org/lila), `public/piece/rhosgfx`) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `board.svg` | drawn for this pack                                                                                                                     | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `sounds/`   | synthesized by `tools/example-pack/sounds.py`                                                                                           | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
