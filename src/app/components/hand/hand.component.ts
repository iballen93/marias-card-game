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
    @Input() isCaller = false;
    @Input() isActive = false;
    @Input() playerCards: Card[];
    @Input() marriageCards: Card[];
    @Input() buryCards: Card[];
    @Input() winCards: Card[];
    // on this player's turn, the cards they can legally play
    @Input() liftedCards: string[] = [];

    @Output() cardSelected = new EventEmitter<Card>();

    private readonly SIDE_PILE_OVERLAP_RATIO = 0.44;
    // How much of each win pile card shows: the least still shows its number and suit
    private readonly WIN_PILE_MAX_PEEK = 0.34;
    private readonly WIN_PILE_MIN_PEEK = 0.2;
    private readonly PILE_ROOM = '(var(--seat-width) - 8px)';
    private readonly SIDE_LABEL_WIDTH = 'var(--pile-title-size) * 5';
    private readonly WIN_LABEL_WIDTH = 'var(--pile-title-size) * 8.5';

    constructor() {
    }

    ngOnInit(): void {
    }

    formatCurrency(value: number): string {
        return (value / 100).toFixed(2);
    }

    // One size for all three side piles: the largest that lets every one of them fit
    getSideCardWidth(): string {
        const winSpan = 1 + (this.getWinCount() - 1) * this.WIN_PILE_MIN_PEEK;
        const sideSpan = this.getPileSpan(this.buryCards) + this.getPileSpan(this.marriageCards);
        const labelCount = [this.isBuryShown(), this.isMarriageShown()].filter(isShown => isShown).length;
        const allPilesFit = `${this.PILE_ROOM} / ${winSpan + sideSpan}`;
        const labelsFit = `(${this.PILE_ROOM} - ${labelCount} * ${this.SIDE_LABEL_WIDTH}) / ${winSpan}`;
        return `min(var(--side-card-max), ${allPilesFit}, ${labelsFit})`;
    }

    getSideCardOverlap(): string {
        return `calc(var(--side-card) * ${this.SIDE_PILE_OVERLAP_RATIO})`;
    }

    getBuryPileWidth(): string {
        return this.isBuryShown() ? this.getSidePileWidth(this.buryCards) : '0px';
    }

    getMarriagePileWidth(): string {
        return this.isMarriageShown() ? this.getSidePileWidth(this.marriageCards) : '0px';
    }

    // As the win pile grows it takes the room left by the other two, then overlaps more, then shrinks
    getWinCardPeek(): string {
        const gapCount = this.getWinCount() - 1;
        if (gapCount === 0) {
            return '0px';
        }
        const spareRoom = `${this.PILE_ROOM} - var(--bury-width) - var(--marriage-width) - var(--side-card)`;
        return `min(var(--side-card) * ${this.WIN_PILE_MAX_PEEK}, (${spareRoom}) / ${gapCount})`;
    }

    getWinPileWidth(): string {
        const cardsWidth = `var(--side-card) + ${this.getWinCount() - 1} * var(--win-peek)`;
        return `max(${this.WIN_LABEL_WIDTH}, ${cardsWidth})`;
    }

    getWinCardOverlap(): string {
        return 'calc(var(--side-card) - var(--win-peek))';
    }

    private getWinCount(): number {
        return Math.max(this.winCards?.length || 0, 1);
    }

    private getPileSpan(cards: Card[]): number {
        const count = cards?.length || 0;
        return count === 0 ? 0 : 1 + (count - 1) * (1 - this.SIDE_PILE_OVERLAP_RATIO);
    }

    private getSidePileWidth(cards: Card[]): string {
        return `max(${this.SIDE_LABEL_WIDTH}, var(--side-card) * ${this.getPileSpan(cards)})`;
    }

    private isBuryShown(): boolean {
        return this.isCaller || !!this.buryCards?.length;
    }

    private isMarriageShown(): boolean {
        return !!this.marriageCards?.length;
    }

    getWinPileTitle(): string {
        return `Win Pile: ${this.playerPoints} ${this.playerPoints === 1 ? 'Point' : 'Points'}`;
    }

    forwardCardSelected(card: Card): void {
        this.cardSelected.emit(card);
    }
}
