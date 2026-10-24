// Screens: menu, game (HUD, board, hand ladder), pause, end of game, how to play, tables.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { handAllowed, type TraceStatus } from '../engine/game';
import { parseCards } from '../engine/notation';
import { HAND_TYPES, type GameState, type HandType } from '../engine/types';
import { playRung, playSound, setMuted, unlockAudio } from './audio';
import { Board } from './Board';
import { NeighbourRose, TraceDemo } from './TraceDemo';
import { CardFace, CardSprite } from './CardFace';
import { vibrate } from './haptics';
import { loadBest, loadFlag, saveBest, saveFlag } from './storage';
import { fmt, LANG, LANG_NAMES, LANGS, setLang } from './i18n/lang';
import { HAND_EXAMPLES, HAND_NAMES, HAND_RULES, STRINGS } from './strings';
import { BIG_TIER, HAND_TIER, ROYAL_TIER, UI } from './uiConfig';
import { useGame, type Floater } from './useGame';
import { DEFAULT_CONFIG } from '../engine/config';
import { LEADERBOARD, leaderboardEnabled } from '../leaderboard/config';
import { Leaderboard } from '../leaderboard/Leaderboard';
import { track } from '../leaderboard/track';
import { installMode } from './install';
import { TOURS } from '../engine/tour/levels';
import { allLevels, currentLevelId, isUnlocked, newlyOpened, recordResult, starsMissing, totalStars, type TourProgress } from '../engine/tour/progress';
import { playRun, startRun, tickRun, type TourRun } from '../engine/tour/run';
import { playSeed } from '../engine/tour/setup';
import type { Level, Tour } from '../engine/tour/schema';
import { loadTourProgress, saveTourProgress } from './tour/progressStore';
import { TOUR_STRINGS, tourName } from './tour/strings';
import { Champion } from './tour/Champion';
import { GoalsBar, isChampion, LevelIntro, levelNumber, TourMap, TourResult } from './tour/TourUI';
import type { GameDriver } from './useGame';
import type { Ghost } from './tables/ghosts';
import { clearTableLink, readTableLink, type LoadedTable } from './tables/table';
import { MyTablesSheet, TableCreate, TableLobby, TableRace, TableResult, TablesIntro, type TableGame } from './tables/TableUI';
import { TABLE_STRINGS } from './tables/strings';

type Mode = 'free' | 'table' | 'tour';

interface Trace {
  readonly length: number;
  readonly status: TraceStatus | null;
  readonly hand: HandType | null;
  /** Base points of the hand (before combo and golden cards). */
  readonly points: number;
}

