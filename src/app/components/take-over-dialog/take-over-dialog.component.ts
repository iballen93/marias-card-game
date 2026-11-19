import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Contract } from '../../rules';
import { formatCents } from '../../money';

// One contract the player may take over with
export interface TakeOverOption {
    contract: Contract;
    // as players say it, such as Open No Tricks
    name: string;
    // what it's worth from each player, won or lost
    cents: number;
}

// Asks one player whether to take over the bid with a higher contract. At most one can be chosen; none passes.
@Component({
    selector: 'app-take-over-dialog',
    templateUrl: './take-over-dialog.component.html',
    styleUrls: ['./take-over-dialog.component.less']
})
export class TakeOverDialogComponent implements OnChanges {
    readonly formatCents = formatCents;


    @Input() player: number;
    // what is being played now, such as "Player 1 bid the Game"
    @Input() bidSummary: string;
    @Input() options: TakeOverOption[] = [];
    @Output() takeOver = new EventEmitter<Contract | undefined>();

    chosen: Contract | undefined;

    constructor(private changeDetector: ChangeDetectorRef) {
    }

    // a new turn starts with nothing chosen
    ngOnChanges(): void {
        this.chosen = undefined;
    }

    // switching one on switches any other off
    setChosen(contract: Contract, on: boolean): void {
        this.chosen = on ? contract : this.chosen === contract ? undefined : this.chosen;
        this.changeDetector.detectChanges();
    }

    submit(): void {
        this.takeOver.emit(this.chosen);
    }
}
