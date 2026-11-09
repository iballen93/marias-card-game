import { Component, Input, OnInit } from '@angular/core';

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

    @Input() pickingTrump: boolean;
    @Input() buryingCards: boolean;
    @Input() canPlayAgain: boolean;

    constructor() {
    }

    ngOnInit(): void {
    }
}
