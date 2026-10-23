// The tables' texts, in Catalan.

const n = (v: number) => v.toLocaleString('ca');

const vowel = (name: string) => /^[aeiouàèéíïòóúüh]/i.test(name);
/** "de Pau", "d’Anna". */
const of = (name: string) => (vowel(name) ? `d’${name}` : `de ${name}`);
/** Time left, rounded: "18 h", "3 h 20 min", "12 min". */
const duration = (ms: number) => {
  const m = Math.max(1, Math.ceil(ms / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h >= 6 || m % 60 === 0 ? `${h} h` : `${h} h ${m % 60} min`;
};
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
    step4: (tries: number, hours: number) => `${tries} intents i ${hours} hores`,
    step4Text: 'Tothom, també qui obre la taula, té els mateixos intents. Compta la millor partida de cadascú, i quan la taula tanca, guanya qui n’ha fet més.',
    you: 'Tu',
    tries: (max: number) => `3/${max} intents`,
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
  rules: (max: number | null) => (max === null
    ? 'Hi pots jugar tantes vegades com vulguis: compta la teva millor partida.'
    : `Tothom té ${max} intents, i compta la millor partida de cadascú. Si surts a mitja partida, l’intent compta.`),
  closesIn: (ms: number) => `Tanca d’aquí a ${duration(ms)}`,
  closed: 'Taula tancada',
  winner: (name: string) => `🏆 Guanya ${name}!`,
  winnerMe: '🏆 Has guanyat la taula!',
  left: (k: number) => (k === 1 ? 'Et queda 1 intent' : `Et queden ${k} intents`),
  noTries: (max: number) => `Ja has fet els ${max} intents.`,
  sitFailed: 'No s’ha pogut seure a la taula. Comprova la connexió i torna-ho a provar.',
  sitRefused: 'Ara mateix no pots seure a aquesta taula.',
  playing: 'jugant…',
  halfway: 'a mitges',
  host: 'amfitrió',
  tries: (k: number, max: number | null) => (max !== null ? `${k}/${max} intents` : k === 1 ? '1 intent' : `${k} intents`),
  beat: (attempt: number, ms: number | null) => `superat a l’intent ${attempt}${ms === null ? '' : ` (${minutes(ms)})`}`,
  myBest: (best: number) => `La teva millor: ${n(best)} punts`,
  mineLeft: 'Encara no has acabat cap partida.',
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
  attempt: (k: number, max: number | null, best: number, isBest: boolean) =>
    `Intent ${k}${max === null ? '' : ` de ${max}`} · ${isBest ? 'nova millor partida!' : `la teva millor: ${n(best)}`}`,
  toFirst: (gap: number) => `Et falten ${n(gap)} punts per al primer lloc.`,
  againFailed: 'No s’ha pogut començar un altre intent. Comprova la connexió.',
  alone: 'Encara no hi ha ningú més a la taula: convida-hi gent!',
  askName: 'Posa el teu nom perquè els altres sàpiguen qui ets',
  invite: 'Convida a la taula',
  inviteMore: 'Convida més gent',
  newTableShort: 'Taula nova',
  // A new table: invite first, then play
  creating: 'Obrint la taula…',
  createFailed: 'No s’ha pogut obrir la taula. Comprova la connexió i torna-ho a provar.',
  created: 'Taula oberta!',
  createdLead: (max: number, hours: number) => `Convida els amics i juga quan vulguis. Tothom, tu també, té ${max} intents i ${hours} hores.`,
  firstTry: 'Juga el teu primer intent',
  // What goes with the link
  shareNew: (max: number, hours: number) => `T’he reptat a Poker Lunch 🃏 Les mateixes cartes per a tothom, ${max} intents i ${hours} hores. Qui farà més punts?`,
  shareTable: (host: string, players: number, best: number) =>
    `Som ${players} a la taula ${of(host)} a Poker Lunch 🃏 El millor porta ${n(best)} punts. Mateixes cartes per a tothom: seu i juga!`,
  // The list of my tables
  mine: 'Les meves taules',
  mineEmpty: 'Encara no has jugat a cap taula. Munta’n una i convida els amics!',
  forget: (host: string) => `Treu la taula ${of(host)} de la llista`,
  mineScore: (score: number | null) => (score === null ? 'Pendent' : `${n(score)} punts`),
} as const;
