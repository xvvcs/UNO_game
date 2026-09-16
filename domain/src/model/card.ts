export const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;
export const CARD_COLORS = ["BLUE", "GREEN", "RED", "YELLOW"] as const; 

export type CardNumber = (typeof CARD_NUMBERS)[number];
export type CardColor = (typeof CARD_COLORS)[number];

export type NumberedCard = {
  readonly type: "NUMBERED";
  readonly color: CardColor;
  readonly number: CardNumber;
};

export type SkipCard = {
  readonly type: "SKIP";
  readonly color: CardColor;
};

export type ReverseCard = {
  readonly type: "REVERSE";
  readonly color: CardColor;
};

export type Draw2Card = {
  readonly type: "DRAW";
  readonly color: CardColor;
};

export type Draw4Card = {
  readonly type: "WILD DRAW";
};

export type WildAnyColorCard = {
  readonly type: "WILD";
};

export type ActionCard = SkipCard | ReverseCard | Draw2Card;
export type ColoredCard = ActionCard | NumberedCard;
export type WildCard = Draw4Card | WildAnyColorCard;

export type Card = ColoredCard | WildCard;

export type Type = Card["type"];

export type TypedCard<T extends Type> = Extract<Card, { type: T }>;

// Helper functions for identifying cards
export function hasColor(card: Card, color: CardColor): boolean {
  return "color" in card && card.color === color;
}

export function hasNumber(card: Card, number: CardNumber): boolean {
  return card.type === "NUMBERED" && card.number === number;
}

export function isSameCard(card1: Card, card2: Card): boolean{
  if(card1.type !== card2.type){
    return false;
  }
  if("color" in card1 && "color" in card2){
    if(card1.color !== card2.color){
      return false;
    }
    if(card1.type === "NUMBERED" && card2.type === "NUMBERED"){
      return card1.number === card2.number;
    }
  }
  return true;
}
