// The tables' texts, in Catalan.

const n = (v: number) => v.toLocaleString('ca');

/** "de Pau", "d’Anna". */
const of = (name: string) => (/^[aeiouàèéíïòóúüh]/i.test(name) ? `d’${name}` : `de ${name}`);

export const TABLE_STRINGS = {
  menuButton: 'Munta una taula',
  menuInfo: 'Les mateixes cartes per a tots els amics',
  // Opening a table's link
  loading: 'Obrint la taula…',
  missing: 'Aquesta taula no existeix.',
  offline: 'No s’ha pogut obrir la taula.',
  old: 'Aquesta taula és d’una versió anterior del joc i ja no s’hi pot jugar.',
  hostedBy: (name: string) => `Taula ${of(name)}`,
  players: (k: number) => (k === 1 ? '1 jugador' : `${k} jugadors`),
  lead: 'Mateixes cartes i en el mateix ordre per a tothom. Mentre jugues, veuràs com ho van fer els altres.',
  sit: 'Seu i juga',
  played: (score: number) => `Ja hi has jugat: ${n(score)} punts`,
  practice: 'Torna-hi (no compta)',
  practiceShort: 'Practica-hi',
  empty: 'Encara no hi ha ningú.',
  // Playing: the race with the others' ghosts
  race: 'La cursa de la taula',
  you: 'Tu',
  alert: (name: string, hand: string) => `${name}: ${hand}!`,
  // After the game
  practiceNote: 'Partida de pràctica: no compta a la taula.',
  sending: 'Seient a la taula…',
  failed: 'No s’ha pogut guardar a la taula.',
  refused: 'Aquesta partida no s’ha pogut guardar a la taula.',
  retry: 'Torna-ho a provar',
  place: (p: number, total: number) => (p === 1 ? `Lideres la taula! Posició 1 de ${total}` : `Posició ${p} de ${total}`),
  alone: 'Taula oberta! Ara convida-hi gent.',
  askName: 'Posa el teu nom perquè els altres sàpiguen qui ets',
  invite: 'Convida a la taula',
  inviteMore: 'Convida més gent',
  newTable: 'Munta una taula nova',
  // The free game's end: the same game becomes a table
  challenge: 'Repta amics amb aquest tauler',
  // What goes with the link
  shareNew: (score: number) => `He fet ${n(score)} punts en aquest tauler de Poker Lunch 🃏 Mateixes cartes per a tothom: seu a la meva taula i supera’m!`,
  shareTable: (host: string, players: number, best: number) =>
    `Som ${players} a la taula ${of(host)} a Poker Lunch 🃏 El millor porta ${n(best)} punts. Mateixes cartes per a tothom: seu i juga!`,
  // The list of my tables
  mine: 'Les meves taules',
  mineEmpty: 'Encara no has jugat a cap taula. Munta’n una i convida els amics!',
  mineScore: (score: number | null) => (score === null ? 'Pendent' : `${n(score)} punts`),
} as const;
