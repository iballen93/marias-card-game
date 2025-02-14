import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Card } from 'src/app/components/card-pile/card-pile.component';

@Component({
    selector: 'app-hand',
    templateUrl: './hand.component.html',
    styleUrls: ['./hand.component.less']
})
export class HandComponent implements OnInit {

    @Input() playerTitle: string;
    @Input() playerMoney: number;
    @Input() playerCards: Card[];
    @Input() marriageCards: Card[];
    @Input() buryCards: Card[];
    @Input() winCards: Card[];

    @Output() cardSelected = new EventEmitter<Card>();

    constructor() {
    }

    ngOnInit(): void {
    }

    formatCurrency(value: number): string {
        return (value / 100).toFixed(2);
    }

    forwardCardSelected(card: Card): void {
        this.cardSelected.emit(card);
    }
}
