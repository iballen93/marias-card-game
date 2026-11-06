import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {MARRIAGE_CARD_KEY_PREFIX} from 'src/app/card-animation.service';

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
  @Output() cardSelected = new EventEmitter<Card>();

  readonly FULL_CARD_WIDTH = 'var(--card-width)';
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

  // A marriage card is shown twice, in the marriage pile and wherever it was played
  getCardKey(card: Card): string {
    return this.title === 'Marriage' ? MARRIAGE_CARD_KEY_PREFIX + card.code : card.code;
  }
}
