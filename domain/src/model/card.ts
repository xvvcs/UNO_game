export const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;
export const CARD_COLORS = ["Blue", "Green", "Red", "Yellow"] as const; 

export type CardNumber = (typeof CARD_NUMBERS)[number];
export type CardColor = (typeof CARD_COLORS)[number];

export type NumberedCard = {
  readonly type: "number";
  readonly color: CardColor;
  readonly value: CardNumber;
};

export type SkipCard = {
  readonly type: "skip";
  readonly color: CardColor;
};

export type ReverseCard = {
  readonly type: "reverse";
  readonly color: CardColor;
};

export type Draw2Card = {
  readonly type: "draw_2";
  readonly color: CardColor;
};

export type Draw4Card = {
  readonly type: "draw_4";
};

export type WildAnyColorCard = {
  readonly type: "any_color";
};

export type ActionCard = SkipCard | ReverseCard | Draw2Card;
export type ColoredCard = ActionCard | NumberedCard;
export type WildCard = Draw4Card | WildAnyColorCard;

export type Card = ColoredCard | WildCard;

export type Type = Card["type"];

export type TypedCard<T extends Type> = Extract<Card, { type: T }>;
