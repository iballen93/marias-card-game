import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

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
    // the caller chooses the Game or the 100, and the 7 of trump too when holding it
    @Input() announcing: boolean;
    @Input() canAnnounce: boolean;
    @Input() canCallSeven: boolean;
    @Input() sevenName: string;
    @Output() announce = new EventEmitter<{ seven: boolean; hundred: boolean }>();
    @Input() sevenMessage: string;
    @Output() playAgain = new EventEmitter<void>();

    @Input() pickingTrump: boolean;
    @Input() buryingCards: boolean;

    constructor() {
    }

    ngOnInit(): void {
    }
}
