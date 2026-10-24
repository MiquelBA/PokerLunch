// Poker Tour screens: the map of tours and levels, a level's card before playing, the goals bar in
// the game and the result at the end.
import { Fragment, useEffect, useRef, useState } from 'react';
import { allLevels, currentLevelId, isUnlocked, starsMissing, totalStars, type TourProgress } from '../../engine/tour/progress';
import { progress as goalsOf, type TourRun } from '../../engine/tour/run';
import type { Level, Tour } from '../../engine/tour/schema';
import type { CardSpec } from '../../engine/types';
import { playSound } from '../audio';
import { CardFace } from '../CardFace';
import { vibrate } from '../haptics';
import { Skyline, Trophy } from './skylines';
import { fmt } from '../i18n/lang';
import { goalIcon, goalLabel, goalShort, levelIntro, levelName, TOUR_STRINGS as T, tourName } from './strings';

/** The level's number across all tours (1-60). */
export function levelNumber(tours: readonly Tour[], id: string): number {
  return allLevels(tours).findIndex((x) => x.level.id === id) + 1;
}

function Stars({ count, of = 3, big = false }: { count: number; of?: number; big?: boolean }) {
  return (
    <span className={`stars ${big ? 'big' : ''}`} aria-label={`${count} de ${of} estrelles`}>
      {Array.from({ length: of }, (_, i) => <i key={i} className={i < count ? 'on' : ''} style={{ animationDelay: `${300 + i * 260}ms` }}>★</i>)}
    </span>
  );
}

