// Poker Tour map: a skyline for each city, drawn as silhouettes over the city's sky (the sky and
// the colours come from the CSS theme). viewBox 400×100, ground at the bottom.
import type { ReactNode } from 'react';
import type { TourTheme } from '../../engine/tour/schema';

/** Thin spokes of a big wheel (London Eye, the Atlantic City pier). */
function wheel(cx: number, cy: number, r: number): ReactNode {
  return (
    <g className="sk-line">
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth="2.5" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} strokeWidth="1.2" />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={`c${i}`} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r="2.6" className="sk-fill" stroke="none" />;
      })}
      <path d={`M${cx - r * 0.5} 100 L${cx} ${cy} L${cx + r * 0.5} 100`} fill="none" strokeWidth="3" />
    </g>
  );
}

const SKYLINES: Record<TourTheme, ReactNode> = {
  // The Sagrada Família's spires, Torre Glòries and the sea.
  barcelona: (
    <>
      <path className="sk-back" d="M0 78 h30 v-10 h22 v14 h26 v-18 h18 v22 h40 v-8 h30 v12 h60 v-16 h24 v10 h50 v-12 h30 v16 h70 V100 H0z" />
      <g className="sk-fill">
        {[[110, 30], [124, 18], [138, 10], [152, 18], [166, 30]].map(([x, top]) => (
          <path key={x} d={`M${x - 6} 100 V${top + 22} L${x} ${top} L${x + 6} ${top + 22} V100z`} />
        ))}
        <rect x="98" y="62" width="80" height="38" />
        <path d="M290 100 V44 Q290 18 306 18 Q322 18 322 44 V100z" />
        <rect x="200" y="70" width="26" height="30" /><rect x="232" y="60" width="20" height="40" /><rect x="340" y="66" width="34" height="34" />
      </g>
      <path className="sk-sea" d="M0 94 Q20 90 40 94 T80 94 T120 94 T160 94 T200 94 T240 94 T280 94 T320 94 T360 94 T400 94 V100 H0z" />
    </>
  ),
  // The hills, the Casino with its dome and towers, yachts in the harbour.
  montecarlo: (
    <>
      <path className="sk-back" d="M0 70 Q60 30 130 52 T260 38 T400 56 V100 H0z" />
      <g className="sk-fill">
        <rect x="140" y="58" width="120" height="42" />
        <path d="M178 58 Q200 26 222 58z" /><rect x="198" y="22" width="4" height="10" />
        <rect x="144" y="40" width="14" height="20" /><path d="M144 40 L151 28 L158 40z" />
        <rect x="242" y="40" width="14" height="20" /><path d="M242 40 L249 28 L256 40z" />
        <rect x="40" y="62" width="30" height="38" /><rect x="74" y="54" width="22" height="46" /><rect x="300" y="60" width="28" height="40" /><rect x="332" y="50" width="20" height="50" />
        <path d="M20 94 h40 l-6 6 h-28z M30 94 V80 l10 10z" /><path d="M330 94 h50 l-8 6 h-34z M346 94 V76 l14 14z" />
      </g>
    </>
  ),
  // Big Ben, Tower Bridge and the London Eye.
  london: (
    <>
      <path className="sk-back" d="M0 80 h40 v-12 h30 v16 h50 v-10 h40 v8 h70 v-14 h40 v12 h60 v-8 h70 V100 H0z" />
      <g className="sk-fill">
        <rect x="52" y="30" width="20" height="70" /><path d="M50 30 L62 4 L74 30z" />
        <rect x="140" y="40" width="16" height="60" /><path d="M138 40 L148 24 L158 40z" />
        <rect x="214" y="40" width="16" height="60" /><path d="M212 40 L222 24 L232 40z" />
        <rect x="156" y="50" width="58" height="6" /><path d="M156 84 Q185 66 214 84 V88 H156z" />
      </g>
      <circle cx="62" cy="40" r="6" className="sk-glow" />
      {wheel(320, 52, 40)}
    </>
  ),
  // The Grand Lisboa's lotus, the Ruins of St Paul's and Macau Tower.
  macau: (
    <>
      <path className="sk-back" d="M0 76 h50 v-10 h30 v14 h60 v-20 h20 v20 h80 v-12 h40 v8 h60 v-10 h60 V100 H0z" />
      <g className="sk-fill">
        <path d="M70 100 V58 h40 V100z M66 58 L90 40 L114 58z M80 70 h6 v12 h-6z M94 70 h6 v12 h-6z" fillRule="evenodd" />
        <path d="M188 100 V62 Q174 44 178 10 Q192 28 200 26 Q208 28 222 10 Q226 44 212 62 V100z" />
        <rect x="236" y="70" width="30" height="30" /><rect x="150" y="74" width="30" height="26" />
        <rect x="324" y="20" width="6" height="80" /><ellipse cx="327" cy="40" rx="16" ry="6" /><rect x="326" y="4" width="2" height="16" />
      </g>
      <circle cx="200" cy="34" r="5" className="sk-glow" />
    </>
  ),
  // Hotel towers on the boardwalk, the pier and its big wheel, the ocean.
  atlantic: (
    <>
      <path className="sk-back" d="M0 72 h60 v-16 h30 v20 h70 v-10 h40 v14 h200 V100 H0z" />
      <g className="sk-fill">
        <path d="M30 100 V36 Q30 26 44 26 Q58 26 58 36 V100z" /><rect x="66" y="46" width="30" height="54" />
        <path d="M104 100 V22 h26 V100z M104 22 l13 -12 l13 12z" /><rect x="138" y="54" width="34" height="46" />
        <rect x="190" y="64" width="44" height="36" />
        <rect x="250" y="86" width="150" height="4" />
        {[262, 290, 318, 346, 374].map((x) => <rect key={x} x={x} y="90" width="3" height="10" />)}
      </g>
      {wheel(330, 50, 34)}
      <path className="sk-sea" d="M0 96 Q25 92 50 96 T100 96 T150 96 T200 96 T250 96 T300 96 T350 96 T400 96 V100 H0z" />
    </>
  ),
  // The pyramid, the Eiffel replica, hotel towers and the Strat.
  vegas: (
    <>
      <path className="sk-back" d="M0 74 h40 v-20 h24 v26 h60 v-14 h40 v10 h80 v-22 h30 v18 h126 V100 H0z" />
      <g className="sk-fill">
        <path d="M20 100 L70 46 L120 100z" />
        <path d="M168 100 L182 60 L186 24 L188 8 L190 24 L194 60 L208 100 h-8 L188 72 L176 100z" />
        <rect x="216" y="38" width="26" height="62" /><rect x="246" y="52" width="22" height="48" /><path d="M126 100 V44 Q140 36 154 44 V100z" />
        <rect x="336" y="26" width="7" height="74" /><path d="M326 30 h27 l-4 -10 h-19z" /><rect x="338" y="2" width="3" height="18" />
        <rect x="290" y="60" width="28" height="40" /><rect x="360" y="56" width="30" height="44" />
      </g>
      <circle cx="70" cy="46" r="3" className="sk-glow" />
      <path className="sk-neon" d="M216 50 h26 M216 62 h26 M246 64 h22 M126 56 h28" />
    </>
  ),
};

