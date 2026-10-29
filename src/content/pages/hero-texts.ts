// The home hero's text, in the languages styles/home/ also translates the cards
// and speeds into; English otherwise.

export interface HeroText {
  readonly eyebrow: string;
  readonly title: string;
  /** The titles for a signed-in player, dealt one per page load (greeting-deck.ts). */
  readonly greetings: readonly ((name: string) => string)[];
  readonly sub: string;
}

const ENGLISH: HeroText = {
  eyebrow: 'Free · No ads · Open source',
  title: 'Play chess online',
  greetings: [
    name => `Ready to play, ${name}?`,
    name => `Welcome back, ${name}!`,
    name => `Fancy a game, ${name}?`,
    name => `Your move, ${name}.`,
    name => `Good to see you, ${name}!`,
    name => `The board is set, ${name}.`,
    name => `One more game, ${name}?`,
    name => `Time to shine, ${name}!`,
    name => `The pieces are waiting, ${name}.`,
    name => `Up for a challenge, ${name}?`,
    name => `Let’s play, ${name}!`,
    name => `Checkmate awaits, ${name}.`,
    name => `Hello again, ${name}!`,
    name => `Feeling sharp, ${name}?`,
    name => `A quick blitz, ${name}?`,
    name => `Show them your best, ${name}!`,
  ],
  sub: 'Take on thousands of players worldwide, solve puzzles and improve, completely free.',
};

const HERO_TEXTS: Readonly<Record<string, HeroText>> = {
  en: ENGLISH,
  fr: {
    eyebrow: 'Gratuit · Sans publicité · Open source',
    title: 'Jouer aux échecs en ligne',
    greetings: [
      name => `Prêt pour une partie, ${name} ?`,
      name => `Bon retour, ${name} !`,
      name => `Une petite partie, ${name} ?`,
      name => `À vous de jouer, ${name}.`,
      name => `Content de vous revoir, ${name} !`,
      name => `L’échiquier est prêt, ${name}.`,
      name => `Encore une partie, ${name} ?`,
      name => `À vous de briller, ${name} !`,
      name => `Les pièces vous attendent, ${name}.`,
      name => `Un petit défi, ${name} ?`,
      name => `On joue, ${name} ?`,
      name => `Le mat vous attend, ${name}.`,
      name => `Rebonjour, ${name} !`,
      name => `En forme aujourd’hui, ${name} ?`,
      name => `Un petit blitz, ${name} ?`,
      name => `Montrez votre talent, ${name} !`,
    ],
    sub: 'Affrontez des milliers de joueurs du monde entier, résolvez des problèmes et progressez, entièrement gratuitement.',
  },
  de: {
    eyebrow: 'Kostenlos · Werbefrei · Open Source',
    title: 'Schach online spielen',
    greetings: [
      name => `Bereit für eine Partie, ${name}?`,
      name => `Willkommen zurück, ${name}!`,
      name => `Lust auf eine Partie, ${name}?`,
      name => `Du bist am Zug, ${name}.`,
      name => `Schön, dich zu sehen, ${name}!`,
      name => `Das Brett ist aufgebaut, ${name}.`,
      name => `Noch eine Partie, ${name}?`,
      name => `Zeit zu glänzen, ${name}!`,
      name => `Die Figuren warten, ${name}.`,
      name => `Lust auf ein Duell, ${name}?`,
      name => `Auf geht’s, ${name}!`,
      name => `Das Matt wartet, ${name}.`,
      name => `Da bist du ja, ${name}!`,
      name => `Heute in Form, ${name}?`,
      name => `Eine Runde Blitz, ${name}?`,
      name => `Zeig, was du kannst, ${name}!`,
    ],
    sub: 'Spiele gegen Tausende Gegner aus aller Welt, löse Aufgaben und werde besser, völlig kostenlos.',
  },
  es: {
    eyebrow: 'Gratis · Sin anuncios · Código abierto',
    title: 'Juega al ajedrez en línea',
    greetings: [
      name => `¿Listo para jugar, ${name}?`,
      name => `¡Hola de nuevo, ${name}!`,
      name => `¿Te apetece una partida, ${name}?`,
      name => `Te toca mover, ${name}.`,
      name => `¡Qué bueno verte, ${name}!`,
      name => `El tablero está listo, ${name}.`,
      name => `¿Otra partida, ${name}?`,
      name => `¡Hora de brillar, ${name}!`,
      name => `Las piezas te esperan, ${name}.`,
      name => `¿Aceptas un reto, ${name}?`,
      name => `¡A jugar, ${name}!`,
      name => `El jaque mate te espera, ${name}.`,
      name => `¡Ya estás aquí, ${name}!`,
      name => `¿Con ganas de ajedrez, ${name}?`,
      name => `¿Un blitz rápido, ${name}?`,
      name => `¡Demuestra lo que vales, ${name}!`,
    ],
    sub: 'Enfréntate a miles de jugadores de todo el mundo, resuelve problemas y mejora, totalmente gratis.',
  },
  pt: {
    eyebrow: 'Grátis · Sem anúncios · Código aberto',
    title: 'Jogue xadrez online',
    greetings: [
      name => `Pronto para jogar, ${name}?`,
      name => `Olá de novo, ${name}!`,
      name => `Que tal uma partida, ${name}?`,
      name => `Sua vez de jogar, ${name}.`,
      name => `Que bom te ver, ${name}!`,
      name => `O tabuleiro está pronto, ${name}.`,
      name => `Mais uma partida, ${name}?`,
      name => `Hora de brilhar, ${name}!`,
      name => `As peças estão esperando, ${name}.`,
      name => `Topa um desafio, ${name}?`,
      name => `Vamos jogar, ${name}!`,
      name => `O xeque-mate te espera, ${name}.`,
      name => `Você voltou, ${name}!`,
      name => `Em boa forma hoje, ${name}?`,
      name => `Um blitz rápido, ${name}?`,
      name => `Mostre seu talento, ${name}!`,
    ],
    sub: 'Enfrente milhares de jogadores do mundo todo, resolva problemas e evolua, totalmente grátis.',
  },
};

/** The hero's text for a page language (`fr`, `pt-BR`…). */
export const heroText = (lang: string): HeroText => HERO_TEXTS[lang.slice(0, 2)] ?? ENGLISH;