export function TourMap({ tours, progress, celebrate, onPick, onClose, onChampion }: {
  tours: readonly Tour[]; progress: TourProgress;
  /** A tour that has just opened: the plane flies to it. */
  celebrate: string | null;
  onPick: (level: Level) => void; onClose: () => void; onChampion: () => void;
}) {
  const current = currentLevelId(tours, progress);
  const max = allLevels(tours).length * 3;
  const champion = isChampion(tours, progress);
  const focus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // Open where the player is: the new city's route, or the next level.
    focus.current?.scrollIntoView({ block: 'center', behavior: celebrate ? 'smooth' : 'auto' });
    if (celebrate) window.setTimeout(() => playSound('plane'), 500);
  }, [celebrate]);
  return (
    <div className="overlay tour-map">
      <div className="tour-map-inner">
        <header className="tour-map-head">
          <button className="btn small ghost" type="button" onClick={onClose}>‹ {T.back}</button>
          <h2>{T.title}</h2>
          <span className="tour-total">{T.stars(totalStars(progress), max)}</span>
        </header>
        {tours.map((tour, ti) => {
          const stars = tour.levels.reduce((n, l) => n + (progress.levels[l.id]?.stars ?? 0), 0);
          const open = isUnlocked(tours, progress, tour.levels[0].id);
          const flying = celebrate === tour.id;
          return (
            <Fragment key={tour.id}>
              {ti > 0 && (
                <div className={`flight ${ti % 2 ? '' : 'mirror'} ${open ? 'open' : ''} ${flying ? 'flying' : ''}`} ref={flying ? (el) => { focus.current = el; } : undefined}>
                  <svg viewBox="0 0 300 70" aria-hidden="true"><path d={FLIGHT} /></svg>
                  {open ? <span className="plane"><Plane /></span> : <span className="flight-lock">🔒</span>}
                  {flying && <span className="flight-label">✈ {T.newCity(tourName(tour))}</span>}
                </div>
              )}
              <section className={`city theme-${tour.theme} ${open ? '' : 'closed'}`}>
                <div className="city-banner">
                  <Skyline theme={tour.theme} />
                  <div className="city-title">
                    <small>{T.city(ti + 1)}</small>
                    <h3>{tourName(tour)}</h3>
                  </div>
                  <span className="city-stars">{T.stars(stars, tour.levels.length * 3)}</span>
                </div>
                {starsMissing(tour, progress) > 0 && <p className="tour-gate">🔒 {T.tourLocked(tour.starsToOpen ?? 0, totalStars(progress))}</p>}
                <div className="tour-levels">
                  {tour.levels.map((level) => {
                    const unlocked = isUnlocked(tours, progress, level.id);
                    const rec = progress.levels[level.id];
                    const n = levelNumber(tours, level.id);
                    const here = level.id === current;
                    return (
                      <button
                        key={level.id}
                        ref={here && !celebrate ? (el) => { focus.current = el; } : undefined}
                        type="button"
                        className={`tour-level ${unlocked ? '' : 'locked'} ${level.special ? 'special' : ''} ${here ? 'current' : ''} ${rec ? 'passed' : ''}`}
                        disabled={!unlocked}
                        onClick={() => onPick(level)}
                        aria-label={`${T.level(n)}: ${levelName(level)}${unlocked ? '' : `. ${T.locked}`}`}
                      >
                        <span className="tour-level-n">{unlocked ? n : '🔒'}</span>
                        <Stars count={rec?.stars ?? 0} />
                        {here && <span className="chip-marker" aria-hidden="true"><i /></span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            </Fragment>
          );
        })}
        <button className={`tour-finale ${champion ? 'won' : ''}`} type="button" disabled={!champion} onClick={onChampion}>
          <Trophy />
          <span>{champion ? T.championSee : T.championGoal}</span>
        </button>
      </div>
    </div>
  );
}

/** The flight between two cities (the CSS flies the plane along the same curve). */
const FLIGHT = 'M30 6 C 120 76, 180 -6, 270 62';

function Plane() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M38 20 Q38 18 35 18 L24 18 L16 5 L12 5 L17 18 L8 18 L4 12 L1 12 L3 20 L1 28 L4 28 L8 22 L17 22 L12 35 L16 35 L24 22 L35 22 Q38 22 38 20Z" />
    </svg>
  );
}

/** Every level of every tour passed: the player is the Poker Tour champion. */
export function isChampion(tours: readonly Tour[], progress: TourProgress): boolean {
  return allLevels(tours).every((x) => progress.levels[x.level.id]);
}

/** What's on the board, explained once on the level's card. */
type Element = 'ice' | 'block' | 'bomb' | 'fog' | 'chain' | 'gold';
function elementsOf(level: Level): Element[] {
  const text = (level.board.layout ?? []).join('');
  const out: Element[] = [];
  if (/[IK]/.test(text)) out.push('ice');
  if (/[BX]/.test(text)) out.push('block');
  if (text.includes('*') || level.deck?.bombChance) out.push('bomb');
  if (text.includes('F')) out.push('fog');
  if (/[1-9]/.test(text)) out.push('chain');
  if (level.board.gold?.length) out.push('gold');
  return out;
}

const SAMPLES: Record<Element, CardSpec> = {
  ice: { rank: 14, suit: 0, ice: 1 },
  block: { rank: 0, suit: 0, block: 1 },
  bomb: { rank: 7, suit: 1, bomb: true },
  fog: { rank: 9, suit: 2, fog: true },
  chain: { rank: 12, suit: 3, chain: 1 },
  gold: { rank: 10, suit: 1 },
};

export function LevelIntro({ level, number, best, onPlay, onClose }: {
  level: Level; number: number; best: number | null; onPlay: () => void; onClose: () => void;
}) {
  return (
    <div className="overlay dim" onClick={onClose}>
      <div className={`sheet level-intro ${level.special ? 'special' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <p className="level-kicker">{T.level(number)}{level.special ? ` · ${T.special}` : ''}</p>
        <h2>{levelName(level)}</h2>
        {levelIntro(level) && <p className="level-text">{levelIntro(level)}</p>}
        <h3>{T.goals}</h3>
        <ul className="goal-list">
          {level.goals.map((g, i) => <li key={i}><span aria-hidden="true">{goalIcon(g)}</span>{goalLabel(g)}</li>)}
        </ul>
        <p className="level-limit">{level.limit.kind === 'moves' ? `⏱ ${T.moves(level.limit.moves)}` : `⏱ ${T.time(level.limit.ms / 1000)}`}</p>
        {elementsOf(level).map((k) => (
          <div key={k} className="level-element">
            <div className={`mini ${k === 'gold' ? 'gold-sample' : ''}`}><CardFace card={SAMPLES[k]} /></div>
            <span>{T.rules[k]}</span>
          </div>
        ))}
        <p className="level-stars">{T.starScores(level.stars[0], level.stars[1])}</p>
        {best !== null && <p className="level-best">{T.best(best)}</p>}
        <button className="btn primary big" type="button" onClick={onPlay} autoFocus>{T.play}</button>
        <button className="btn small ghost" type="button" onClick={onClose}>{T.map}</button>
      </div>
    </div>
  );
}

/** The goals while playing: each with what's done so far. */
export function GoalsBar({ run }: { run: TourRun }) {
  const list = goalsOf(run);
  return (
    <div className="goals-bar" aria-label={T.goals}>
      {list.map((p, i) => (
        <div key={i} className={`goal-chip ${p.done ? 'done' : ''}`}>
          <span className="goal-icon" aria-hidden="true">{goalIcon(p.goal)}</span>
          <span className="goal-name">{goalShort(p.goal)}</span>
          <span className="goal-count">{p.done ? '✓' : p.goal.type === 'score' ? `${fmt(p.current)}/${fmt(p.target)}` : `${p.current}/${p.target}`}</span>
        </div>
      ))}
    </div>
  );
}

export function TourResult({ run, number, nextLevel, needStars, newTour, champion, onChampion, onNext, onRetry, onMap }: {
  run: TourRun; number: number; nextLevel: Level | null; needStars: { tour: string; missing: number } | null; newTour: string | null;
  /** This win made the player the Tour's champion. */
  champion: boolean;
  onChampion: () => void; onNext: () => void; onRetry: () => void; onMap: () => void;
}) {
  const won = run.status === 'won';
  const [shown, setShown] = useState(0);
  useEffect(() => {
    // A fanfare and one ding per star as each lands; a lost level gets the Classic ending.
    if (run.status !== 'won') {
      playSound('gameOver');
      vibrate('gameOver');
      return;
    }
    playSound('levelWon');
    vibrate('big');
    const timers = Array.from({ length: run.stars }, (_, i) => window.setTimeout(() => playSound('star', 1 + i * 0.12), 520 + i * 260));
    return () => timers.forEach(clearTimeout);
  }, [run]);
  useEffect(() => {
    // The score counts up.
    const target = run.game.score;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      setShown(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run.game.score]);
  return (
    <div className="overlay dim">
      <div className={`sheet tour-result ${won ? 'won' : 'lost'}`} role="dialog" aria-modal="true">
        <p className="level-kicker">{T.level(number)} · {levelName(run.level)}</p>
        <h2>{won ? T.won : T.lost}</h2>
        {won && <Stars count={run.stars} big />}
        <p className="over-score">{fmt(shown)}</p>
        {won && run.rushPoints > 0 && <p className="rush-line">{T.rushPoints(run.rushPoints)}</p>}
        {!won && <p className="level-text">{T.lostHint}</p>}
        <ul className="goal-list result">
          {goalsOf(run).map((p, i) => (
            <li key={i} className={p.done ? 'done' : ''}>
              <span aria-hidden="true">{p.done ? '✅' : goalIcon(p.goal)}</span>
              {goalLabel(p.goal)}{!p.done && ` (${p.goal.type === 'score' ? fmt(p.current) : p.current}/${p.goal.type === 'score' ? fmt(p.target) : p.target})`}
            </li>
          ))}
        </ul>
        {won && newTour && <p className="new-tour">🎉 {T.unlockedTour(newTour)}</p>}
        {won && champion && <button className="btn primary big champion-btn" type="button" onClick={onChampion} autoFocus>🏆 {T.championClaim}</button>}
        {won && nextLevel && <button className="btn primary big" type="button" onClick={onNext} autoFocus>{T.next}</button>}
        {won && !nextLevel && needStars && <p className="new-tour">⭐ {T.needStars(needStars.tour, needStars.missing)}</p>}
        {won && !nextLevel && !needStars && !champion && <p className="new-tour">🏆 {T.tourDone}</p>}
        <button className={`btn ${won ? 'small' : 'primary big'}`} type="button" onClick={onRetry}>{won ? T.replay : T.retry}</button>
        <button className="btn small ghost" type="button" onClick={onMap}>{T.map}</button>
      </div>
    </div>
  );
}
