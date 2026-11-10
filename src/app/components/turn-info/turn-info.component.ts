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
    @Input() bidMultiplier: number;
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
    // who pays whom in all, then the caller's result on each bet
    @Input() payoutTotal: string;
    @Input() betResults: BetResult[] = [];
    @Input() callerWonRound: boolean;
    // red when the caller owes money in all, green when they collect
    @Input() callerPays: boolean;
    // the 100's own line says how it went, since "won: 5 to 4" could read as a win when the 100 was lost
    @Input() hundredCalled: boolean;
    @Output() playAgain = new EventEmitter<void>();

    @Input() pickingTrump: boolean;
    @Input() buryingCards: boolean;

    constructor() {
    }

    ngOnInit(): void {
    }
}
