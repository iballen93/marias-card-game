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
  @Output() cardSelected = new EventEmitter<Card>();

  constructor() {
  }

  ngOnInit(): void {
  }

  selectCard(card: Card): void {
    this.cardSelected.emit(card);
  }

  // A marriage card is shown twice, in the marriage pile and wherever it was played
  getCardKey(card: Card): string {
    return this.title === 'Marriage' ? MARRIAGE_CARD_KEY_PREFIX + card.code : card.code;
  }
}
