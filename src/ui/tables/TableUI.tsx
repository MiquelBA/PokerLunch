// Tables on screen: the card a link opens, the race beside the board while playing, the table after
// the game, and the list of my tables.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { parseCards } from '../../engine/notation';
import type { Move } from '../../engine/types';
import { RejectedError } from '../../leaderboard/api';
import { LEADERBOARD } from '../../leaderboard/config';
import { deviceId } from '../../leaderboard/device';
import { nameIsClean } from '../../leaderboard/names';
import { cleanName, loadPlayer, savePlayer, type Player } from '../../leaderboard/player';
import { track } from '../../leaderboard/track';
import { CardFace } from '../CardFace';
import { shareText } from '../share';
import { HAND_NAMES, STRINGS } from '../strings';
import { HAND_TIER, UI } from '../uiConfig';
import { ghostScoreAt, stepsBy, type Ghost } from './ghosts';
import { TABLE_STRINGS as T } from './strings';
import { forgetTable, loadMyTables, loadTable, publishGame, rememberTable, sitDown, tableLink, type LoadedTable, type SeatStats } from './table';

const fmt = (v: number) => v.toLocaleString('ca');

/** The table being played: its board and everyone's best game. */
export interface TableGame {
  readonly code: string;
  readonly seed: number;
  readonly host: string | null;
  readonly ghosts: readonly Ghost[];
  /** The key of the try started for this game (a new table has none: it opens with the host's game). */
  readonly seatKey: string | null;
  /** Nobody has sat yet: the table is opened when this game is sent. */
  readonly isNew: boolean;
}

/** Shares a table's link with a line that fits how full it is. */
export function inviteToTable(code: string, host: string, ghosts: readonly Ghost[], myScore: number): void {
  const text = ghosts.length <= 1 ? T.shareNew(ghosts[0]?.score ?? myScore) : T.shareTable(host, ghosts.length, ghosts[0].score);
  void shareText(text, tableLink(code)).then((shared) => shared && track('share', myScore, { mode: 'table', players: ghosts.length }));
}

// ---------------------------------------------------------------- seats

/** A player's tries, under their name: "amfitrió · 3 intents", "5 intents · superat a l'intent 4". */
function triesLine(stats: SeatStats | undefined, isHost: boolean, isMe: boolean): string {
  if (!stats) return '';
  const parts = [isHost ? T.host : '', T.tries(stats.attempts)];
  if (stats.beatAttempt !== null) parts.push(T.beat(stats.beatAttempt, stats.beatMs));
  if (stats.playing && !isMe) parts.push(T.playing);
  return parts.filter(Boolean).join(' · ');
}

function Seats({ table, me }: { table: Pick<LoadedTable, 'ghosts' | 'waiting' | 'stats' | 'hostId'>; me: string }) {
  const { ghosts, waiting, stats, hostId } = table;
  if (!ghosts.length && !waiting.length) return <p className="lb-note">{T.empty}</p>;
  return (
    <ol className="lb-list table-seats">
      {ghosts.map((g, i) => (
        <li key={g.playerId} className={g.playerId === me ? 'me' : undefined}>
          <span className="lb-pos">{i + 1}</span>
          <span className="lb-who">
            {g.name}
            <small className="lb-sub">{triesLine(stats[g.playerId], g.playerId === hostId, g.playerId === me)}</small>
          </span>
          <span className="lb-score">{fmt(g.score)}</span>
        </li>
      ))}
      {waiting.map((w) => (
        <li key={w.playerId} className={`waiting ${w.playerId === me ? 'me' : ''}`}>
          <span className="lb-pos">·</span>
          <span className="lb-who">
            {w.name}
            <small className="lb-sub">{T.tries(stats[w.playerId]?.attempts ?? 1)}</small>
          </span>
          <span className="lb-score">{stats[w.playerId]?.playing && w.playerId !== me ? T.playing : T.halfway}</span>
        </li>
      ))}
    </ol>
  );
}

