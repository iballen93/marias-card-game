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
    @Input() legalCards: string[];
    @Input() pcExplanation: string;
    // vs PC Slow: show a Next button so you can read the explanation before the game moves on
    @Input() showNext: boolean;
    @Output() next = new EventEmitter<void>();

    @Input() pickingTrump: boolean;
    @Input() buryingCards: boolean;
    @Input() canPlayAgain: boolean;

    constructor() {
    }

    ngOnInit(): void {
    }
}
