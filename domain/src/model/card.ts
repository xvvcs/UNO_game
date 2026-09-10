const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;
const CARD_COLORS = ["Blue", "Green", "Red", "Yellow"] as const;

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

export type Draw_2Card = {
  readonly type: "draw_2";
  readonly color: CardColor;
};

export type Draw_4Card = {
  readonly type: "draw_4";
};

export type WildAnyColorCard = {
  readonly type: "wild";
};

export type ActionCard = SkipCard | ReverseCard | Draw_2Card;
export type ColoredCard = ActionCard | NumberedCard;
export type WildCard = Draw_4Card | WildAnyColorCard;

export type Card = ColoredCard | WildCard;

export type Type = Card["type"];

export type TypedCard<Type> = Extract<Card, { type: Type }>;
