/** Schedule One–style Ride the Bus card helpers (52-card deck, no replacement). */

export type BusSuit = '♠' | '♥' | '♦' | '♣';
export type BusColor = 'red' | 'black';
export type BusHilo = 'higher' | 'lower';
export type BusRange = 'inside' | 'outside';

export interface BusCard {
  rank: number; // 2–14 (A = 14)
  suit: BusSuit;
}

export const BUS_SUITS: BusSuit[] = ['♠', '♥', '♦', '♣'];
export const BUS_RANK_LABEL: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export function busRankLabel(rank: number): string {
  return BUS_RANK_LABEL[rank] ?? String(rank);
}

export function busIsRed(card: BusCard): boolean {
  return card.suit === '♥' || card.suit === '♦';
}

export function createBusDeck(): BusCard[] {
  const deck: BusCard[] = [];
  for (const suit of BUS_SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffleBusDeck(deck: BusCard[]): BusCard[] {
  const next = [...deck];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function drawBusCard(deck: BusCard[]): { card: BusCard; rest: BusCard[] } {
  const [card, ...rest] = deck;
  return { card, rest };
}

export function busColorChance(deck: BusCard[], color: BusColor): number {
  if (deck.length === 0) return 0;
  const hits = deck.filter((c) => (color === 'red' ? busIsRed(c) : !busIsRed(c))).length;
  return hits / deck.length;
}

/** Schedule One: equal rank counts as higher. */
export function busHiloChance(deck: BusCard[], prev: BusCard, dir: BusHilo): number {
  if (deck.length === 0) return 0;
  const hits = deck.filter((c) => (dir === 'higher' ? c.rank >= prev.rank : c.rank < prev.rank)).length;
  return hits / deck.length;
}

export function busHiloMatches(prev: BusCard, next: BusCard, dir: BusHilo): boolean {
  return dir === 'higher' ? next.rank >= prev.rank : next.rank < prev.rank;
}

/** Inside = strictly between the two ranks; outside = everything else (incl. ties). */
export function busRangeChance(deck: BusCard[], a: BusCard, b: BusCard, dir: BusRange): number {
  if (deck.length === 0) return 0;
  const lo = Math.min(a.rank, b.rank);
  const hi = Math.max(a.rank, b.rank);
  const hits = deck.filter((c) => {
    const inside = c.rank > lo && c.rank < hi;
    return dir === 'inside' ? inside : !inside;
  }).length;
  return hits / deck.length;
}

export function busRangeMatches(a: BusCard, b: BusCard, next: BusCard, dir: BusRange): boolean {
  const lo = Math.min(a.rank, b.rank);
  const hi = Math.max(a.rank, b.rank);
  const inside = next.rank > lo && next.rank < hi;
  return dir === 'inside' ? inside : !inside;
}

export function busSuitChance(deck: BusCard[], suit: BusSuit): number {
  if (deck.length === 0) return 0;
  return deck.filter((c) => c.suit === suit).length / deck.length;
}