export function App() {
  const [best, setBest] = useState(() => loadBest(UI.bestKey));
  const [newBest, setNewBest] = useState(false);
  const [sound, setSound] = useState(() => loadFlag(UI.soundKey, true));
  const [mode, setMode] = useState<Mode>('free');
  const [sheet, setSheet] = useState<'help' | 'ranking' | 'tables' | null>(null);
  const [trace, setTrace] = useState<Trace>({ length: 0, status: null, hand: null, points: 0 });
  const modeRef = useRef<Mode>('free');
  // Poker Tour: the map, the level picked, the run being played and the saved progress.
  const [tourView, setTourView] = useState<'map' | 'intro' | null>(null);
  const [tourLevel, setTourLevel] = useState<Level | null>(null);
  const [tourRun, setTourRun] = useState<TourRun | null>(null);
  const tourRunRef = useRef<TourRun | null>(null);
  const [tourProgress, setTourProgress] = useState(loadTourProgress);
  const [tourNewTour, setTourNewTour] = useState<Tour | null>(null);
  // The plane flies to a city that has just opened; the champion's show after the last level.
  const [tourCelebrate, setTourCelebrate] = useState<string | null>(null);
  const [justChampion, setJustChampion] = useState(false);
  const [champion, setChampion] = useState<'intro' | 'card' | null>(null);
  const pendingStart = useRef<Mode | null>(null);
  // Leaving a game before the end asks first: the score of a game left halfway is lost.
  const [quitAsk, setQuitAsk] = useState(false);
  // Tables: the one a link (or my list) opened, and the one being played.
  const [lobbyCode, setLobbyCode] = useState<string | null>(readTableLink);
  const [table, setTableState] = useState<TableGame | null>(null);
  const tableRef = useRef<TableGame | null>(null);
  const setTable = (t: TableGame | null) => {
    tableRef.current = t;
    setTableState(t);
  };

  const onOver = useCallback((s: GameState) => {
    if (modeRef.current === 'tour') {
      // The Tour keeps its own records (stars and best score per level); the stats only say how
      // far players get: which level, won or lost, with how many stars (no ranking).
      const run = tourRunRef.current;
      if (run) track('game_end', s.score, { mode: 'tour', level: run.level.id, won: run.status === 'won', stars: run.stars, moves: s.moves });
      if (run?.status === 'won') {
        setTourProgress((p) => {
          const next = recordResult(p, run.level.id, run.stars, run.game.score);
          saveTourProgress(next);
          setTourNewTour(newlyOpened(TOURS, p, next)[0] ?? null);
          setJustChampion(!isChampion(TOURS, p) && isChampion(TOURS, next));
          return next;
        });
        window.setTimeout(() => playSound('newBest'), 500);
      } else {
        setTourNewTour(null);
        setJustChampion(false);
      }
      return;
    }
    setBest((b) => {
      if (s.score > b) {
        saveBest(UI.bestKey, s.score);
        setNewBest(true);
        window.setTimeout(() => playSound('newBest'), 500);
        return s.score;
      }
      setNewBest(false);
      return b;
    });
    track('game_end', s.score, { mode: modeRef.current, moves: s.moves });
  }, []);

  const game = useGame(onOver);
  const { state, frame, phase, paused } = game;

  useEffect(() => setMuted(!sound), [sound]);

  useEffect(() => {
    track('visit', undefined, { standalone: installMode() === null, ...(lobbyCode ? { table: lobbyCode } : {}) });
    clearTableLink();
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // A table's link opened with the game already open (only the #t= part changes).
  useEffect(() => {
    const onHash = () => {
      const code = readTableLink();
      if (!code) return;
      clearTableLink();
      game.quit();
      setTourView(null);
      setLobbyCode(code);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio can only start inside a touch.
  useEffect(() => {
    const unlock = (e: Event) => unlockAudio(e.type !== 'pointerdown');
    // Capture: a sheet that stops a click from bubbling doesn't stop the unlock.
    for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { passive: true, capture: true });
    return () => { for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) window.removeEventListener(ev, unlock, { capture: true }); };
  }, []);

  const begin = (m: Mode) => {
    // The first game starts with how to play.
    if (!loadFlag(UI.helpSeenKey, false)) {
      pendingStart.current = m;
      setSheet('help');
      return;
    }
    setNewBest(false);
    modeRef.current = m;
    game.setDriver(null);
    const t = m === 'table' ? tableRef.current : null;
    track('game_start', undefined, { mode: m, ...(t ? { table: t.code } : {}) });
    setMode(m);
    game.start(t ? t.seed : randomSeed());
  };

  // ------------------------------------------------------------ Tables
  // The first table (opened here or from a link) starts with how tables work.
  const [introSeen, setIntroSeen] = useState(() => loadFlag(UI.tablesIntroKey, false));
  const [introNew, setIntroNew] = useState(false);
  const seeIntro = () => {
    saveFlag(UI.tablesIntroKey, true);
    setIntroSeen(true);
  };
  // A new table is opened on the server before anyone plays it (its seed while it's being opened),
  // and its card then asks to invite first.
  const [creating, setCreating] = useState<number | null>(null);
  const [lobbyFresh, setLobbyFresh] = useState(false);
  /** A new table: a fresh board that everyone, its host too, plays on equal terms. */
  const newTable = () => {
    if (phase !== 'menu') game.quit();
    if (!introSeen) { setIntroNew(true); return; }
    setCreating(randomSeed());
  };
  const tableCreated = (code: string) => {
    setCreating(null);
    setLobbyFresh(true);
    setLobbyCode(code);
  };
  const closeLobby = () => {
    setLobbyCode(null);
    setLobbyFresh(false);
  };
  const sitAt = (t: LoadedTable, seatKey: string) => {
    closeLobby();
    setTable({ code: t.code, seed: t.seed, host: t.hostName, ghosts: t.ghosts, seatKey });
    begin('table');
  };
  /** Another try at a table (already started on the server), against everyone's best (mine included). */
  const tableAgain = (t: TableGame, seatKey: string, ghosts: readonly Ghost[], host: string) => {
    setTable({ ...t, ghosts, host, seatKey });
    begin('table');
  };

  // ------------------------------------------------------------ Poker Tour
  const tourDriver = (level: Level): GameDriver => ({
    init: () => {
      const run = startRun(level, playSeed(level));
      tourRunRef.current = run;
      setTourRun(run);
      return run.game;
    },
    play: (_state, move) => {
      const r = playRun(tourRunRef.current!, move);
      tourRunRef.current = r.run;
      setTourRun(r.run);
      return { state: r.run.game, events: r.events, board: r.board, rush: r.rush };
    },
    tick: (_state, ms) => {
      const before = tourRunRef.current!;
      const r = tickRun(before, ms);
      tourRunRef.current = r.run;
      if (r.run.status !== before.status) setTourRun(r.run);
      return { state: r.run.game, events: r.events };
    },
  });

  const playLevel = (level: Level) => {
    setTourLevel(level);
    setTourView(null);
    setNewBest(false);
    modeRef.current = 'tour';
    setMode('tour');
    game.setDriver(tourDriver(level));
    track('game_start', undefined, { mode: 'tour', level: level.id });
    game.start(level.seed);
  };

  const openTour = () => setTourView('map');
  const pickLevel = (level: Level) => {
    setTourCelebrate(null);
    setTourLevel(level);
    setTourView('intro');
  };
  const backToMap = () => {
    game.quit();
    setTourView('map');
  };
  const nextTourLevel = (level: Level | null): Level | null => {
    if (!level) return null;
    const list = allLevels(TOURS);
    return list[list.findIndex((x) => x.level.id === level.id) + 1]?.level ?? null;
  };
  // After a level: the next one if it is open; if its tour still waits for stars, how many.
  const following = nextTourLevel(tourLevel);
  const nextOpen = following && isUnlocked(TOURS, tourProgress, following.id) ? following : null;
  const followingTour = following ? TOURS.find((t) => t.levels.includes(following)) : undefined;
  const nextLocked = following && !nextOpen && followingTour && starsMissing(followingTour, tourProgress) > 0
    ? { tour: tourName(followingTour), missing: starsMissing(followingTour, tourProgress) }
    : null;

  // The last level of the Tour: after the stars land, the champion's show starts by itself.
  useEffect(() => {
    if (!justChampion || phase !== 'over' || champion) return;
    const t = window.setTimeout(() => setChampion('intro'), 3200);
    return () => clearTimeout(t);
  }, [justChampion, phase, champion]);

  useEffect(() => {
    if (phase !== 'playing') setQuitAsk(false);
  }, [phase]);

  const closeHelp = (dontShowAgain: boolean) => {
    // Shown before a game: it comes back next time unless the player ticked "don't show again".
    if (pendingStart.current) saveFlag(UI.helpSeenKey, dontShowAgain);
    setSheet(null);
    const m = pendingStart.current;
    pendingStart.current = null;
    if (m) begin(m);
  };

  const onTrace = useCallback((length: number, status: TraceStatus | null, hand: HandType | null, points: number, grew: boolean) => {
    setTrace({ length, status, hand, points });
    if (grew && length > 0) {
      playRung(length - 1, status === 'valid');
      vibrate('step');
    }
  }, []);

  const onReject = useCallback(() => {
    playSound('invalid');
    vibrate('invalid');
  }, []);

  const toggleSound = () => {
    setSound((s) => {
      saveFlag(UI.soundKey, !s);
      return !s;
    });
  };

  const left = Math.max(0, state.timeLimitMs - state.elapsedMs);
  const playing = phase === 'playing' || phase === 'countdown';
  const enabled = phase === 'playing' && !paused && !game.busy;

  return (
    <div className={`app ${playing || phase === 'over' ? 'in-game' : 'in-menu'}`}>
      <CardSprite />
      <header className="hud">
        <div className="hud-cell hud-score">
          <span className="hud-label">{STRINGS.score}</span>
          <RollingScore value={state.score} />
        </div>
        <div className={`hud-cell hud-clock ${left <= UI.clockWarningMs && phase === 'playing' ? 'warn' : ''}`}>
          {mode === 'tour' && state.config.mode === 'moves'
            ? <span className="hud-value clock moves">{Math.max(0, state.config.maxMoves - state.moves)} <small>{TOUR_STRINGS.movesLeft}</small></span>
            : <span className="hud-value clock">{clockText(left)}</span>}
        </div>
        <div className="hud-cell hud-right">
          <button className="icon-btn" type="button" onClick={() => game.setPaused(true)} aria-label={STRINGS.pause} disabled={phase !== 'playing'}>
            <PauseIcon />
          </button>
          <span className="hud-best">{STRINGS.best} {fmt(mode === 'tour' && tourLevel ? tourProgress.levels[tourLevel.id]?.best ?? 0 : best)}</span>
        </div>
      </header>

      {mode === 'tour' && tourRun && playing && <GoalsBar run={tourRun} />}
      {mode === 'table' && table && playing && <TableRace ghosts={table.ghosts} score={state.score} elapsedMs={state.elapsedMs} />}

      <main className="stage">
        <TraceLabel trace={trace} allowed={!trace.hand || handAllowed(trace.hand, state.config, state.tokens)} />
        <div className="board-wrap">
          <Board
            board={state.board}
            frame={frame}
            config={state.config}
            tokens={state.tokens}
            hint={game.hint}
            guide={game.guide}
            enabled={enabled}
            faceDown={game.faceDown}
            onPlay={game.play}
            onActivity={game.activity}
            onTrace={onTrace}
            onReject={onReject}
          />
          <Floaters floaters={game.floaters} rows={state.config.rows} cols={state.config.cols} />
          {game.banner && game.banner.tier < ROYAL_TIER && <HandBanner key={game.banner.id} hand={game.banner.hand} points={game.banner.points} />}
        </div>
      </main>

      <Variety run={state.variety} length={state.config.varietyLength} multiplier={state.config.varietyMultiplier} />

      <footer className={`ladder ${mode === 'tour' ? 'tour' : ''}`} aria-label={STRINGS.hands}>
        {HAND_TYPES.map((h) => {
          const max = state.config.hands[h].tokens;
          const left = max === undefined ? null : state.tokens[h];
          return (
            <div key={h} className={`rung tier-${HAND_TIER[h]} ${trace.hand === h ? 'on' : ''} ${state.handCounts[h] ? 'made' : ''} ${left === 0 ? 'spent' : ''}`}>
              <span className="rung-name">{HAND_NAMES[h]}</span>
              <span className="rung-count">{state.handCounts[h] || '·'}</span>
              {max !== undefined && (
                <span className="rung-tokens" aria-label={STRINGS.tokensLeft(left ?? 0)}>
                  {Array.from({ length: max }, (_, i) => <i key={i} className={i < (left ?? 0) ? 'full' : ''} />)}
                </span>
              )}
            </div>
          );
        })}
      </footer>

      {game.banner && game.banner.tier >= 5 && game.banner.tier < ROYAL_TIER && <div key={`dim-${game.banner.id}`} className="big-dim" style={{ animationDuration: `${UI.anim.banner[game.banner.tier]}ms` }} />}
      {game.banner?.tier === ROYAL_TIER && <RoyalTakeover key={game.banner.id} />}

      {phase === 'countdown' && game.countdown !== null && (
        <div className="overlay countdown" key={game.countdown}>
          <span className="count">{game.countdown > 0 ? game.countdown : STRINGS.go}</span>
        </div>
      )}

      {phase === 'playing' && paused && !quitAsk && (
        <div className="overlay dim">
          <div className="sheet">
            <h2>{STRINGS.paused}</h2>
            <button className="btn primary" type="button" onClick={() => game.setPaused(false)}>{STRINGS.resume}</button>
            <button className="btn sound-toggle" type="button" onClick={toggleSound} aria-pressed={!sound}><SoundIcon on={sound} />{sound ? STRINGS.soundMute : STRINGS.soundUnmute}</button>
            <button className="btn" type="button" onClick={() => setSheet('help')}>{STRINGS.howTo}</button>
            <button className="btn ghost" type="button" onClick={() => setQuitAsk(true)}>{mode === 'tour' ? TOUR_STRINGS.map : STRINGS.quit}</button>
          </div>
        </div>
      )}

      {phase === 'playing' && paused && quitAsk && (
        <div className="overlay dim">
          <div className="sheet" role="alertdialog" aria-labelledby="quit-ask-title">
            <h2 id="quit-ask-title">{STRINGS.quitAsk.title}</h2>
            <p>{mode === 'tour' ? STRINGS.quitAsk.tour : mode === 'table' ? STRINGS.quitAsk.table : STRINGS.quitAsk.body}</p>
            <button className="btn primary" type="button" onClick={() => { setQuitAsk(false); game.setPaused(false); }}>{STRINGS.quitAsk.no}</button>
            <button className="btn ghost" type="button" onClick={() => { setQuitAsk(false); if (mode === 'tour') backToMap(); else game.quit(); }}>{STRINGS.quitAsk.yes}</button>
          </div>
        </div>
      )}

      {phase === 'menu' && (
        <Menu
          best={best}
          sound={sound}
          onPlay={() => begin('free')}
          onTable={leaderboardEnabled() ? newTable : undefined}
          onHelp={() => setSheet('help')}
          onSound={toggleSound}
          onTour={openTour}
          onRanking={leaderboardEnabled() ? () => { track('ranking_view'); setSheet('ranking'); } : undefined}
          onTables={leaderboardEnabled() ? () => setSheet('tables') : undefined}
          tourInfo={tourMenuInfo(tourProgress)}
        />
      )}

      {phase === 'over' && mode === 'tour' && tourRun && tourView === null && (
        <TourResult
          run={tourRun}
          number={levelNumber(TOURS, tourRun.level.id)}
          nextLevel={nextOpen}
          needStars={nextLocked}
          newTour={tourNewTour ? tourName(tourNewTour) : null}
          champion={justChampion}
          onChampion={() => setChampion('intro')}
          onNext={() => {
            if (!nextOpen) return;
            game.quit();
            // A new city: first the map, with the plane flying there.
            if (tourNewTour) {
              setTourCelebrate(tourNewTour.id);
              setTourView('map');
            } else pickLevel(nextOpen);
          }}
          onRetry={() => tourLevel && playLevel(tourLevel)}
          onMap={backToMap}
        />
      )}

      {tourView === 'map' && phase === 'menu' && (
        <TourMap
          tours={TOURS}
          progress={tourProgress}
          celebrate={tourCelebrate}
          onPick={pickLevel}
          onClose={() => { setTourCelebrate(null); setTourView(null); }}
          onChampion={() => setChampion('card')}
        />
      )}
      {tourView === 'intro' && tourLevel && (
        <LevelIntro
          level={tourLevel}
          number={levelNumber(TOURS, tourLevel.id)}
          best={tourProgress.levels[tourLevel.id]?.best ?? null}
          onPlay={() => playLevel(tourLevel)}
          onClose={() => setTourView('map')}
        />
      )}

      {champion && (
        <Champion
          stars={totalStars(tourProgress)}
          maxStars={allLevels(TOURS).length * 3}
          levels={allLevels(TOURS).length}
          cities={TOURS.map(tourName)}
          intro={champion === 'intro'}
          onShared={() => track('share', totalStars(tourProgress), { mode: 'tour', kind: 'champion' })}
          onClose={() => {
            setChampion(null);
            setJustChampion(false);
            if (phase === 'over') game.quit();
            setTourView('map');
          }}
        />
      )}

      {phase === 'over' && mode === 'free' && game.stats && (
        <GameOver
          score={state.score}
          best={best}
          newBest={newBest}
          stats={game.stats}
          ranking={leaderboardEnabled() ? LEADERBOARD.rankingId : null}
          onAgain={() => begin('free')}
          onMenu={game.quit}
        />
      )}

      {phase === 'over' && mode === 'table' && table && (
        <TableResult
          key={`${table.code}-${table.seatKey}-${state.moves}`}
          table={table}
          score={state.score}
          moves={state.history}
          onAgain={(key, ghosts, host) => tableAgain(table, key, ghosts, host)}
          onNew={newTable}
          onMenu={game.quit}
        />
      )}

      {lobbyCode && phase === 'menu' && (
        introSeen
          ? <TableLobby key={lobbyCode} code={lobbyCode} fresh={lobbyFresh} onPlay={sitAt} onClose={closeLobby} />
          : <TablesIntro fromLink onDone={seeIntro} />
      )}

      {introNew && phase === 'menu' && (
        <TablesIntro fromLink={false} onDone={() => { seeIntro(); setIntroNew(false); setCreating(randomSeed()); }} />
      )}
      {creating !== null && phase === 'menu' && (
        <TableCreate seed={creating} onCreated={tableCreated} onClose={() => setCreating(null)} />
      )}

      {sheet === 'help' && <Help auto={pendingStart.current !== null} onClose={closeHelp} />}
      {sheet === 'ranking' && <RankingSheet onClose={() => setSheet(null)} />}
      {sheet === 'tables' && <MyTablesSheet onOpen={(code) => { setSheet(null); setLobbyCode(code); }} onClose={() => setSheet(null)} />}
    </div>
  );
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

function clockText(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function TraceLabel({ trace, allowed }: { trace: Trace; allowed: boolean }) {
  let text = '';
  let cls = '';
  if (trace.length && trace.hand && !allowed) {
    text = STRINGS.noTokens(HAND_NAMES[trace.hand]);
    cls = 'spent';
  } else if (trace.length && trace.hand) {
    text = `${HAND_NAMES[trace.hand]} · ${fmt(trace.points)}`;
    cls = `valid tier-${HAND_TIER[trace.hand]}`;
  } else if (trace.length >= 2 && trace.status === 'invalid') {
    text = STRINGS.notAHand;
    cls = 'invalid';
  } else if (trace.length) {
    text = '• '.repeat(trace.length).trim();
    cls = 'partial';
  }
  return <div className={`trace-label ${cls}`} aria-live="polite">{text}</div>;
}

/** The variety run: the different hands played in a row so far, and the slots left to the bonus. */
function Variety({ run, length, multiplier }: { run: readonly HandType[]; length: number; multiplier: number }) {
  return (
    <div className="variety" aria-label={STRINGS.variety.label(length, multiplier)}>
      <span className="variety-label">{STRINGS.variety.title}</span>
      {Array.from({ length }, (_, i) => (
        <span key={i} className={`variety-slot ${run[i] ? 'filled' : ''}`}>{run[i] ? HAND_NAMES[run[i]] : '?'}</span>
      ))}
      <span className="variety-prize">{STRINGS.variety.equals} {STRINGS.times(multiplier)}</span>
      <VarietyTip run={run} />
    </div>
  );
}

/** The first time a player starts a variety run, a short tip says what the slots are for. */
function VarietyTip({ run }: { run: readonly HandType[] }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (run.length !== 1 || loadFlag(UI.varietyTipKey, false)) return;
    saveFlag(UI.varietyTipKey, true);
    setShow(true);
    const t = window.setTimeout(() => setShow(false), UI.varietyTipMs);
    return () => window.clearTimeout(t);
  }, [run.length]);
  return show ? <div className="variety-tip">{STRINGS.variety.tip}</div> : null;
}

const VARIETY_DEMO: readonly HandType[] = ['trips', 'straight', 'fullHouse'];

/** The help's variety run: three different hands fill the slots, the third pays ×2. */
function VarietyDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setStep((s) => (s + 1) % 6), 800);
    return () => window.clearInterval(t);
  }, []);
  const filled = Math.min(step, 3);
  return (
    <div className="variety variety-demo" aria-hidden="true">
      {VARIETY_DEMO.map((h, i) => (
        <span key={i} className={`variety-slot ${i < filled ? 'filled' : ''}`}>{i < filled ? HAND_NAMES[h] : '?'}</span>
      ))}
      <span className={`variety-prize ${filled === 3 ? 'won' : ''}`}>{STRINGS.times(2)}</span>
      {filled === 3 && <span className="variety-demo-power">{STRINGS.help.varietyPower}</span>}
    </div>
  );
}

