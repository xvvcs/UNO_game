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

export interface RoundConfig {
  readonly players: string[];
  readonly dealer: number;
  readonly cardsPerPlayer?: number;
}

// Plain, JSON-serialisable snapshot of a Round's entire state - every
// hand (including opponents'), both piles, whose turn it is, and so on.
// Anyone holding one of these can rebuild an equivalent Round without
// touching any of UnoRound's internals.
export interface RoundMemento {
  readonly players: string[];
  readonly hands: Card[][];
  readonly drawPile: Card[];
  readonly discardPile: Card[];
  readonly currentColor: CardColor;
  readonly currentDirection: "clockwise" | "counterclockwise";
  readonly dealer: number;
  readonly playerInTurn?: number | undefined;
}

export interface Round {
  readonly playerCount: number;
  readonly dealer: number;
  readonly currentColor: CardColor;
  readonly winner: number | undefined;
  readonly hasEnded: boolean;

  player(playerIndex: number): string;
  playerHand(playerIndex: number): readonly Card[];
  playerInTurn(): number | undefined;
  drawPile(): Deck;
  discardPile(): Deck;
  topCard(): Card;
  canPlay(cardIndex: number): boolean;
  canPlayAny(): boolean;
  play(cardIndex: number, color?: CardColor): Card;
  draw(): Card | undefined;
  toMemento(): RoundMemento;
}

export class UnoRound implements Round {
  private readonly players: string[];
  private readonly dealerIndex: number;
  private readonly playerHands: PlayerHand[];
  private readonly drawDeck: Deck;
  private readonly discardDeck: Deck;
  private readonly randomizer: Randomizer;
  private readonly shuffler: Shuffler<Card>;

  private turn = 0;
  private playDirection: 1 | -1 = 1;
  private color: CardColor;
  private roundWinner: number | undefined = undefined;

  // Pass a config to deal a fresh round, or a RoundMemento to restore
  // one exactly as it was saved (used by fromMemento / test adapters).
  constructor(
    configOrMemento: RoundConfig | RoundMemento,
    randomizer: Randomizer = standardRandomizer,
    shuffler: Shuffler<Card> = standardShuffler,
  ) {
    this.randomizer = randomizer;
    this.shuffler = shuffler;

    if ("hands" in configOrMemento) {
      const memento = configOrMemento;
      const { players, hands, dealer, playerInTurn } = memento;
      const emptyHands = hands.flatMap((cards, i) => (cards.length === 0 ? [i] : []));
      const inBounds = (i: number | undefined) => i !== undefined && i >= 0 && i < players.length;
      const valid =
        players.length >= 2 &&
        hands.length === players.length &&
        emptyHands.length <= 1 &&
        memento.discardPile.length > 0 &&
        CARD_COLORS.includes(memento.currentColor) &&
        inBounds(dealer) &&
        (emptyHands.length === 1 || inBounds(playerInTurn));
      if (!valid) throw new Error("Invalid round memento");

      this.players = [...players];
      this.dealerIndex = dealer;
      this.playerHands = hands.map((cards) => new UnoPlayerHand([...cards]));
      this.drawDeck = UnoDeck.fromMemento(memento.drawPile);
      this.discardDeck = UnoDeck.fromMemento(memento.discardPile);
      this.playDirection = memento.currentDirection === "clockwise" ? 1 : -1;
      this.color = memento.currentColor;
      this.turn = playerInTurn ?? 0;
      this.roundWinner = emptyHands[0];

      const top = this.discardDeck.top()!;
      if ("color" in top && top.color !== this.color) throw new Error("Invalid round memento");
      return;
    }

    const { players, dealer, cardsPerPlayer = 7 } = configOrMemento;
    if (players.length < 2 || players.length > 10) {
      throw new Error("UNO needs between 2 and 10 players");
    }
    this.players = [...players];
    this.dealerIndex = dealer;

    this.drawDeck = new UnoDeck(true);
    this.drawDeck.shuffle(this.shuffler);
    this.discardDeck = new UnoDeck(false);

    // Deal cards to every player
    this.playerHands = [];
    for (let p = 0; p < players.length; p++) {
      const dealt: Card[] = [];
      for (let i = 0; i < cardsPerPlayer; i++) {
        const card = this.drawFromPile();
        if (card) dealt.push(card);
      }
      this.playerHands.push(new UnoPlayerHand(dealt));
    }

    // Flip the starter card. A wild card can't start a hand, so it goes
    // back in and we reshuffle; every other card is allowed to start.
    let starter = this.drawFromPile();
    while (starter && (starter.type === "WILD DRAW" || starter.type === "WILD")) {
      this.drawDeck.add(starter);
      this.drawDeck.shuffle(this.shuffler);
      starter = this.drawFromPile();
    }
    if (!starter) {
      throw new Error("Not enough cards to start a round");
    }
    this.discardDeck.add(starter);

    // Simplification: an "any colour" starter has no colour of its own, so
    // we pick one for it rather than making the first player choose.
    this.color =
      "color" in starter ? starter.color : CARD_COLORS[this.randomizer(CARD_COLORS.length)];

    // The starter card's effect still applies before anyone has played.
    this.turn = this.mod(dealer + 1);
    this.applyStarterEffect(starter);
  }

