// Tables on screen: the card a link opens, the race beside the board while playing, the table after
// the game, and the list of my tables.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Move } from '../../engine/types';
import { RejectedError } from '../../leaderboard/api';
import { LEADERBOARD } from '../../leaderboard/config';
import { deviceId } from '../../leaderboard/device';
import { nameIsClean } from '../../leaderboard/names';
import { cleanName, loadPlayer, savePlayer, type Player } from '../../leaderboard/player';
import { track } from '../../leaderboard/track';
import { shareText } from '../share';
import { HAND_NAMES, STRINGS } from '../strings';
import { HAND_TIER, UI } from '../uiConfig';
import { ghostScoreAt, stepsBy, type Ghost } from './ghosts';
import { TABLE_STRINGS as T } from './strings';
import { loadMyTables, loadTable, publishSeat, rememberTable, startedTable, tableLink, type LoadedTable } from './table';

const fmt = (v: number) => v.toLocaleString('ca');

/** The table being played: its board, the others' games and whether this game counts. */
export interface TableGame {
  readonly code: string;
  readonly seed: number;
  readonly host: string | null;
  readonly ghosts: readonly Ghost[];
  /** The player's first game at this table: it takes a seat. Later ones are practice. */
  readonly counts: boolean;
  /** Nobody has sat yet: the table is opened when this game is sent. */
  readonly isNew: boolean;
}

/** Shares a table's link with a line that fits how full it is. */
export function inviteToTable(code: string, host: string, ghosts: readonly Ghost[], myScore: number): void {
  const text = ghosts.length <= 1 ? T.shareNew(ghosts[0]?.score ?? myScore) : T.shareTable(host, ghosts.length, ghosts[0].score);
  void shareText(text, tableLink(code)).then((shared) => shared && track('share', myScore, { mode: 'table', players: ghosts.length }));
}

// ---------------------------------------------------------------- seats

function Seats({ ghosts, me, practice }: { ghosts: readonly Ghost[]; me: string; practice?: number }) {
  if (!ghosts.length && practice === undefined) return <p className="lb-note">{T.empty}</p>;
  return (
    <ol className="lb-list table-seats">
      {ghosts.map((g, i) => (
        <li key={g.playerId} className={g.playerId === me ? 'me' : undefined}>
          <span className="lb-pos">{i + 1}</span>
          <span className="lb-who">{g.name}</span>
          <span className="lb-score">{fmt(g.score)}</span>
        </li>
      ))}
      {practice !== undefined && (
        <li className="practice">
          <span className="lb-pos">·</span>
          <span className="lb-who">{T.practiceNote}</span>
          <span className="lb-score">{fmt(practice)}</span>
        </li>
      )}
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

/** What a table's link opens: who's there and how they did, and a seat to play. */
export function TableLobby({ code, onPlay, onClose }: {
  code: string;
  onPlay: (table: LoadedTable, counts: boolean) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [table, setTable] = useState<LoadedTable | null>(null);
  const me = deviceId();
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
                <p className="table-count">{T.players(table.ghosts.length)}</p>
                <Seats ghosts={table.ghosts} me={me} />
                {mine ? (
                  <>
                    <p className="lb-rank">{T.played(mine.score)}</p>
                    <button className="btn share" type="button" onClick={() => inviteToTable(table.code, table.hostName, table.ghosts, mine.score)}>{T.inviteMore}</button>
                    <button className="btn primary" type="button" onClick={() => onPlay(table, false)}>{T.practice}</button>
                  </>
                ) : startedTable(table.code) ? (
                  <>
                    <p className="lb-rank">{T.left}</p>
                    <button className="btn primary" type="button" onClick={() => onPlay(table, false)}>{T.practice}</button>
                  </>
                ) : (
                  <button className="btn primary big" type="button" onClick={() => onPlay(table, true)}>{T.sit}</button>
                )}
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
  const runners: Runner[] = [
    { id: 'me', name: T.you, score, me: true },
    ...ghosts.map((g) => ({ id: g.playerId, name: g.name, score: ghostScoreAt(g, elapsedMs), me: false })),
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
      if (big) setAlert({ id: elapsedMs, text: T.alert(g.name, HAND_NAMES[big.hand]) });
    });
  }, [ghosts, elapsedMs]);
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

/** The end of a table game: it takes its seat (asking a name first if needed), then the table. */
export function TableResult({ table, score, moves, onAgain, onNew, onMenu }: {
  table: TableGame;
  score: number;
  moves: readonly Move[];
  onAgain: () => void;
  onNew: () => void;
  onMenu: () => void;
}) {
  const [status, setStatus] = useState<SendStatus>(() => (table.counts && !loadPlayer() ? 'name' : 'sending'));
  const [loaded, setLoaded] = useState<LoadedTable | null>(null);
  const sent = useRef(false);
  const me = deviceId();

  const send = async (player: Player | null) => {
    setStatus('sending');
    try {
      if (table.counts && player && !sent.current) {
        // Marked before sending, so a second call meanwhile can't send it twice.
        sent.current = true;
        await publishSeat({ code: table.code, seed: table.seed, isNew: table.isNew, player, score, moves }).catch((error: unknown) => {
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

  useEffect(() => {
    if (status === 'sending') void send(loadPlayer());
    // Once per end screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ghosts = loaded?.ghosts ?? [];
  const place = ghosts.findIndex((g) => g.playerId === me) + 1;
  const host = loaded?.hostName ?? table.host ?? loadPlayer()?.name ?? '';
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
        {(status === 'done' || status === 'refused') && loaded && (
          <>
            <h3>{T.hostedBy(host)}</h3>
            {table.counts && place > 0 && (
              <p className="lb-rank">{ghosts.length === 1 ? T.alone : T.place(place, ghosts.length)}</p>
            )}
            <Seats ghosts={ghosts} me={me} practice={table.counts ? undefined : score} />
            <button className="btn primary big" type="button" onClick={() => inviteToTable(table.code, host, ghosts, score)}>
              {ghosts.length <= 1 ? T.invite : T.inviteMore}
            </button>
          </>
        )}
        <button className="btn share" type="button" onClick={onNew}>{T.newTable}</button>
        <div className="menu-row">
          <button className="btn small" type="button" onClick={onAgain}>{T.practiceShort}</button>
          <button className="btn small ghost" type="button" onClick={onMenu}>{STRINGS.quit}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- my tables

export function MyTablesSheet({ onOpen, onClose }: { onOpen: (code: string) => void; onClose: () => void }) {
  const [list] = useState(loadMyTables);
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
              </li>
            ))}
          </ol>
        ) : <p>{T.mineEmpty}</p>}
        <button className="btn primary" type="button" onClick={onClose}>{STRINGS.close}</button>
      </div>
    </div>
  );
}
