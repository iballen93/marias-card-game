import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

export interface Card {
  code: string;
  image: string;
  images: any;
  value: string;
  suit: string;
  title: string;
}

@Component({
  selector: 'app-hand',
  templateUrl: './hand.component.html',
  styleUrls: ['./hand.component.less']
})
export class HandComponent implements OnInit {

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
}