  static fromMemento(
    memento: RoundMemento,
    randomizer: Randomizer = standardRandomizer,
    shuffler: Shuffler<Card> = standardShuffler,
  ): UnoRound {
    return new UnoRound(memento, randomizer, shuffler);
  }

  private drawFromPile(): Card | undefined {
    const card = this.drawDeck.deal();
    if (this.drawDeck.size === 0) {
      this.reshuffleDiscardIntoDrawPile();
    }
    return card;
  }

  private reshuffleDiscardIntoDrawPile(): void {
    const top = this.discardDeck.deal();
    const rest: Card[] = [];
    let card = this.discardDeck.deal();
    while (card) {
      rest.push(card);
      card = this.discardDeck.deal();
    }
    if (top) this.discardDeck.add(top);
    this.shuffler(rest);
    this.drawDeck.add(rest);
  }

  private applyStarterEffect(starter: Card): void {
    switch (starter.type) {
      case "SKIP":
        this.advanceTurn(1);
        break;
      case "REVERSE":
        this.playDirection = -1;
        this.turn = this.mod(this.dealerIndex - 1);
        break;
      case "DRAW":
        this.forceDraw(this.turn, 2);
        this.advanceTurn(1);
        break;
      default:
        // NUMBERED, WILD: play simply starts with the player after the dealer
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

  get dealer(): number {
    return this.dealerIndex;
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

  player(playerIndex: number): string {
    const name = this.players[playerIndex];
    if (name === undefined) throw new Error("Player index out of bounds");
    return name;
  }

  playerHand(playerIndex: number): readonly Card[] {
    return this.playerHands[playerIndex].cardsInHand;
  }

  playerInTurn(): number | undefined {
    return this.hasEnded ? undefined : this.turn;
  }

  drawPile(): Deck {
    return this.drawDeck;
  }

  discardPile(): Deck {
    return this.discardDeck;
  }

  toMemento(): RoundMemento {
    return {
      players: [...this.players],
      hands: this.playerHands.map((hand) => [...hand.cardsInHand]),
      drawPile: this.drawDeck.toMemento(),
      discardPile: this.discardDeck.toMemento(),
      currentColor: this.color,
      currentDirection: this.playDirection === 1 ? "clockwise" : "counterclockwise",
      dealer: this.dealerIndex,
      playerInTurn: this.playerInTurn(),
    };
  }

  topCard(): Card {
    const top = this.discardDeck.top();
    if (!top) throw new Error("Discard pile is unexpectedly empty");
    return top;
  }

  canPlay(cardIndex: number): boolean {
    if (this.hasEnded) return false;
    const hand = this.playerHands[this.turn].cardsInHand;
    const card = hand[cardIndex];
    if (card === undefined) return false;

    // A wild can always be played; a wild draw 4 only when no card matches the colour.
    if (card.type === "WILD") return true;
    if (card.type === "WILD DRAW") return !hand.some((c) => "color" in c && c.color === this.color);

    if (card.color === this.color) return true;

    const top = this.topCard();
    if (card.type === "NUMBERED" && top.type === "NUMBERED") {
      return card.number === top.number;
    }
    // Same special-card type (skip/reverse/draw) counts as a match too.
    return card.type === top.type;
  }

  canPlayAny(): boolean {
    return this.playerHands[this.turn].cardsInHand.some((_, i) => this.canPlay(i));
  }

  play(cardIndex: number, color?: CardColor): Card {
    if (!this.canPlay(cardIndex)) throw new Error("Illegal play");

    const hand = this.playerHands[this.turn];
    const card = hand.cardsInHand[cardIndex];
    const isWild = card.type === "WILD DRAW" || card.type === "WILD";
    if (isWild && color === undefined) throw new Error("A wild card needs a colour");
    if (!isWild && color !== undefined) throw new Error("Only a wild card takes a colour");

    hand.playCard(card);
    this.discardDeck.add(card);

    if (hand.size === 0) {
      this.roundWinner = this.turn;
      return card;
    }

    if (isWild && color) {
      this.color = color;
    } else if ("color" in card) {
      this.color = card.color;
    }

    switch (card.type) {
      case "SKIP":
        this.advanceTurn(2);
        break;
      case "REVERSE":
        this.playDirection = this.playDirection === 1 ? -1 : 1;
        // With exactly 2 players a reverse behaves like a skip.
        this.advanceTurn(this.playerCount === 2 ? 2 : 1);
        break;
      case "DRAW": {
        const next = this.mod(this.turn + this.playDirection);
        this.forceDraw(next, 2);
        this.advanceTurn(2);
        break;
      }
      case "WILD DRAW": {
        const next = this.mod(this.turn + this.playDirection);
        this.forceDraw(next, 4);
        this.advanceTurn(2);
        break;
      }
      default:
        this.advanceTurn(1);
    }

    return card;
  }

  draw(): Card | undefined {
    if (this.hasEnded) return undefined;

    const hand = this.playerHands[this.turn];
    const card = this.drawFromPile();
    if (card) {
      hand.add(card);
    }
    // The turn only passes on if the drawn card cannot be played.
    if (card === undefined || !this.canPlay(hand.size - 1)) {
      this.advanceTurn(1);
    }
    return card;
  }
}
