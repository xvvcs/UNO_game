import { hasColor, type Card, type CardColor } from "./card.js";

export type PlayContext = {
  readonly hand: readonly Card[];
  readonly topCard: Card;
  readonly currentColor: CardColor;
};

export function canCardBePlayed(card: Card, { hand, topCard, currentColor }: PlayContext): boolean {
  // A wild can always be played; a wild draw 4 only when no card matches the colour.
  if (card.type === "WILD") return true;
  if (card.type === "WILD DRAW") return !hand.some((c) => hasColor(c, currentColor));

  if (card.color === currentColor) return true;

  if (card.type === "NUMBERED" && topCard.type === "NUMBERED") {
    return card.number === topCard.number;
  }
  // Same special-card type (skip/reverse/draw) counts as a match too.
  return card.type === topCard.type;
}
