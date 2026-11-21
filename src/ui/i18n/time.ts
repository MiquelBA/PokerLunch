// Durations, written the same way in every language.

/** Time left, rounded: "18 h", "3 h 20 min", "12 min". */
export const duration = (ms: number) => {
  const m = Math.max(1, Math.ceil(ms / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h >= 6 || m % 60 === 0 ? `${h} h` : `${h} h ${m % 60} min`;
};
/** Time played, rounded: "3 min", "1 h 05 min". */
export const minutes = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60_000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};
