import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {MARRIAGE_CARD_KEY_PREFIX} from 'src/app/card-animation.service';

export const CARD_BACK_IMAGE = 'assets/cards/back.png';

export interface Card {
  code: string;
  image: string;
  suit: string;
}

@Component({
  selector: 'app-card-pile',
  templateUrl: './card-pile.component.html',
  styleUrls: ['./card-pile.component.less']
})
export class CardPileComponent implements OnInit {

  @Input() cards: Card[];
  @Input() title: string;
  @Input() alwaysShowTitle = false;

  // Without a width, cards stay full size and overlap more as the pile runs out of room
  @Input() cardWidth: string;
  @Input() cardOverlap: string;
  // the codes of cards to lift, such as the cards that can legally be played on this turn
  @Input() liftedCards: string[] = [];
  // Standard: show the backs of the cards, so you can see how many there are but not what they are
  @Input() faceDown = false;
  @Output() cardSelected = new EventEmitter<Card>();

  readonly FULL_CARD_WIDTH = 'var(--card-width)';
  readonly CARD_BACK = CARD_BACK_IMAGE;
  private readonly FULL_CARD_SPACING = 'var(--card-spacing)';

  constructor() {
  }

  ngOnInit(): void {
  }

  selectCard(card: Card): void {
    this.cardSelected.emit(card);
  }

  getCardFlex(isLastCard: boolean): string {
    if (this.cardWidth) {
      return `0 0 ${this.cardWidth}`;
    }
    return isLastCard ? `0 0 ${this.FULL_CARD_WIDTH}` : `0 1 ${this.FULL_CARD_SPACING}`;
  }

  getCardMargin(index: number): string {
    return index > 0 && this.cardOverlap ? `calc(-1 * ${this.cardOverlap})` : '0';
  }

  // Lifted cards rise and the rest sink by half the lift, so they stay inside the pile's room
  getCardLift(card: Card): string {
    if (!this.liftedCards?.length) {
      return null;
    }
    const direction = this.liftedCards.includes(card.code) ? -1 : 1;
    return `translateY(calc(${direction} * var(--card-lift) / 2))`;
  }

  // A marriage card is shown twice, in the marriage pile and wherever it was played
  getCardKey(card: Card): string {
    return this.title === 'Marriage' ? MARRIAGE_CARD_KEY_PREFIX + card.code : card.code;
  }
}
