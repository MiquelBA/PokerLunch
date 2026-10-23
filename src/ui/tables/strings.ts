// The tables' texts, in Catalan.

const n = (v: number) => v.toLocaleString('ca');

const vowel = (name: string) => /^[aeiouàèéíïòóúüh]/i.test(name);
/** "de Pau", "d’Anna". */
const of = (name: string) => (vowel(name) ? `d’${name}` : `de ${name}`);
/** "Pau", "l’Anna": only the apostrophe, which doesn't depend on who it is. */
const art = (name: string) => (vowel(name) ? `l’${name}` : name);
/** Time played, rounded: "3 min", "1 h 05 min". */
const minutes = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60_000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};

export const TABLE_STRINGS = {
  menuButton: 'Taula amb amics',
  menuInfo: 'Qui farà més punts?',
  // The first time: how a table works
  intro: {
    title: 'Taula amb amics',
    lead: 'Un repte entre amics: qui fa més punts amb les mateixes cartes?',
    step1: 'Tothom juga les mateixes cartes',
    step1Text: 'Mateix tauler i mateix ordre de cartes per a tots. Aquí no hi ha sort: guanya qui juga millor.',
    step2: 'Comparteix l’enllaç',
    step2Text: 'Envia’l per WhatsApp o on vulguis. Els amics s’hi asseuen i juguen quan volen.',
    step3: 'Veus com ho van fer els altres',
    step3Text: 'Mentre jugues, a dalt veus quants punts portava cadascú en aquell mateix moment.',
    step4: 'Torna-hi tantes vegades com vulguis',
    step4Text: 'Compta la teva millor partida, i a la taula es veu quants intents t’ha costat.',
    you: 'Tu',
    tries: '3 intents',
    go: 'Som-hi!',
    see: 'Veure la taula',
  },
  // Opening a table's link
  loading: 'Obrint la taula…',
  missing: 'Aquesta taula no existeix.',
  offline: 'No s’ha pogut obrir la taula.',
  old: 'Aquesta taula és d’una versió anterior del joc i ja no s’hi pot jugar.',
  hostedBy: (name: string) => `Taula ${of(name)}`,
  players: (k: number) => (k === 1 ? '1 jugador' : `${k} jugadors`),
  lead: 'Mateixes cartes i en el mateix ordre per a tothom. Mentre jugues, veuràs com ho van fer els altres.',
  sit: 'Seu i juga',
  again: 'Torna-hi',
  sitting: 'Seient…',
  rules: 'Hi pots jugar tantes vegades com vulguis: compta la teva millor partida, i tothom veurà quants intents t’ha costat.',
  sitFailed: 'No s’ha pogut seure a la taula. Comprova la connexió i torna-ho a provar.',
  sitRefused: 'Ara mateix no pots seure a aquesta taula.',
  playing: 'jugant…',
  halfway: 'a mitges',
  host: 'amfitrió',
  tries: (k: number) => (k === 1 ? '1 intent' : `${k} intents`),
  beat: (attempt: number, ms: number | null) => `superat a l’intent ${attempt}${ms === null ? '' : ` (${minutes(ms)})`}`,
  myBest: (best: number, tries: number) => `La teva millor: ${n(best)} punts en ${tries === 1 ? '1 intent' : `${tries} intents`}`,
  mineLeft: (tries: number) => `Portes ${tries === 1 ? '1 intent' : `${tries} intents`} i encara cap partida acabada.`,
  empty: 'Encara no hi ha ningú.',
  // Playing: the race with the others' ghosts
  race: 'La cursa de la taula',
  you: 'Tu',
  yourBest: 'La teva millor',
  alert: (name: string, hand: string) => `${name}: ${hand}!`,
  // After the game
  sending: 'Guardant a la taula…',
  failed: 'No s’ha pogut guardar a la taula.',
  refused: 'Aquesta partida no s’ha pogut guardar a la taula.',
  retry: 'Torna-ho a provar',
  place: (p: number, total: number) => (p === 1 ? `Lideres la taula! Posició 1 de ${total}` : `Posició ${p} de ${total}`),
  attempt: (k: number, best: number, isBest: boolean) =>
    `Intent ${k} · ${isBest ? 'nova millor partida!' : `la teva millor: ${n(best)}`}`,
  beatNow: (host: string, k: number) => `Has superat ${art(host)} a l’intent ${k}! 🎉`,
  beatBefore: (host: string, k: number) => `Ja vas superar ${art(host)} a l’intent ${k}.`,
  toBeat: (host: string, gap: number) => `Et falten ${n(gap)} punts per superar ${art(host)}.`,
  againFailed: 'No s’ha pogut començar un altre intent. Comprova la connexió.',
  alone: 'Taula oberta! Ara convida-hi gent.',
  askName: 'Posa el teu nom perquè els altres sàpiguen qui ets',
  invite: 'Convida a la taula',
  inviteMore: 'Convida més gent',
  newTableShort: 'Taula nova',
  // The free game's end: the same game becomes a table
  challenge: 'Repta amics amb aquest tauler',
  // What goes with the link
  shareNew: (score: number) => `He fet ${n(score)} punts en aquest tauler de Poker Lunch 🃏 Mateixes cartes per a tothom: seu a la meva taula i supera’m!`,
  shareTable: (host: string, players: number, best: number) =>
    `Som ${players} a la taula ${of(host)} a Poker Lunch 🃏 El millor porta ${n(best)} punts. Mateixes cartes per a tothom: seu i juga!`,
  // The list of my tables
  mine: 'Les meves taules',
  mineEmpty: 'Encara no has jugat a cap taula. Munta’n una i convida els amics!',
  forget: (host: string) => `Treu la taula ${of(host)} de la llista`,
  mineScore: (score: number | null) => (score === null ? 'Pendent' : `${n(score)} punts`),
} as const;