function HandBanner({ hand, points }: { hand: HandType; points: number }) {
  const tier = HAND_TIER[hand];
  return (
    <div className={`hand-banner tier-${tier}`} style={{ animationDuration: `${UI.anim.banner[tier]}ms` }}>
      <span className="hand-name">{HAND_NAMES[hand]}</span>
      {tier >= 1 && <span className="hand-points">{STRINGS.points(points)}</span>}
      {tier >= BIG_TIER && <span className="hand-burst" aria-hidden="true" />}
    </div>
  );
}

function RoyalTakeover() {
  const cards = useMemo(() => parseCards(HAND_EXAMPLES.royalFlush), []);
  return (
    <div className="royal" style={{ animationDuration: `${UI.anim.banner[4]}ms` }} aria-hidden="true">
      <div className="royal-rays" />
      <div className="royal-title">{HAND_NAMES.royalFlush}</div>
      <div className="royal-cards">
        {cards.map((c, i) => <div key={i} className="royal-card" style={{ ['--i' as string]: i }}><CardFace card={c} /></div>)}
      </div>
    </div>
  );
}

function Floaters({ floaters, rows, cols }: { floaters: readonly Floater[]; rows: number; cols: number }) {
  return (
    <div className="floaters" aria-hidden="true">
      {floaters.map((f) => {
        const style: CSSProperties = f.at
          ? { left: `${((f.at.col + 0.5) / cols) * 100}%`, top: `${((f.at.row + 0.5) / rows) * 100}%`, animationDuration: `${UI.anim.floatText}ms` }
          : { animationDuration: `${UI.anim.floatText + 300}ms` };
        return <div key={f.id} className={`floater float-${f.kind}`} style={style}>{floaterText(f)}</div>;
      })}
    </div>
  );
}

