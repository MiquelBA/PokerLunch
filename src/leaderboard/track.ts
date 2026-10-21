// Anonymous, cookie-free stats: what happens (a visit, a game, a share), when, and the phone's
// random id, so we can count players and returns. Nothing personal. Never blocks the game.
// Orca Lunch writes to the same tables: every row from this game carries meta.game = 'poker'.
import { insertRow } from './api';
import { leaderboardEnabled } from './config';
import { deviceId } from './device';

export type TrackKind = 'visit' | 'game_start' | 'game_end' | 'share' | 'install' | 'ranking_view' | 'feedback' | 'rating';

const GAME = { game: 'poker' } as const;

export function track(kind: TrackKind, score?: number, meta: Record<string, string | number | boolean> = {}): void {
  if (!leaderboardEnabled()) return;
  insertRow('events', { device_id: deviceId(), kind, score: score === undefined ? null : Math.min(score, 400_000), meta: { ...GAME, ...meta } }).catch(() => {
    // Stats are best effort: offline or refused, the game carries on.
  });
}

export async function sendFeedback(message: string, meta: Record<string, string | number | boolean>): Promise<void> {
  await insertRow('feedback', { device_id: deviceId(), message, meta: { ...GAME, ...meta } });
  track('feedback');
}
