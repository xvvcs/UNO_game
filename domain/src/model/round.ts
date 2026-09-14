import type { Card, CardColor } from "./card.js";
import { CARD_COLORS } from "./card.js";
import { UnoDeck, type Deck } from "./deck.js";
import { UnoPlayerHand, type PlayerHand } from "./playerHand.js";
import {
  standardRandomizer,
  standardShuffler,
  type Randomizer,
  type Shuffler,
} from "../utils/random_utils.js";

// Result of attempting to play a card 
export type PlayResult = "played" | "not_your_turn" | "not_in_hand" | "illegal_card" | "missing_color";

export interface Round {
  readonly playerCount: number;
  readonly hands: readonly PlayerHand[];
  readonly currentPlayer: number;
  readonly direction: 1 | -1;
  readonly currentColor: CardColor;
  readonly winner: number | undefined;
  readonly hasEnded: boolean;

  topCard(): Card;
  canPlay(playerIndex: number, card: Card): boolean;
  play(playerIndex: number, card: Card, chosenColor?: CardColor): PlayResult;
  draw(playerIndex: number): Card | undefined;
}

export class UnoRound implements Round {
  private readonly playerHands: PlayerHand[];
  private readonly drawPile: Deck;
  private readonly discardPile: Deck;
  private readonly randomizer: Randomizer;
  private readonly shuffler: Shuffler<Card>;

  private turn = 0;
  private playDirection: 1 | -1 = 1;
  private color: CardColor;
  private roundWinner: number | undefined = undefined;

  constructor(
    playerCount: number,
    randomizer: Randomizer = standardRandomizer,
    shuffler: Shuffler<Card> = (ts) => standardShuffler(randomizer, ts),
  ) {
    if (playerCount < 2) {
      throw new Error("UNO needs at least 2 players");
    }

    this.randomizer = randomizer;
    this.shuffler = shuffler;

    this.drawPile = new UnoDeck(true);
    this.drawPile.shuffleDeck();
    this.discardPile = new UnoDeck(false);

    // Deal 7 cards to every player
    this.playerHands = [];
    for (let p = 0; p < playerCount; p++) {
      const dealt: Card[] = [];
      for (let i = 0; i < 7; i++) {
        const card = this.drawFromPile();
        if (card) dealt.push(card);
      }
      this.playerHands.push(new UnoPlayerHand(dealt));
    }

    // Flip the starter card. A Draw 4 can't legally start a hand, so it goes
    // back in and we reshuffle; every other card is allowed to start.
    let starter = this.drawFromPile();
    while (starter && starter.type === "draw_4") {
      this.drawPile.add(starter);
      this.drawPile.shuffleDeck();
      starter = this.drawFromPile();
    }
    if (!starter) {
      throw new Error("Not enough cards to start a round");
    }
    this.discardPile.add(starter);

    // Simplification: an "any colour" starter has no colour of its own, so
    // we pick one for it rather than making the first player choose.
    this.color =
      "color" in starter ? starter.color : CARD_COLORS[this.randomizer(CARD_COLORS.length)];

    // The starter card's effect still applies before anyone has played.
    this.applyStarterEffect(starter);
  }

  private drawFromPile(): Card | undefined {
    if (this.drawPile.size === 0) {
      this.reshuffleDiscardIntoDrawPile();
    }
    return this.drawPile.draw();
  }

  private reshuffleDiscardIntoDrawPile(): void {
    const top = this.discardPile.draw();
    const rest: Card[] = [];
    let card = this.discardPile.draw();
    while (card) {
      rest.push(card);
      card = this.discardPile.draw();
    }
    if (top) this.discardPile.add(top);
    this.drawPile.add(this.shuffler(rest));
  }

  private applyStarterEffect(starter: Card): void {
    switch (starter.type) {
      case "skip":
        this.turn = this.mod(1);
        break;
      case "reverse":
        this.playDirection = -1;
        break;
      case "draw_2":
        this.forceDraw(0, 2);
        this.turn = this.mod(1);
        break;
      default:
        // number, any_color: play simply starts with player 0
        break;
    }
  }

  private mod(index: number): number {
    const n = this.playerHands.length;
    return ((index % n) + n) % n;
  }

  private forceDraw(playerIndex: number, count: number): void {
    const hand = this.playerHands[playerIndex];
    for (let i = 0; i < count; i++) {
      const card = this.drawFromPile();
      if (card) hand.add(card);
    }
  }

  private advanceTurn(steps: number): void {
    this.turn = this.mod(this.turn + steps * this.playDirection);
  }

  get playerCount(): number {
    return this.playerHands.length;
  }

  get hands(): readonly PlayerHand[] {
    return this.playerHands;
  }

  get currentPlayer(): number {
    return this.turn;
  }

  get direction(): 1 | -1 {
    return this.playDirection;
  }

  get currentColor(): CardColor {
    return this.color;
  }

  get winner(): number | undefined {
    return this.roundWinner;
  }

  get hasEnded(): boolean {
    return this.roundWinner !== undefined;
  }

  topCard(): Card {
    const top = this.discardPile.checkCard();
    if (!top) throw new Error("Discard pile is unexpectedly empty");
    return top;
  }

  canPlay(playerIndex: number, card: Card): boolean {
    if (this.hasEnded || playerIndex !== this.turn) return false;

    // Wild cards can always be played regardless of the current colour/type.
    if (card.type === "draw_4" || card.type === "any_color") return true;

    if ("color" in card && card.color === this.color) return true;

    const top = this.topCard();
    if (card.type === "number" && top.type === "number") {
      return card.value === top.value;
    }
    // Same special-card type (skip/reverse/draw_2) counts as a match too.
    return card.type === top.type;
  }

  play(playerIndex: number, card: Card, chosenColor?: CardColor): PlayResult {
    if (this.hasEnded || playerIndex !== this.turn) return "not_your_turn";

    const hand = this.playerHands[playerIndex];
    if (!hand.hasCard(card)) return "not_in_hand";
    if (!this.canPlay(playerIndex, card)) return "illegal_card";

    const isWild = card.type === "draw_4" || card.type === "any_color";
    if (isWild && !chosenColor) return "missing_color";

    hand.playCard(card);
    this.discardPile.add(card);

    if (hand.size === 0) {
      this.roundWinner = playerIndex;
      return "played";
    }

    if (isWild && chosenColor) {
      this.color = chosenColor;
    } else if ("color" in card) {
      this.color = card.color;
    }

    switch (card.type) {
      case "skip":
        this.advanceTurn(2);
        break;
      case "reverse":
        this.playDirection = this.playDirection === 1 ? -1 : 1;
        // With exactly 2 players a reverse behaves like a skip.
        this.advanceTurn(this.playerCount === 2 ? 2 : 1);
        break;
      case "draw_2": {
        const next = this.mod(this.turn + this.playDirection);
        this.forceDraw(next, 2);
        this.advanceTurn(2);
        break;
      }
      case "draw_4": {
        const next = this.mod(this.turn + this.playDirection);
        this.forceDraw(next, 4);
        this.advanceTurn(2);
        break;
      }
      default:
        this.advanceTurn(1);
    }

    return "played";
  }

  draw(playerIndex: number): Card | undefined {
    if (this.hasEnded || playerIndex !== this.turn) return undefined;

    const card = this.drawFromPile();
    if (card) {
      this.playerHands[playerIndex].add(card);
    }
    // Rule: "if a player can't match the card, they must draw a card
    // instead" drawing stands in for a play, so the turn passes on.
    this.advanceTurn(1);
    return card;
  }
}