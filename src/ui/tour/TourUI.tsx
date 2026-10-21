// Poker Tour screens: the map of tours and levels, a level's card before playing, the goals bar in
// the game and the result at the end.
import { useEffect, useMemo, useState } from 'react';
import { allLevels, currentLevelId, isUnlocked, totalStars, type TourProgress } from '../../engine/tour/progress';
import { progress as goalsOf, type TourRun } from '../../engine/tour/run';
import type { Level, Tour } from '../../engine/tour/schema';
import { CardFace } from '../CardFace';
import { goalIcon, goalLabel, goalShort, TOUR_STRINGS as T } from './strings';

const fmt = (v: number) => v.toLocaleString('ca');

/** The level's number across all tours (1-30). */
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

export function TourMap({ tours, progress, onPick, onClose }: {
  tours: readonly Tour[]; progress: TourProgress; onPick: (level: Level) => void; onClose: () => void;
}) {
  const current = currentLevelId(tours, progress);
  const max = allLevels(tours).length * 3;
  return (
    <div className="overlay tour-map">
      <div className="tour-map-inner">
        <header className="tour-map-head">
          <button className="btn small ghost" type="button" onClick={onClose}>‹ {T.back}</button>
          <h2>{T.title}</h2>
          <span className="tour-total">{T.stars(totalStars(progress), max)}</span>
        </header>
        {tours.map((tour) => {
          const stars = tour.levels.reduce((n, l) => n + (progress.levels[l.id]?.stars ?? 0), 0);
          return (
            <section key={tour.id} className={`tour-section theme-${tour.theme}`}>
              <div className="tour-section-head">
                <h3>{tour.name}</h3>
                <span>{T.stars(stars, tour.levels.length * 3)}</span>
              </div>
              <div className="tour-levels">
                {tour.levels.map((level) => {
                  const open = isUnlocked(tours, progress, level.id);
                  const rec = progress.levels[level.id];
                  const n = levelNumber(tours, level.id);
                  return (
                    <button
                      key={level.id}
                      type="button"
                      className={`tour-level ${open ? '' : 'locked'} ${level.special ? 'special' : ''} ${level.id === current ? 'current' : ''} ${rec ? 'passed' : ''}`}
                      disabled={!open}
                      onClick={() => onPick(level)}
                      aria-label={`${T.level(n)}: ${level.name}${open ? '' : `. ${T.locked}`}`}
                    >
                      <span className="tour-level-n">{open ? n : '🔒'}</span>
                      <Stars count={rec?.stars ?? 0} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** What's on the board, explained once on the level's card. */
function elementsOf(level: Level): ('ice' | 'block' | 'bomb')[] {
  const text = (level.board.layout ?? []).join('');
  const out: ('ice' | 'block' | 'bomb')[] = [];
  if (/[IK]/.test(text)) out.push('ice');
  if (/[BX]/.test(text)) out.push('block');
  if (text.includes('*') || level.deck?.bombChance) out.push('bomb');
  return out;
}

export function LevelIntro({ level, number, best, onPlay, onClose }: {
  level: Level; number: number; best: number | null; onPlay: () => void; onClose: () => void;
}) {
  const sample = useMemo(() => ({ ice: { rank: 14, suit: 0 as const, ice: 1 }, block: { rank: 0, suit: 0 as const, block: 1 }, bomb: { rank: 7, suit: 1 as const, bomb: true } }), []);
  return (
    <div className="overlay dim" onClick={onClose}>
      <div className={`sheet level-intro ${level.special ? 'special' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <p className="level-kicker">{T.level(number)}{level.special ? ` · ${T.special}` : ''}</p>
        <h2>{level.name}</h2>
        {level.intro && <p className="level-text">{level.intro}</p>}
        <h3>{T.goals}</h3>
        <ul className="goal-list">
          {level.goals.map((g, i) => <li key={i}><span aria-hidden="true">{goalIcon(g)}</span>{goalLabel(g)}</li>)}
        </ul>
        <p className="level-limit">{level.limit.kind === 'moves' ? `⏱ ${T.moves(level.limit.moves)}` : `⏱ ${T.time(level.limit.ms / 1000)}`}</p>
        {elementsOf(level).map((k) => (
          <div key={k} className="level-element">
            <div className="mini"><CardFace card={sample[k]} /></div>
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

export function TourResult({ run, number, nextLevel, newTour, onNext, onRetry, onMap }: {
  run: TourRun; number: number; nextLevel: Level | null; newTour: string | null;
  onNext: () => void; onRetry: () => void; onMap: () => void;
}) {
  const won = run.status === 'won';
  const [shown, setShown] = useState(0);
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
        <p className="level-kicker">{T.level(number)} · {run.level.name}</p>
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
        {won && nextLevel && <button className="btn primary big" type="button" onClick={onNext} autoFocus>{T.next}</button>}
        {won && !nextLevel && <p className="new-tour">🏆 {T.tourDone}</p>}
        <button className={`btn ${won ? 'small' : 'primary big'}`} type="button" onClick={onRetry}>{won ? T.replay : T.retry}</button>
        <button className="btn small ghost" type="button" onClick={onMap}>{T.map}</button>
      </div>
    </div>
  );
}
