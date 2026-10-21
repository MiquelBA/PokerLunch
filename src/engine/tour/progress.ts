// The player's Tour progress: best stars and score per level. Pure data and rules; the UI saves it.
import type { Tour } from './schema';

export interface LevelRecord {
  readonly stars: 1 | 2 | 3;
  readonly best: number;
}

export interface TourProgress {
  readonly version: 1;
  /** Only passed levels are here, by level id. */
  readonly levels: Readonly<Record<string, LevelRecord>>;
}

export const EMPTY_PROGRESS: TourProgress = { version: 1, levels: {} };

/** Every level of every tour, in play order. */
export function allLevels(tours: readonly Tour[]) {
  return tours.flatMap((t) => t.levels.map((level) => ({ tour: t, level })));
}

/** A level is open when it is the first, or the one before it has been passed, and its tour has the stars it asks for. */
export function isUnlocked(tours: readonly Tour[], progress: TourProgress, levelId: string): boolean {
  const list = allLevels(tours);
  const i = list.findIndex((x) => x.level.id === levelId);
  if (i < 0) return false;
  if (starsMissing(list[i].tour, progress) > 0) return false;
  return i === 0 || !!progress.levels[list[i - 1].level.id];
}

/** Stars still needed to open a tour (0: it has enough). */
export function starsMissing(tour: Tour, progress: TourProgress): number {
  return Math.max(0, (tour.starsToOpen ?? 0) - totalStars(progress));
}

/** Tours whose first level opened between two progresses (after a win or a better replay). */
export function newlyOpened(tours: readonly Tour[], before: TourProgress, after: TourProgress): Tour[] {
  return tours.filter((t) => t.levels[0] && !isUnlocked(tours, before, t.levels[0].id) && isUnlocked(tours, after, t.levels[0].id));
}

/** Keeps the best stars and the best score separately (a replay can improve either). */
export function recordResult(progress: TourProgress, levelId: string, stars: 0 | 1 | 2 | 3, score: number): TourProgress {
  if (stars === 0) return progress;
  const old = progress.levels[levelId];
  const rec: LevelRecord = { stars: Math.max(stars, old?.stars ?? 1) as 1 | 2 | 3, best: Math.max(score, old?.best ?? 0) };
  return { ...progress, levels: { ...progress.levels, [levelId]: rec } };
}

export function totalStars(progress: TourProgress): number {
  return Object.values(progress.levels).reduce((n, r) => n + r.stars, 0);
}

/** The next level to play: the first not yet passed (or the last one); null while it waits for stars. */
export function currentLevelId(tours: readonly Tour[], progress: TourProgress): string | null {
  const list = allLevels(tours);
  const id = (list.find((x) => !progress.levels[x.level.id]) ?? list[list.length - 1])?.level.id ?? null;
  return id && isUnlocked(tours, progress, id) ? id : null;
}

/** Reads saved progress, dropping anything malformed instead of failing. */
export function parseProgress(raw: string | null): TourProgress {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const data = JSON.parse(raw) as { version?: unknown; levels?: unknown };
    if (data.version !== 1 || typeof data.levels !== 'object' || !data.levels) return EMPTY_PROGRESS;
    const levels: Record<string, LevelRecord> = {};
    for (const [id, r] of Object.entries(data.levels as Record<string, { stars?: unknown; best?: unknown }>)) {
      if ((r?.stars === 1 || r?.stars === 2 || r?.stars === 3) && typeof r.best === 'number' && Number.isFinite(r.best) && r.best >= 0) {
        levels[id] = { stars: r.stars, best: r.best };
      }
    }
    return { version: 1, levels };
  } catch {
    return EMPTY_PROGRESS;
  }
}
