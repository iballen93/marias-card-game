import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { RaiseBet } from '../../raising';

// One bet the player may raise now
export interface RaiseOption {
    bet: RaiseBet;
    // the raise they would say, such as Kontra
    raiseName: string;
    // the bet as players say it, such as the Called 7♥
    label: string;
    // what the bet is worth from each player once raised
    cents: number;
}

// Asks one player which bets to raise; everything left off is passed
@Component({
    selector: 'app-raise-dialog',
    templateUrl: './raise-dialog.component.html',
    styleUrls: ['./raise-dialog.component.less']
})
export class RaiseDialogComponent implements OnChanges {

    @Input() player: number;
    // what the caller bid and how far it has been raised, such as "Player 1 bid the Game (Kontra)"
    @Input() bidSummary: string;
    @Input() options: RaiseOption[] = [];
    @Output() raise = new EventEmitter<RaiseBet[]>();

    chosen: RaiseBet[] = [];

    constructor(private changeDetector: ChangeDetectorRef) {
    }

    // a new turn starts with every switch off
    ngOnChanges(): void {
        this.chosen = [];
    }

    isChosen(bet: RaiseBet): boolean {
        return this.chosen.includes(bet);
    }

    setChosen(bet: RaiseBet, on: boolean): void {
        this.chosen = on ? [...this.chosen.filter(other => other !== bet), bet] : this.chosen.filter(other => other !== bet);
        this.changeDetector.detectChanges();
    }

    submit(): void {
        this.raise.emit(this.options.map(option => option.bet).filter(bet => this.isChosen(bet)));
    }
}
