import {Component, Input, OnInit} from '@angular/core';

export interface Points {
    totalTricks: string;
    lastTrick: boolean;
    theSeven: boolean;
}

export interface Earnings {
    centsGained: number;
    centsLost: number;
}

@Component({
    selector: 'app-points',
    templateUrl: './points.component.html',
    styleUrls: ['./points.component.less']
})
export class PointsComponent implements OnInit {
    @Input() points: Points;

    constructor() {
    }

    ngOnInit(): void {
    }

}


