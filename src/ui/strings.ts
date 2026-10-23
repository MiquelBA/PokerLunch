// Every text on screen, in Catalan.
import type { BlastKind, HandType, PowerKind } from '../engine/types';

const n = (v: number) => v.toLocaleString('ca');

export const HAND_NAMES: Readonly<Record<HandType, string>> = {
  trips: 'Trio',
  twoPair: 'Doble parella',
  straight: 'Escala',
  flush: 'Color',
  fullHouse: 'Full',
  quads: 'Pòquer',
  straightFlush: 'Escala de color',
  fiveKind: 'Repòquer',
  royalFlush: 'Escala reial',
};

/** One-line description for the help sheet. */
export const HAND_RULES: Readonly<Record<HandType, string>> = {
  trips: '3 cartes del mateix número',
  twoPair: '2 parelles, 4 cartes',
  straight: '5 números seguits, en qualsevol ordre',
  flush: '5 cartes del mateix pal',
  fullHouse: 'Un trio i una parella',
  quads: '4 cartes del mateix número',
  straightFlush: 'Escala del mateix pal',
  fiveKind: '5 cartes del mateix número',
  royalFlush: '10, J, Q, K i A del mateix pal',
};

/** Example of each hand for the help sheet (notation). */
export const HAND_EXAMPLES: Readonly<Record<HandType, string>> = {
  trips: '7S 7H 7D',
  twoPair: '9C 9D 4H 4S',
  straight: '6H 7C 8D 9S TH',
  flush: '2D 6D 9D JD KD',
  fullHouse: 'QS QH QC 5D 5H',
  quads: 'AS AH AD AC',
  straightFlush: '5C 6C 7C 8C 9C',
  fiveKind: 'KS KH KD KC KS',
  royalFlush: 'TH JH QH KH AH',
};

export const BLAST_RULES: Readonly<Record<BlastKind, string>> = {
  cross: 'Rebenta la fila i la columna',
  suit: 'Rebenta les cartes del pal que la toquen',
  rank: 'Rebenta totes les cartes d’aquell número',
  board: 'Rebenta tot el tauler',
  row: 'Rebenta la fila',
  storm: 'Rebenta totes les cartes del pal',
  bomb: 'Rebenta les cartes del voltant',
};

/** The streak power's name, shown big when it fires. */
export const POWER_NAMES: Readonly<Record<PowerKind, string>> = {
  joker: 'Comodí!',
  time: '+3 segons!',
  row: 'Fila fora!',
  storm: 'Tempesta de color!',
  gild: 'Pluja d’or!',
  double: 'Punts ×2!',
};

/** What the third hand of a type does, for the help sheet. */
export const POWER_RULES: Readonly<Record<PowerKind, string>> = {
  joker: 'cau un comodí',
  time: '+3 segons',
  row: 'rebenta la fila on acaba',
  storm: 'rebenta totes les cartes del pal',
  gild: 'les cartes del número del trio es tornen daurades',
  double: 'punts dobles',
};