export function Skyline({ theme }: { theme: TourTheme }) {
  return (
    <svg className="skyline" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {SKYLINES[theme]}
    </svg>
  );
}

/** The champion's trophy (map, Champion screen and the shared image). */
export const TROPHY_PATHS = {
  cup: 'M30 8 h60 v10 c0 28 -10 44 -30 48 c-20 -4 -30 -20 -30 -48z',
  handles: 'M30 16 h-14 c0 18 8 28 20 30 M90 16 h14 c0 18 -8 28 -20 30',
  stem: 'M54 66 h12 v14 h-12z',
  base: 'M38 80 h44 v8 h-44z M32 88 h56 v10 h-56z',
  shine: 'M40 16 c0 20 4 32 12 40',
} as const;

export function Trophy({ className = '' }: { className?: string }) {
  return (
    <svg className={`trophy ${className}`} viewBox="0 0 120 100" aria-hidden="true">
      <defs>
        <linearGradient id="trophy-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF1A8" /><stop offset="0.45" stopColor="#FFC93C" /><stop offset="1" stopColor="#B87A0A" />
        </linearGradient>
      </defs>
      <path d={TROPHY_PATHS.handles} fill="none" stroke="#E0A21B" strokeWidth="5" strokeLinecap="round" />
      <path d={TROPHY_PATHS.cup} fill="url(#trophy-gold)" stroke="#8A5A00" strokeWidth="2" />
      <path d={TROPHY_PATHS.stem} fill="url(#trophy-gold)" stroke="#8A5A00" strokeWidth="2" />
      <path d={TROPHY_PATHS.base} fill="#2A1B0A" stroke="#E0A21B" strokeWidth="2" />
      <path d={TROPHY_PATHS.shine} fill="none" stroke="#FFFBE0" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <text x="60" y="40" textAnchor="middle" fontSize="20" fill="#8A5A00">♠</text>
    </svg>
  );
}
