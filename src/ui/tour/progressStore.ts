// Saves the Tour progress on this phone only (no server).
import { EMPTY_PROGRESS, parseProgress, type TourProgress } from '../../engine/tour/progress';

const KEY = 'poker-lunch:tour:v1';

export function loadTourProgress(): TourProgress {
  try {
    return parseProgress(localStorage.getItem(KEY));
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveTourProgress(p: TourProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage unavailable: progress lasts this visit only.
  }
}