function NameForm({ onSaved }: { onSaved: (player: Player) => void }) {
  const L = STRINGS.leaderboard;
  const [draft, setDraft] = useState('');
  const [refused, setRefused] = useState(false);
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!cleanName(draft)) return;
    if (!nameIsClean(draft)) { setRefused(true); return; }
    onSaved(savePlayer(draft, loadPlayer()));
  };
  return (
    <form className="lb-name" onSubmit={save}>
      <label htmlFor="table-name">{T.askName}</label>
      <div>
        <input
          id="table-name"
          value={draft}
          maxLength={LEADERBOARD.maxNameLength}
          autoComplete="nickname"
          enterKeyHint="done"
          placeholder={L.namePlaceholder}
          onChange={(e) => { setDraft(e.target.value); setRefused(false); }}
        />
        <button type="submit" disabled={!cleanName(draft)}>{L.save}</button>
      </div>
      {refused && <p className="lb-error">{L.badName}</p>}
    </form>
  );
}

// ---------------------------------------------------------------- the link's card

type LoadStatus = 'loading' | 'ready' | 'missing' | 'error';

/** What a table's link opens: who's there and how they did, and a try to play. */
export function TableLobby({ code, onPlay, onClose }: {
  code: string;
  /** With the key of the try just started. */
  onPlay: (table: LoadedTable, seatKey: string) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [table, setTable] = useState<LoadedTable | null>(null);
  // Sitting down: a name first if there's none, then the try (it counts from now on).
  const [sitting, setSitting] = useState<'idle' | 'name' | 'busy' | 'failed' | 'refused'>('idle');
  const me = deviceId();
  const takeSeat = async (t: LoadedTable, player: Player | null) => {
    if (!player) { setSitting('name'); return; }
    setSitting('busy');
    try {
      const key = await sitDown(t.code, player);
      rememberTable({ code: t.code, host: t.hostName });
      onPlay(t, key);
    } catch (error) {
      setSitting(error instanceof RejectedError ? 'refused' : 'failed');
    }
  };
  const load = () => {
    setStatus('loading');
    loadTable(code).then((t) => {
      setTable(t);
      setStatus(t ? 'ready' : 'missing');
      if (t) rememberTable({ code: t.code, host: t.hostName, score: t.ghosts.find((g) => g.playerId === me)?.score });
    }, () => setStatus('error'));
  };
  useEffect(load, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = table?.ghosts.find((g) => g.playerId === me);
  const myStats = table?.stats[me];
  return (
    <div className="overlay dim">
      <div className="sheet table-lobby" role="dialog" aria-modal="true" aria-label={table ? T.hostedBy(table.hostName) : T.loading}>
        {status === 'loading' && <p>{T.loading}</p>}
        {status === 'missing' && <p>{T.missing}</p>}
        {status === 'error' && (
          <p>{T.offline} <button type="button" className="link-btn" onClick={load}>{T.retry}</button></p>
        )}
        {status === 'ready' && table && (
          <>
            <h2>{T.hostedBy(table.hostName)}</h2>
            {table.old ? <p>{T.old}</p> : (
              <>
                <p className="table-lead">{T.lead}</p>
                <p className="table-count">{T.players(table.ghosts.length + table.waiting.length)}</p>
                <Seats table={table} me={me} />
                {mine && myStats && <p className="lb-rank">{T.myBest(mine.score, myStats.attempts)}</p>}
                {!mine && myStats && <p className="lb-rank">{T.mineLeft(myStats.attempts)}</p>}
                {sitting === 'name' && <NameForm onSaved={(p) => void takeSeat(table, p)} />}
                {sitting === 'failed' && <p className="lb-note">{T.sitFailed}</p>}
                {sitting === 'refused' && <p className="lb-note">{T.sitRefused}</p>}
                {sitting !== 'name' && (
                  <button className="btn primary big" type="button" disabled={sitting === 'busy'} onClick={() => void takeSeat(table, loadPlayer())}>
                    {sitting === 'busy' ? T.sitting : myStats ? T.again : T.sit}
                  </button>
                )}
                {mine && (
                  <button className="btn share" type="button" onClick={() => inviteToTable(table.code, table.hostName, table.ghosts, mine.score)}>{T.inviteMore}</button>
                )}
                {!myStats && <p className="table-once">{T.rules}</p>}
              </>
            )}
          </>
        )}
        <button className="btn small ghost" type="button" onClick={onClose}>{STRINGS.close}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the race while playing

interface Runner { readonly id: string; readonly name: string; readonly score: number; readonly me: boolean }

/** Who to show: the leader, whoever is just ahead of me, me and whoever is just behind. */
function shownRunners(all: readonly Runner[], max: number): { runner: Runner; place: number }[] {
  const at = all.findIndex((r) => r.me);
  const picks = [...new Set([0, at - 1, at, at + 1].filter((i) => i >= 0 && i < all.length))].slice(0, max);
  return picks.sort((a, b) => a - b).map((i) => ({ runner: all[i], place: i + 1 }));
}

/** Everyone's score at this moment of the game, ranked, and a word when a ghost makes a big hand. */
export function TableRace({ ghosts, score, elapsedMs }: { ghosts: readonly Ghost[]; score: number; elapsedMs: number }) {
  const me = deviceId();
  const runners: Runner[] = [
    { id: 'me', name: T.you, score, me: true },
    ...ghosts.map((g) => ({ id: g.playerId, name: g.playerId === me ? T.yourBest : g.name, score: ghostScoreAt(g, elapsedMs), me: false })),
  ].sort((a, b) => b.score - a.score || Number(b.me) - Number(a.me));
  const [alert, setAlert] = useState<{ id: number; text: string } | null>(null);
  const seen = useRef<number[]>([]);
  useEffect(() => {
    ghosts.forEach((g, i) => {
      const k = stepsBy(g, elapsedMs);
      const before = seen.current[i] ?? 0;
      if (k < before) seen.current[i] = k;
      if (k <= before) return;
      seen.current[i] = k;
      const big = g.steps.slice(before, k).filter((s) => HAND_TIER[s.hand] >= UI.tables.alertTier).pop();
      if (big) setAlert({ id: elapsedMs, text: T.alert(g.playerId === me ? T.yourBest : g.name, HAND_NAMES[big.hand]) });
    });
  }, [ghosts, elapsedMs, me]);
  useEffect(() => {
    if (!alert) return;
    const t = window.setTimeout(() => setAlert(null), UI.tables.alertMs);
    return () => window.clearTimeout(t);
  }, [alert]);
  return (
    <div className="table-race" aria-label={T.race}>
      {shownRunners(runners, UI.tables.raceShown).map(({ runner, place }) => (
        <span key={runner.id} className={`race-chip ${runner.me ? 'me' : ''}`}>
          <b>{place}</b>
          <span className="race-name">{runner.name}</span>
          <span className="race-score">{fmt(runner.score)}</span>
        </span>
      ))}
      {alert && <div key={alert.id} className="race-alert">{alert.text}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- after the game

type SendStatus = 'name' | 'sending' | 'failed' | 'refused' | 'done';

/** What this try did: its number, the best so far and how far the host is. */
function TryLine({ loaded, me, score, before }: { loaded: LoadedTable; me: string; score: number; before: number | undefined }) {
  const stats = loaded.stats[me];
  const mine = loaded.ghosts.find((g) => g.playerId === me);
  if (!stats || !mine) return null;
  const isHost = loaded.hostId === me;
  const hostBest = loaded.ghosts.find((g) => g.playerId === loaded.hostId)?.score ?? 0;
  const versus = isHost ? null
    : stats.beatAttempt === stats.attempts ? T.beatNow(loaded.hostName, stats.attempts)
    : stats.beatAttempt !== null ? T.beatBefore(loaded.hostName, stats.beatAttempt)
    : T.toBeat(loaded.hostName, hostBest - mine.score + 1);
  return (
    <>
      <p className="table-try">{T.attempt(stats.attempts, mine.score, before !== undefined && score > before)}</p>
      {versus && <p className="lb-rank">{versus}</p>}
    </>
  );
}

/** The end of a table game: it goes to the table (asking a name first if needed), then the table. */
export function TableResult({ table, score, moves, onAgain, onNew, onMenu }: {
  table: TableGame;
  score: number;
  moves: readonly Move[];
  /** Another try has started: its key and the table as it is now. */
  onAgain: (seatKey: string, ghosts: readonly Ghost[], host: string) => void;
  onNew: () => void;
  onMenu: () => void;
}) {
  const [status, setStatus] = useState<SendStatus>(() => (!loadPlayer() ? 'name' : 'sending'));
  const [loaded, setLoaded] = useState<LoadedTable | null>(null);
  const [again, setAgain] = useState<'idle' | 'busy' | 'failed'>('idle');
  const sent = useRef(false);
  const me = deviceId();

  const send = async (player: Player | null) => {
    setStatus('sending');
    try {
      if (player && !sent.current) {
        // Marked before sending, so a second call meanwhile can't send it twice.
        sent.current = true;
        await publishGame({ code: table.code, seed: table.seed, isNew: table.isNew, seatKey: table.seatKey, player, score, moves }).catch((error: unknown) => {
          if (error instanceof RejectedError) { setStatus('refused'); return; }
          sent.current = false;
          throw error;
        });
      }
      const t = await loadTable(table.code);
      setLoaded(t);
      const mine = t?.ghosts.find((g) => g.playerId === me);
      rememberTable({ code: table.code, host: t?.hostName ?? player?.name ?? table.host ?? '', score: mine?.score });
      setStatus((s) => (s === 'refused' ? s : 'done'));
    } catch {
      setStatus('failed');
    }
  };

  const playAgain = async () => {
    const player = loadPlayer();
    if (!player) { setStatus('name'); return; }
    setAgain('busy');
    try {
      const key = await sitDown(table.code, player);
      onAgain(key, loaded?.ghosts ?? table.ghosts, loaded?.hostName ?? table.host ?? player.name);
    } catch {
      setAgain('failed');
    }
  };

  useEffect(() => {
    if (status === 'sending') void send(loadPlayer());
    // Once per end screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ghosts = loaded?.ghosts ?? [];
  const place = ghosts.findIndex((g) => g.playerId === me) + 1;
  const host = loaded?.hostName ?? table.host ?? loadPlayer()?.name ?? '';
  // Sent (or refused): another try is a tap away.
  const settled = status === 'done' || status === 'refused';
  return (
    <div className="overlay dim">
      <div className="sheet over table-result">
        <h2>{STRINGS.gameOver}</h2>
        <p className="over-score">{fmt(score)}</p>
        {status === 'name' && <NameForm onSaved={(p) => void send(p)} />}
        {status === 'sending' && <p className="lb-note">{T.sending}</p>}
        {status === 'failed' && (
          <p className="lb-note">{T.failed} <button type="button" className="link-btn" onClick={() => void send(loadPlayer())}>{T.retry}</button></p>
        )}
        {status === 'refused' && <p className="lb-note">{T.refused}</p>}
        {settled && loaded && (
          <>
            <TryLine loaded={loaded} me={me} score={score} before={table.ghosts.find((g) => g.playerId === me)?.score} />
            <h3>{T.hostedBy(host)}</h3>
            {place > 0 && ghosts.length > 1 && <p className="table-place">{T.place(place, ghosts.length)}</p>}
            {ghosts.length === 1 && place === 1 && <p className="lb-rank">{T.alone}</p>}
            <Seats table={loaded} me={me} />
          </>
        )}
        {settled && (
          <>
            {again === 'failed' && <p className="lb-note">{T.againFailed}</p>}
            <button className="btn primary big" type="button" disabled={again === 'busy'} onClick={() => void playAgain()}>
              {again === 'busy' ? T.sitting : T.again}
            </button>
            <button className="btn share" type="button" onClick={() => inviteToTable(table.code, host, ghosts, score)}>
              {ghosts.length <= 1 ? T.invite : T.inviteMore}
            </button>
          </>
        )}
        <div className="menu-row">
          <button className="btn small" type="button" onClick={onNew}>{T.newTableShort}</button>
          <button className="btn small ghost" type="button" onClick={onMenu}>{STRINGS.quit}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the first time

const INTRO_CARDS = parseCards('AS KS QH JD 10C');

/** How a table works, in four pictures: shown before the first table game (or the first table link). */
export function TablesIntro({ fromLink, onDone }: { fromLink: boolean; onDone: () => void }) {
  const I = T.intro;
  return (
    <div className="overlay dim">
      <div className="sheet tables-intro" role="dialog" aria-modal="true" aria-label={I.title}>
        <h2>🃏 {I.title}</h2>
        <p className="intro-lead">{I.lead}</p>
        <ol className="intro-steps">
          <li>
            <span className="intro-num">1</span>
            <div>
              <h3>{I.step1}</h3>
              <div className="intro-same" aria-hidden="true">
                {[I.you, 'Anna', 'Pau'].map((who) => (
                  <div key={who} className="intro-player">
                    <div className="intro-cards">{INTRO_CARDS.slice(0, 3).map((c, i) => <div key={i} className="mini"><CardFace card={c} /></div>)}</div>
                    <span>{who}</span>
                  </div>
                ))}
              </div>
              <p>{I.step1Text}</p>
            </div>
          </li>
          <li>
            <span className="intro-num">2</span>
            <div>
              <h3>{I.step2}</h3>
              <div className="intro-link" aria-hidden="true"><span>🔗</span><code>pokerlunch/#t=…</code><span>💬</span></div>
              <p>{I.step2Text}</p>
            </div>
          </li>
          <li>
            <span className="intro-num">3</span>
            <div>
              <h3>{I.step3}</h3>
              <div className="table-race intro-race" aria-hidden="true">
                <span className="race-chip"><b>1</b><span className="race-name">Anna</span><span className="race-score">{fmt(4200)}</span></span>
                <span className="race-chip me"><b>2</b><span className="race-name">{I.you}</span><span className="race-score">{fmt(3850)}</span></span>
                <span className="race-chip"><b>3</b><span className="race-name">Pau</span><span className="race-score">{fmt(2100)}</span></span>
              </div>
              <p>{I.step3Text}</p>
            </div>
          </li>
          <li>
            <span className="intro-num">4</span>
            <div>
              <h3>{I.step4}</h3>
              <div className="intro-row" aria-hidden="true">
                <span className="lb-who">{I.you}<small className="lb-sub">{I.tries}</small></span>
                <span className="lb-score">{fmt(5300)}</span>
              </div>
              <p>{I.step4Text}</p>
            </div>
          </li>
        </ol>
        <button className="btn primary big" type="button" onClick={onDone}>{fromLink ? I.see : I.go}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- my tables

export function MyTablesSheet({ onOpen, onClose }: { onOpen: (code: string) => void; onClose: () => void }) {
  const [list, setList] = useState(loadMyTables);
  return (
    <div className="overlay dim" onClick={onClose}>
      <div className="sheet ranking-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={T.mine}>
        <h2>{T.mine}</h2>
        {list.length ? (
          <ol className="lb-list my-tables">
            {list.map((t) => (
              <li key={t.code}>
                <button type="button" onClick={() => onOpen(t.code)}>
                  <span className="lb-who">{T.hostedBy(t.host)}</span>
                  <span className="lb-score">{T.mineScore(t.score)}</span>
                </button>
                <button type="button" className="my-tables-forget" onClick={() => setList(forgetTable(t.code))} aria-label={T.forget(t.host)}>✕</button>
              </li>
            ))}
          </ol>
        ) : <p>{T.mineEmpty}</p>}
        <button className="btn primary" type="button" onClick={onClose}>{STRINGS.close}</button>
      </div>
    </div>
  );
}
