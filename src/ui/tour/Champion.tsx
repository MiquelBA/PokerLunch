// The Poker Tour champion: a drum roll and a royal flush, then the trophy with fireworks, then the
// champion's card to share.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { playSound } from '../audio';
import { CardFace } from '../CardFace';
import { FxCanvas } from '../fx/fxCanvas';
import { playChampion } from '../fx/recipes';
import { vibrate } from '../haptics';
import { shareText } from '../share';
import { shareChampionImage } from './championImage';
import { Trophy } from './skylines';
import { TOUR_STRINGS as T } from './strings';

const ROYAL = [14, 13, 12, 11, 10].map((rank) => ({ rank, suit: 0 as const }));

type Phase = 'drum' | 'boom' | 'card';

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function Champion({ stars, maxStars, levels, cities, intro, onShared, onClose }: {
  stars: number; maxStars: number; levels: number; cities: readonly string[];
  /** Play the whole show (just won); false opens straight on the card (from the map). */
  intro: boolean;
  onShared: () => void; onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(intro && !reducedMotion() ? 'drum' : 'card');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fx = useRef(new FxCanvas());

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const engine = fx.current;
    engine.attach(canvas);
    if (!canvas) return;
    const measure = () => engine.resize(canvas.clientWidth, canvas.clientHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); engine.clear(); engine.attach(null); };
  }, []);

  useEffect(() => {
    if (reducedMotion()) return;
    const timers: number[] = [];
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    const boomAt = phase === 'drum' ? 1900 : 0;
    if (phase === 'drum') {
      playSound('drumroll');
      at(boomAt, () => setPhase('boom'));
      at(boomAt + 2300, () => setPhase('card'));
    }
    if (intro) {
      at(boomAt, () => {
        playSound('champion');
        vibrate('big');
      });
    }
    // Fireworks: the big bang, then a shell of them every so often for a while.
    const canvas = canvasRef.current;
    for (let wave = 0; wave < (intro ? 8 : 3); wave++) {
      at(boomAt + wave * 1400, () => canvas && playChampion(fx.current, canvas.clientWidth, canvas.clientHeight, intro ? wave : wave + 1));
    }
    return () => timers.forEach(clearTimeout);
    // The show runs once, from the phase it opened on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    const image = await shareChampionImage({ stars, maxStars, levels, cities }).catch(() => 'unsupported' as const);
    if (image === 'shared' || (image === 'unsupported' && await shareText(T.championShareText(stars)))) onShared();
  };

  return (
    <div className={`overlay champion phase-${phase}`} role="dialog" aria-modal="true" aria-label={T.champion}>
      <div className="champion-spots" aria-hidden="true"><i /><i /></div>
      <div className="champion-rays" aria-hidden="true" />
      <canvas ref={canvasRef} className="champion-fx" aria-hidden="true" />
      <div className="champion-stage">
        <div className="champion-fan" aria-hidden="true">
          {ROYAL.map((c, i) => (
            <div key={c.rank} className="champion-card" style={{ ['--i' as string]: i - 2, animationDelay: `${150 + i * 220}ms` }}>
              <CardFace card={c} />
            </div>
          ))}
        </div>
        <Trophy className="champion-trophy" />
        <h2 className="champion-title"><small>{T.championKicker}</small>{T.champion}</h2>
        <div className="champion-card-info">
          <p className="champion-stars">★ {T.championStars(stars, maxStars)}</p>
          <p className="champion-line">{T.championLine(levels, cities.length)}</p>
          <p className="champion-cities">{cities.join(' · ')}</p>
          {stars < maxStars && <p className="champion-more">{T.championMore(maxStars - stars)}</p>}
          <button className="btn primary big" type="button" onClick={() => void share()}>{T.championShare}</button>
          <button className="btn small ghost" type="button" onClick={onClose}>{T.championBack}</button>
        </div>
      </div>
    </div>
  );
}
