// Teaching how to move: a small board where a finger traces three hands in a loop (a diagonal trio,
// a zig-zag flush and an L-shaped straight), and the ghost finger that shows a first-time player a
// move on the real board.
import { useEffect, useRef, useState } from 'react';
import type { HandType, Pos } from '../engine/types';
import { CardFace } from './CardFace';
import { parseCards } from '../engine/notation';
import { HAND_NAMES } from './strings';

const DEMO_BOARD = parseCards('7S 2H KC 9H  4D 7H JH 5H  8C QS 7D 3H  9D TS JC QD');
const DEMO_SIZE = 4;

const SCENES: readonly { hand: HandType; path: readonly Pos[] }[] = [
  { hand: 'trips', path: [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }] },
  { hand: 'flush', path: [{ row: 0, col: 1 }, { row: 1, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 3 }, { row: 2, col: 3 }] },
  { hand: 'straight', path: [{ row: 2, col: 0 }, { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }] },
];

const T = { appear: 450, press: 250, step: 480, hold: 1100, fade: 450 };

function sceneLength(n: number): number {
  return T.appear + T.press + (n - 1) * T.step + T.hold + T.fade;
}

/** Where the finger is `ms` into a scene: cells reached so far, and its position in cell units. */
function sceneAt(path: readonly Pos[], ms: number) {
  const moveStart = T.appear + T.press;
  const moving = Math.max(0, ms - moveStart);
  const seg = Math.min(path.length - 1, moving / T.step);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = path[i];
  const b = path[Math.min(i + 1, path.length - 1)];
  const ease = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
  const pos = { x: a.col + 0.5 + (b.col - a.col) * ease, y: a.row + 0.5 + (b.row - a.row) * ease };
  const reached = ms < moveStart ? 0 : Math.min(path.length, i + 1 + (f > 0.55 ? 1 : 0));
  const moveEnd = moveStart + (path.length - 1) * T.step;
  const done = ms >= moveEnd;
  return { pos, reached, done, moveEnd, pressed: ms >= T.appear && ms < moveEnd + 200 };
}

export function TraceDemo() {
  const [clock, setClock] = useState({ scene: 0, ms: 0 });
  const start = useRef(0);
  useEffect(() => {
    let raf = 0;
    let scene = 0;
    start.current = performance.now();
    const loop = (now: number) => {
      let ms = now - start.current;
      const len = sceneLength(SCENES[scene].path.length);
      if (ms >= len) {
        scene = (scene + 1) % SCENES.length;
        start.current = now;
        ms = 0;
      }
      setClock({ scene, ms });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const { hand, path } = SCENES[clock.scene];
  const s = sceneAt(path, clock.ms);
  const len = sceneLength(path.length);
  const fadeOut = clock.ms > len - T.fade;
  const visible = clock.ms > 60 && !fadeOut;
  const lit = new Set(path.slice(0, s.reached).map((p) => p.row * DEMO_SIZE + p.col));
  // The line: centres of the cells passed, then the finger.
  const pts = [...path.slice(0, Math.max(1, s.reached)).map((p) => ({ x: p.col + 0.5, y: p.row + 0.5 }))];
  if (!s.done && s.reached > 0) pts.push(s.pos);
  const toPct = (p: { x: number; y: number }) => `${(p.x / DEMO_SIZE) * 100},${(p.y / DEMO_SIZE) * 100}`;

  return (
    <div className="trace-demo" aria-hidden="true">
      {DEMO_BOARD.map((card, i) => (
        <div key={i} className={`demo-cell ${lit.has(i) ? 'lit' : ''} ${s.done && lit.has(i) && !fadeOut ? 'won' : ''}`}>
          <CardFace card={card} />
        </div>
      ))}
      <svg className={`demo-line ${fadeOut ? 'out' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none">
        {s.reached > 0 && <polyline points={pts.map(toPct).join(' ')} />}
      </svg>
      <div
        className={`finger ${visible ? 'on' : ''} ${s.pressed ? 'pressed' : ''}`}
        style={{ left: `${(s.pos.x / DEMO_SIZE) * 100}%`, top: `${(s.pos.y / DEMO_SIZE) * 100}%` }}
      >
        <FingerIcon />
      </div>
      {s.done && !fadeOut && clock.ms > s.moveEnd + 150 && <div className="demo-label">{HAND_NAMES[hand]}!</div>}
    </div>
  );
}

/** A pointing hand, the fingertip at the top-left of its box (offset by CSS onto the point). */
export function FingerIcon() {
  return (
    <svg viewBox="0 0 48 64" width="100%" height="100%">
      <path
        d="M14 6a5 5 0 0 1 10 0v20l1-.2V22a5 5 0 0 1 9.6-1.8 5 5 0 0 1 8.4 3.3V26a4.6 4.6 0 0 1 4 4.6V44c0 10-7 18-17 18h-2c-6 0-10-3-13-8L4 40a5 5 0 0 1 7.6-6.4L14 36Z"
        fill="#FFE2B8" stroke="#1B1B22" strokeWidth="3.2" strokeLinejoin="round"
      />
      <path d="M25 26v9M34.6 25v10M43 28v8" stroke="#1B1B22" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The ghost finger on the real board: it traces `points` (px) over and over until it unmounts. */
export function GhostFinger({ points }: { points: readonly { x: number; y: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || points.length < 2) return;
    const step = 520;
    const total = 500 + 250 + (points.length - 1) * step + 900;
    const at = (ms: number) => ms / total;
    const p0 = points[0];
    const frames: Keyframe[] = [
      { offset: 0, left: `${p0.x}px`, top: `${p0.y}px`, opacity: 0, transform: 'scale(1.15)' },
      { offset: at(500), left: `${p0.x}px`, top: `${p0.y}px`, opacity: 1, transform: 'scale(1)' },
      { offset: at(750), left: `${p0.x}px`, top: `${p0.y}px`, opacity: 1, transform: 'scale(0.86)' },
      ...points.slice(1).map((p, i): Keyframe => ({ offset: at(750 + (i + 1) * step), left: `${p.x}px`, top: `${p.y}px`, opacity: 1, transform: 'scale(0.86)' })),
      { offset: at(total - 600), left: `${points[points.length - 1].x}px`, top: `${points[points.length - 1].y}px`, opacity: 1, transform: 'scale(1)' },
      { offset: 1, left: `${points[points.length - 1].x}px`, top: `${points[points.length - 1].y}px`, opacity: 0, transform: 'scale(1)' },
    ];
    const anim = el.animate(frames, { duration: total, iterations: Infinity, easing: 'ease-in-out' });
    return () => anim.cancel();
  }, [points]);
  return (
    <div ref={ref} className="finger ghost-finger on">
      <FingerIcon />
    </div>
  );
}

/** A card with arrows to its 8 neighbours. */
export function NeighbourRose() {
  const arrows = ['↖', '↑', '↗', '←', '', '→', '↙', '↓', '↘'];
  return (
    <div className="rose" aria-hidden="true">
      {arrows.map((a, i) =>
        i === 4
          ? <div key={i} className="rose-card"><CardFace card={{ rank: 7, suit: 1 }} /></div>
          : <span key={i} className={`rose-arrow ${i % 2 === 0 ? 'diag' : ''}`}>{a}</span>,
      )}
    </div>
  );
}