export const STRINGS = {
  title: 'Poker Lunch',
  tagline: 'Traça mans de pòquer amb el dit',
  play: 'Juga',
  playAgain: 'Torna a jugar',
  howTo: 'Com es juga',
  /** The small buttons at the bottom of the start screen. */
  menu: { more: 'Més opcions', help: 'Com es juga', sound: 'So', ranking: 'Rànquing', tables: 'Taules', feedback: 'Opina', install: 'Instal·la' },
  score: 'Punts',
  best: 'Rècord',
  time: 'Temps',
  pause: 'Pausa',
  paused: 'En pausa',
  resume: 'Continua',
  quit: 'Surt',
  /** Leaving a game before the clock runs out: nothing is saved or sent to the ranking. */
  quitAsk: {
    title: 'Vols sortir?',
    body: 'Aquesta puntuació no es guardarà.',
    table: 'Aquest intent comptarà igualment a la taula.',
    tour: 'No guanyaràs cap estrella en aquest nivell.',
    yes: 'Sí, surt',
    no: 'Continua jugant',
  },
  go: 'Som-hi!',
  soundOn: 'So activat',
  soundOff: 'So desactivat',
  close: 'Tanca',
  notAHand: 'No és cap mà',
  noTokens: (hand: string) => `${hand}: sense fitxes`,
  tokensLeft: (k: number) => (k === 1 ? 'Queda 1 fitxa' : `Queden ${k} fitxes`),
  variety: {
    title: '3 mans diferents',
    equals: '=',
    tip: 'Fes 3 mans diferents seguides i la 3a val ×2!',
    label: (k: number, m: number) => `Fes ${k} mans diferents seguides per a punts ×${m} i el poder de la mà`,
    done: (m: number) => `VARIETAT ×${m}!`,
  },
  keepGoing: 'Continua…',
  points: (p: number) => `+${n(p)}`,
  timeBonus: (s: number) => `+${s} s`,
  times: (m: number) => `×${String(m).replace('.', ',')}`,
  golden: (m: number) => `DAURADA ×${m}`,
  shuffle: 'Barregem!',
  comboHot: 'Combo!',
  comboFire: 'En ratxa!',
  comboBoom: 'BOOM!',
  gameOver: 'Temps!',
  newBest: 'Nou rècord!',
  bestMove: 'Millor jugada',
  bestHand: 'Millor mà',
  hands: 'Mans',
  noHands: 'Cap mà',
  rating: {
    ask: 'T’ha agradat?',
    up: 'M’ha agradat',
    down: 'No m’ha agradat',
    thanks: 'Gràcies!',
  },
  install: {
    button: 'Instal·la l’app',
    title: 'Afegeix-lo a la pantalla d’inici',
    iosSteps: [
      'Obre aquesta pàgina amb Safari.',
      'Toca el botó Compartir (el quadrat amb la fletxa cap amunt).',
      'Tria «Afegeix a la pantalla d’inici» i després «Afegeix».',
    ],
  },
  feedback: {
    button: 'Envia un comentari',
    title: 'Què en penses?',
    hint: 'Què t’agrada, què canviaries o què no funciona. Ho llegim tot.',
    placeholder: 'Escriu aquí…',
    send: 'Envia',
    sending: 'Enviant…',
    thanks: 'Gràcies! Ho hem rebut.',
    failed: 'No s’ha pogut enviar. Torna-ho a provar d’aquí a una estona.',
  },
  leaderboard: {
    title: 'Classificació',
    open: 'Classificació',
    askName: 'Posa el teu nom per sortir a la classificació',
    changeName: 'Canvia el teu nom',
    namePlaceholder: 'El teu nom',
    save: 'Desa',
    playingAs: 'Jugues com a',
    edit: 'Canvia',
    loading: 'Carregant…',
    offline: 'No s’ha pogut connectar.',
    retry: 'Torna-ho a provar',
    empty: 'Encara no hi ha ningú. Sigues el primer!',
    badName: 'Aquest nom no es pot fer servir. Prova amb un altre.',
    refused: 'Aquesta puntuació no s’ha pogut afegir a la classificació.',
    rank: (p: number) => `Aquesta partida queda en la posició ${p}`,
  },
  help: {
    title: 'Com es juga',
    page1: 'Com es fa una mà',
    page2: 'Les combinacions',
    page3: 'Els extres',
    step: (i: number, of: number) => `${i} de ${of}`,
    skip: 'Salta',
    next: 'Següent',
    letsGo: 'Som-hi!',
    dontShow: 'No m’ho tornis a mostrar',
    moveTitle: 'Arrossega el dit per les cartes i guanya punts fent combinacions de pòquer',
    moveLead: 'Ves de carta en carta sense aixecar el dit: amunt, avall, als costats i ',
    moveDiagonal: 'en diagonal',
    moveTail: '. Pots girar tant com vulguis.',
    rose: 'Les 8 cartes del voltant es toquen: pots passar a qualsevol d’elles.',
    trace: 'Uneix de 3 a 5 cartes que formin una mà de pòquer.',
    all: 'Totes les cartes del traç han de formar part de la mà. L’ordre no importa.',
    time: 'Tens 2 minuts. Les mans grans donen temps extra i mans seguides fan combo.',
    joker: 'El comodí fa de la carta que et falti.',
    golden: 'Una carta daurada duplica els punts de la mà.',
    tokens: 'Cada mà té fitxes (els punts daurats de sota): fer-la en gasta una, i fer-ne una altra de diferent te la torna. Sense fitxes, no la pots fer.',
    variety: '3 mans diferents seguides: la 3a val ×2 i desferma el seu poder. Si repeteixes una mà, la ratxa torna a començar.',
    varietyTitle: '3 mans diferents = ×2',
    varietyPower: 'Poder!',
    tokensOf: (k: number) => `${k} fitxes`,
    noLimit: 'Sense límit',
    power: 'Poder',
    handsTitle: 'Les mans',
  },
} as const;
