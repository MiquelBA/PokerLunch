// A playing card: real poker cards, "online poker" style (big index at the top left, a big suit or
// the court figure in the middle), drawn from one SVG sprite (cards/cards.svg, see cards/README.md).
import { memo } from 'react';
import type { CardSpec } from '../engine/types';
import sprite from './cards/cards.svg?raw';
import { SUIT_SYMBOLS } from './uiConfig';

const LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function rankLabel(rank: number): string {
  return LABELS[rank] ?? String(rank);
}

/** The card drawings; rendered once, hidden, so every card can point at its symbol. */
export function CardSprite() {
  return <div className="card-sprite" aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />;
}

export const CardFace = memo(function CardFace({ card, className = '' }: { card: CardSpec; className?: string }) {
  const id = card.joker ? 'pl-joker' : `pl-${card.suit}-${card.rank}`;
  const label = card.joker ? 'Joker' : `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`;
  return (
    <div className={`card ${card.golden ? 'golden' : ''} ${card.joker ? 'joker' : ''} ${className}`} role="img" aria-label={label}>
      <svg>
        <use href={`#${id}`} width="100%" height="100%" />
      </svg>
    </div>
  );
});

/** A small suit icon (help sheet, card back). */
export function SuitIcon({ suit }: { suit: number }) {
  return (
    <svg className="suit" viewBox="0 0 24 24" aria-hidden="true">
      {suit === 0 && <path d="M12 2C9 6 3 9.5 3 14c0 2.8 2.2 4.7 4.7 4.7 1.6 0 2.9-.7 3.6-1.8-.3 1.9-1.1 3.4-2.6 4.6V22h6.6v-.5c-1.5-1.2-2.3-2.7-2.6-4.6.7 1.1 2 1.8 3.6 1.8 2.5 0 4.7-1.9 4.7-4.7C21 9.5 15 6 12 2z" />}
      {suit === 1 && <path d="M12 21.5s-7.8-4.8-9.8-9.6C.7 8.1 3.1 3.8 7.1 3.8c2.2 0 3.7 1.2 4.9 3 1.2-1.8 2.7-3 4.9-3 4 0 6.4 4.3 4.9 8.1-2 4.8-9.8 9.6-9.8 9.6z" />}
      {suit === 2 && <path d="M12 1.5 20.5 12 12 22.5 3.5 12z" />}
      {suit === 3 && (
        <>
          <circle cx="12" cy="6.6" r="4.4" />
          <circle cx="6.6" cy="13.4" r="4.4" />
          <circle cx="17.4" cy="13.4" r="4.4" />
          <path d="M10.8 11h2.4c0 4.3.8 7.4 3 10.4v.6H7.8v-.6c2.2-3 3-6.1 3-10.4z" />
        </>
      )}
    </svg>
  );
}

/** The back of every card: a red lattice in a cream frame, with a gold spade in the middle. */
export const CardBack = memo(function CardBack() {
  return (
    <div className="card-back" aria-hidden="true">
      <div className="card-back-inner">
        <SuitIcon suit={0} />
      </div>
    </div>
  );
});