function floaterText(f: Floater): string {
  switch (f.kind) {
    case 'points': return STRINGS.points(f.value);
    case 'blast': return STRINGS.points(f.value);
    case 'time': return STRINGS.timeBonus(f.value / 1000);
    case 'golden': return STRINGS.golden(f.value);
    case 'shuffle': return STRINGS.shuffle;
    case 'power': return f.text ?? '';
    case 'variety': return STRINGS.variety.done(f.value);
    case 'rush': return STRINGS.points(f.value);
    case 'rushStart': return TOUR_STRINGS.rushStart;
    case 'combo': {
      const key = UI.comboTextKeys[Math.min(f.value - 2, UI.comboTextKeys.length - 1)];
      return `${STRINGS[key]} ${STRINGS.times(Number(f.text))}`;
    }
  }
}

interface MenuProps {
  best: number;
  sound: boolean;
  onPlay: () => void;
  /** Open a new table (needs the server). */
  onTable?: () => void;
  onHelp: () => void;
  onSound: () => void;
  onTour: () => void;
  onRanking?: () => void;
  onTables?: () => void;
  /** The Poker Tour button's second line: where the player is, or what it is. */
  tourInfo: string;
}

function tourMenuInfo(progress: TourProgress): string {
  const stars = totalStars(progress);
  if (!stars) return TOUR_STRINGS.menuInfo;
  const id = currentLevelId(TOURS, progress);
  return id ? TOUR_STRINGS.menuProgress(levelNumber(TOURS, id), stars, allLevels(TOURS).length * 3) : TOUR_STRINGS.stars(stars, allLevels(TOURS).length * 3);
}

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
    <circle cx="12" cy="17.6" r="0.6" fill="currentColor" />
  </svg>
);

const SoundIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
  </svg>
);

function Menu({ best, sound, onPlay, onTable, onHelp, onSound, onTour, onRanking, onTables, tourInfo }: MenuProps) {
  const cards = useMemo(() => parseCards('TH JH QH KH AH'), []);
  const M = STRINGS.menu;
  // Two levels: a game, a table and the Tour first; tables and ranking at the bottom, between two quiet icons.
  return (
    <div className="overlay menu">
      <div className="menu-inner">
        <div className="logo-fan" aria-hidden="true">
          {cards.map((c, i) => <div key={i} className="fan-card" style={{ ['--i' as string]: i }}><CardFace card={c} /></div>)}
        </div>
        <h1 className="logo">POKER<br /><span>LUNCH</span></h1>
        <p className="tagline">{STRINGS.tagline}</p>
        <button className="btn primary big" type="button" onClick={onPlay}>{STRINGS.play}</button>
        {onTable && (
          <button className="btn table-hero" type="button" onClick={onTable}>
            <span className="table-hero-title">🃏 {TABLE_STRINGS.menuButton}</span>
            <small>{TABLE_STRINGS.menuInfo}</small>
          </button>
        )}
        <button className="btn tour-hero" type="button" onClick={onTour}>
          <span className="tour-hero-title">🏆 {TOUR_STRINGS.menuButton}</span>
          <small>{tourInfo}</small>
        </button>
        {best > 0 && <p className="menu-best">{STRINGS.best}: {fmt(best)}</p>}
        <nav className="menu-tools" aria-label={M.more}>
          <button type="button" className="menu-icon" onClick={onHelp} aria-label={M.help} title={M.help}><HelpIcon /></button>
          {onTables && <button type="button" className="menu-tool" onClick={onTables}>{M.tables}</button>}
          {onRanking && <button type="button" className="menu-tool" onClick={onRanking}>{M.ranking}</button>}
          <button type="button" className="menu-icon" onClick={onSound} aria-pressed={sound} aria-label={M.sound} title={M.sound}><SoundIcon on={sound} /></button>
        </nav>
        <div className="menu-langs" role="group" aria-label={M.language}>
          {LANGS.map((l) => (
            <button key={l} type="button" lang={l} aria-pressed={l === LANG} title={LANG_NAMES[l]} onClick={() => { if (l !== LANG) setLang(l); }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface GameOverProps {
  score: number;
  best: number;
  newBest: boolean;
  stats: NonNullable<ReturnType<typeof useGame>['stats']>;
  ranking: string | null;
  onAgain: () => void;
  onMenu: () => void;
}

function GameOver({ score, best, newBest, stats, ranking, onAgain, onMenu }: GameOverProps) {
  const shown = useCountUp(score, UI.countUpMs);
  const made = HAND_TYPES.filter((h) => stats.handCounts[h] > 0).reverse();
  return (
    <div className="overlay dim">
      <div className="sheet over">
        <h2>{STRINGS.gameOver}</h2>
        <p className="over-score">{fmt(shown)}</p>
        {newBest ? <p className="over-best new">{STRINGS.newBest}</p> : <p className="over-best">{STRINGS.best}: {fmt(best)}</p>}
        <div className="over-hands">
          {made.length === 0 && <p>{STRINGS.noHands}</p>}
          {made.map((h) => (
            <div key={h} className={`over-hand tier-${HAND_TIER[h]}`}>
              <span>{HAND_NAMES[h]}</span>
              <span>×{stats.handCounts[h]}</span>
            </div>
          ))}
        </div>
        <p className="over-line">{STRINGS.bestMove}: {fmt(stats.bestMove)}</p>
        {ranking && score > 0 && <Leaderboard ranking={ranking} score={score} />}
        <Rating score={score} mode="free" />
        <button className="btn primary big" type="button" onClick={onAgain}>{STRINGS.playAgain}</button>
        <button className="btn small ghost" type="button" onClick={onMenu}>{STRINGS.quit}</button>
      </div>
    </div>
  );
}

/** One tap at the end of a game: did you like it? Stored with the anonymous stats. */
function Rating({ score, mode }: { score: number; mode: Mode }) {
  const T = STRINGS.rating;
  const [answer, setAnswer] = useState<'up' | 'down' | null>(null);
  if (!leaderboardEnabled()) return null;
  const rate = (value: 'up' | 'down') => {
    if (answer) return;
    setAnswer(value);
    track('rating', score, { value, mode });
  };
  return (
    <div className="rating">
      {answer ? <span>{T.thanks}</span> : (
        <>
          <span>{T.ask}</span>
          <button type="button" onClick={() => rate('up')} aria-label={T.up}>👍</button>
          <button type="button" onClick={() => rate('down')} aria-label={T.down}>👎</button>
        </>
      )}
    </div>
  );
}

/** The general ranking any time from the menu. */
function RankingSheet({ onClose }: { onClose: () => void }) {
  const T = STRINGS.leaderboard;
  return (
    <div className="overlay dim" onClick={onClose}>
      <div className="sheet ranking-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{T.title}</h2>
        <Leaderboard ranking={LEADERBOARD.rankingId} />
        <button className="btn primary" type="button" onClick={onClose}>{STRINGS.close}</button>
      </div>
    </div>
  );
}

/** The score in the HUD rolls up to its new value, like a slot machine; a big win rolls longer and glows. */
function RollingScore({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const [big, setBig] = useState(false);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    const delta = value - start;
    if (delta <= 0) { from.current = value; setShown(value); return; }
    const ms = Math.min(UI.roll.maxMs, UI.roll.minMs + delta * UI.roll.msPerPoint);
    setBig(delta >= UI.roll.bigPoints);
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const v = Math.round(start + delta * (1 - (1 - t) ** 3));
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else setBig(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={`hud-value ${big ? 'rolling' : ''}`}>{fmt(shown)}</span>;
}

function useCountUp(target: number, ms: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** How to play, in three swipeable screens: making a hand, the hands, the extras. */
function Help({ auto, onClose }: { auto: boolean; onClose: (dontShowAgain: boolean) => void }) {
  const H = STRINGS.help;
  const [page, setPage] = useState(0);
  const [dontShow, setDontShow] = useState(true);
  const pagesRef = useRef<HTMLDivElement>(null);
  const last = HELP_PAGES - 1;
  const go = (i: number) => {
    const el = pagesRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    setPage(i);
  };
  const onScroll = () => {
    const el = pagesRef.current;
    if (el && el.clientWidth) setPage(Math.round(el.scrollLeft / el.clientWidth));
  };
  const close = () => onClose(dontShow);
  return (
    <div className="overlay dim">
      <div className="sheet help" role="dialog" aria-modal="true" aria-label={H.title}>
        <div className="help-top">
          <span className="help-step">{H.step(page + 1, HELP_PAGES)}</span>
          {page < last && <button className="btn small ghost help-skip" type="button" onClick={close}>{H.skip}</button>}
        </div>
        <div className="help-pages" ref={pagesRef} onScroll={onScroll}>
          <section className="help-page">
            <h2>{H.page1}</h2>
            <p className="help-move-title">{H.moveTitle}</p>
            <TraceDemo />
            <p className="help-move">{H.moveLead}<strong>{H.moveDiagonal}</strong>{H.moveTail}</p>
            <div className="help-rose"><NeighbourRose /><span>{H.rose}</span></div>
            <p>{H.trace} <strong>{H.all}</strong></p>
          </section>
          <section className="help-page">
            <h2>{H.page2}</h2>
            <div className="help-hands">
              {HAND_TYPES.map((h) => (
                <div key={h} className={`help-hand tier-${HAND_TIER[h]}`}>
                  <div className="help-hand-head">
                    <span className="help-hand-name">{HAND_NAMES[h]}</span>
                    <span className="help-hand-points">{fmt(DEFAULT_CONFIG.hands[h].points)}</span>
                  </div>
                  <div className="help-cards">
                    {parseCards(HAND_EXAMPLES[h]).map((c, i) => <div key={i} className="mini"><CardFace card={c} /></div>)}
                  </div>
                  <span className="help-hand-rule">{HAND_RULES[h]}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="help-page">
            <h2>{H.page3}</h2>
            <p>{H.time}</p>
            <h3>{H.varietyTitle}</h3>
            <VarietyDemo />
            <p>{H.variety}</p>
            <div className="help-specials">
              <div className="help-special"><div className="mini"><CardFace card={{ rank: 0, suit: 0, joker: true }} /></div><span>{H.joker}</span></div>
              <div className="help-special"><div className="mini"><CardFace card={{ rank: 12, suit: 1, golden: true }} /></div><span>{H.golden}</span></div>
            </div>
            <p>{H.tokens}</p>
          </section>
        </div>
        <div className="help-dots" role="tablist">
          {Array.from({ length: HELP_PAGES }, (_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === page} aria-label={H.step(i + 1, HELP_PAGES)} className={i === page ? 'on' : ''} onClick={() => go(i)} />
          ))}
        </div>
        {auto && (
          <label className="help-again">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            {H.dontShow}
          </label>
        )}
        {page < last
          ? <button className="btn primary" type="button" onClick={() => go(page + 1)}>{H.next}</button>
          : <button className="btn primary" type="button" onClick={close}>{auto ? H.letsGo : STRINGS.close}</button>}
      </div>
    </div>
  );
}

const HELP_PAGES = 3;
