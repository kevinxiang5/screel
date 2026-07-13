export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let cardSeq = 0;

export function createShoe(decks = 6): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ id: `${d}-${suit}-${rank}-${cardSeq++}`, suit, rank });
      }
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

export function draw(shoe: Card[]): { card: Card; shoe: Card[] } {
  const next = [...shoe];
  if (next.length < 20) {
    return { card: createShoe()[0], shoe: createShoe().slice(1) };
  }
  const card = next.pop()!;
  return { card, shoe: next };
}

export function cardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return Number(rank);
}

export function handValue(cards: Card[]): number {
  const visible = cards.filter((c) => !c.hidden);
  let total = 0;
  let aces = 0;
  for (const card of visible) {
    total += cardValue(card.rank);
    if (card.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

/** Soft total if an ace is still counting as 11 */
export function isSoft(cards: Card[]): boolean {
  const visible = cards.filter((c) => !c.hidden);
  let total = 0;
  let aces = 0;
  for (const card of visible) {
    total += cardValue(card.rank);
    if (card.rank === 'A') aces += 1;
  }
  return aces > 0 && total <= 21;
}

export function handLabel(cards: Card[]): string {
  if (!cards.length) return '';
  const v = handValue(cards);
  if (cards.some((c) => c.hidden)) return String(handValue(cards.filter((c) => !c.hidden)));
  if (isBlackjack(cards)) return 'BJ';
  if (v > 21) return 'BUST';
  return isSoft(cards) && cards.length > 1 ? `${v} soft` : String(v);
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

export function isRed(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}

export function canSplit(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  return cardValue(cards[0].rank) === cardValue(cards[1].rank);
}
