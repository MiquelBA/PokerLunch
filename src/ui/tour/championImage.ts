// The "Poker Tour champion" picture to share: drawn on a canvas (1080×1350, a phone post), shared
// as a PNG through the phone's share menu when it takes files.
import { gameUrl } from '../share';
import { TROPHY_PATHS } from './skylines';
import { TOUR_STRINGS as T } from './strings';

const W = 1080, H = 1350;

export function drawChampion(ctx: CanvasRenderingContext2D, o: { stars: number; maxStars: number; levels: number; cities: readonly string[] }): void {
  const display = '"Bebas Neue", Impact, sans-serif';
  const body = '"Barlow Condensed", "Arial Narrow", sans-serif';
  // Felt, light from the top, a gold frame.
  const bg = ctx.createRadialGradient(W / 2, H * 0.3, 60, W / 2, H * 0.45, H * 0.85);
  bg.addColorStop(0, '#2FA36E'); bg.addColorStop(0.45, '#14613F'); bg.addColorStop(1, '#062518');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Rays behind the trophy.
  ctx.save();
  ctx.translate(W / 2, 470);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = i % 2 ? 'rgba(255, 213, 74, 0.10)' : 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -900); ctx.lineTo(60, -900); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#FFC93C'; ctx.lineWidth = 10; ctx.strokeRect(34, 34, W - 68, H - 68);
  ctx.strokeStyle = 'rgba(255, 201, 60, 0.45)'; ctx.lineWidth = 3; ctx.strokeRect(56, 56, W - 112, H - 112);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFE48A';
  ctx.font = `64px ${display}`;
  ctx.fillText('POKER LUNCH', W / 2, 150);

  // The trophy (the same drawing as in the game), scaled up.
  ctx.save();
  ctx.translate(W / 2 - 300, 200);
  ctx.scale(5, 5);
  const gold = ctx.createLinearGradient(0, 0, 120, 100);
  gold.addColorStop(0, '#FFF1A8'); gold.addColorStop(0.45, '#FFC93C'); gold.addColorStop(1, '#B87A0A');
  ctx.shadowColor = 'rgba(255, 201, 60, 0.7)'; ctx.shadowBlur = 12;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#E0A21B'; ctx.lineWidth = 5; ctx.stroke(new Path2D(TROPHY_PATHS.handles));
  ctx.shadowBlur = 0;
  for (const d of [TROPHY_PATHS.cup, TROPHY_PATHS.stem]) {
    const p = new Path2D(d);
    ctx.fillStyle = gold; ctx.fill(p); ctx.strokeStyle = '#8A5A00'; ctx.lineWidth = 2; ctx.stroke(p);
  }
  const base = new Path2D(TROPHY_PATHS.base);
  ctx.fillStyle = '#2A1B0A'; ctx.fill(base); ctx.strokeStyle = '#E0A21B'; ctx.stroke(base);
  ctx.strokeStyle = 'rgba(255, 251, 224, 0.7)'; ctx.lineWidth = 4; ctx.stroke(new Path2D(TROPHY_PATHS.shine));
  ctx.fillStyle = '#8A5A00'; ctx.font = `20px ${body}`; ctx.fillText('♠', 60, 40);
  ctx.restore();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowOffsetY = 8; ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `92px ${display}`;
  ctx.fillText('CAMPIÓ DEL', W / 2, 830);
  ctx.fillStyle = '#FFC93C';
  ctx.font = `176px ${display}`;
  ctx.fillText('POKER TOUR', W / 2, 990);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = '#FFE48A';
  ctx.font = `700 60px ${body}`;
  ctx.fillText(`★ ${o.stars} / ${o.maxStars}`, W / 2, 1080);
  ctx.fillStyle = '#FFF8E7';
  ctx.font = `600 44px ${body}`;
  ctx.fillText(T.championLine(o.levels, o.cities.length), W / 2, 1145);
  ctx.font = `600 30px ${body}`;
  ctx.fillStyle = 'rgba(255, 248, 231, 0.75)';
  ctx.fillText(o.cities.join(' · '), W / 2, 1200);
  ctx.fillStyle = '#FFC93C';
  ctx.font = `48px ${display}`;
  ctx.fillText(new URL(gameUrl()).host.replace(/^www\./, '') || 'pokerlunch.com', W / 2, 1270);
}

/** Shares the picture; 'unsupported' when the phone can't share files (the caller falls back to text). */
export async function shareChampionImage(o: { stars: number; maxStars: number; levels: number; cities: readonly string[] }): Promise<'shared' | 'closed' | 'unsupported'> {
  if (!navigator.canShare) return 'unsupported';
  await Promise.all([document.fonts.load('80px "Bebas Neue"'), document.fonts.load('700 40px "Barlow Condensed"')]).catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unsupported';
  drawChampion(ctx, o);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return 'unsupported';
  const file = new File([blob], 'campio-poker-tour.png', { type: 'image/png' });
  if (!navigator.canShare({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file], text: `${T.championShareText(o.stars)}\n${gameUrl()}` });
    return 'shared';
  } catch (error) {
    // Closed the menu: done. Anything else falls back to text.
    if (error instanceof DOMException && error.name === 'AbortError') return 'closed';
    return 'unsupported';
  }
}
