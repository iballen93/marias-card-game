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
    @Input() playerPoints: number;
    @Input() playerCards: Card[];
    @Input() marriageCards: Card[];
    @Input() buryCards: Card[];
    @Input() winCards: Card[];

    @Output() cardSelected = new EventEmitter<Card>();

    readonly WIN_PILE_OVERLAP = 'var(--win-pile-overlap)';
    private readonly SIDE_PILE_OVERLAP_RATIO = 0.44;

    constructor() {
    }

    ngOnInit(): void {
    }

    formatCurrency(value: number): string {
        return (value / 100).toFixed(2);
    }

    // One size for all three side piles: the largest that lets every one of them fit
    getSideCardWidth(): string {
        const winCount = Math.max(this.winCards?.length || 0, 1);
        const sideCount = Math.max(this.buryCards?.length || 0, this.marriageCards?.length || 0, 1);
        const winPileFit = `(100% + ${winCount - 1} * ${this.WIN_PILE_OVERLAP}) / ${winCount}`;
        const sidePileFit = `100% / ${sideCount - (sideCount - 1) * this.SIDE_PILE_OVERLAP_RATIO}`;
        return `min(var(--side-card-max), ${winPileFit}, ${sidePileFit})`;
    }

    getSideCardOverlap(): string {
        return `calc(${this.getSideCardWidth()} * ${this.SIDE_PILE_OVERLAP_RATIO})`;
    }

    getWinPileTitle(): string {
        return `Win Pile: ${this.playerPoints} ${this.playerPoints === 1 ? 'Point' : 'Points'}`;
    }

    forwardCardSelected(card: Card): void {
        this.cardSelected.emit(card);
    }
}
