import { Component, Input, OnInit } from '@angular/core';
import { Contract, contractName } from '../../rules';

@Component({
    selector: 'app-game-values',
    templateUrl: './game-values.component.html',
    styleUrls: ['./game-values.component.less']
})
export class GameValuesComponent implements OnInit {

    @Input() trump: string;
    @Input() contract: Contract = 'game';
    @Input() sevenCalled = false;
    @Input() hundredCalled = false;
    // the raise each bet is on, such as Kontra; '' before any
    @Input() gameRaise = '';
    @Input() sevenRaise = '';

    // No Tricks or All Tricks, as a Show or not
    getContractName(): string {
        return contractName(this.contract);
    }

    constructor() {
    }

    ngOnInit(): void {
    }
}
