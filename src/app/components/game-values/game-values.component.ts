import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-game-values',
    templateUrl: './game-values.component.html',
    styleUrls: ['./game-values.component.less']
})
export class GameValuesComponent implements OnInit {

    @Input() trump: string;
    @Input() bidMultiplier: number;
    @Input() sevenCalled = false;
    @Input() hundredCalled = false;

    constructor() {
    }

    ngOnInit(): void {
    }
}
