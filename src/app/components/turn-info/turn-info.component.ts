import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BetResult } from '../../points.service';

@Component({
    selector: 'app-turn-info',
    templateUrl: './turn-info.component.html',
    styleUrls: ['./turn-info.component.less']
})
export class TurnInfoComponent implements OnInit {

    @Input() winMessage: string;
    @Input() illegalMoveMessage: string;
    @Input() trump: string;
    @Input() activePlayer: number;
    @Input() pcExplanation: string;
    // vs PC Slow: show a Next button so you can read the explanation before the game moves on
    @Input() showNext: boolean;
    @Output() next = new EventEmitter<void>();
    // shown right under the round's result
    @Input() canPlayAgain: boolean;
    // the caller is bidding; a person does it in the bid pop-up, so this only says a PC is deciding
    @Input() announcing: boolean;
    @Input() canAnnounce: boolean;
    // a PC is deciding whether to raise the stakes; a person does it in the raise pop-up
    @Input() raising: boolean;
    // a PC is deciding whether to take over with No Tricks or All Tricks
    @Input() takingOver: boolean;
    // who pays whom in all, then the caller's result on each bet
    @Input() payoutTotal: string;
    @Input() betResults: BetResult[] = [];
    // the whole result is red when you, Player 1, lose money on the round, and green otherwise
    @Input() player1LosesMoney: boolean;
    // the contract has a line of its own among the bets (the 100, or a raised contract), which says how it went,
    // so the result line above it is left out
    @Input() contractHasLine: boolean;
    @Output() playAgain = new EventEmitter<void>();

    @Input() pickingTrump: boolean;
    @Input() buryingCards: boolean;

    constructor() {
    }

    ngOnInit(): void {
    }
}
