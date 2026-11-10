import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { HUNDRED_CENTS, SEVEN_CENTS } from '../../rules';

// The caller's bid after burying: the 7 of trump when they hold it, and the 100 instead of the Game.
// Shown over a dimmed screen. The switches start off each time, so Bid on its own plays just the Game.
@Component({
    selector: 'app-bid-dialog',
    templateUrl: './bid-dialog.component.html',
    styleUrls: ['./bid-dialog.component.less']
})
export class BidDialogComponent {

    @Input() canCallSeven: boolean;
    @Input() sevenName: string;
    @Input() trump: string;
    @Output() bid = new EventEmitter<{ seven: boolean; hundred: boolean }>();

    seven = false;
    hundred = false;

    constructor(private changeDetector: ChangeDetectorRef) {
    }

    // redraw straight away, so the cost line appears or goes with the switch
    setSeven(on: boolean): void {
        this.seven = on;
        this.changeDetector.detectChanges();
    }

    setHundred(on: boolean): void {
        this.hundred = on;
        this.changeDetector.detectChanges();
    }

    // what a switched-on bet is worth from each opponent, won or lost: calling the 7 doubles it, and spades doubles everything
    getSevenCost(): string {
        return this.describeCost(SEVEN_CENTS * 2);
    }

    getHundredCost(): string {
        return this.describeCost(HUNDRED_CENTS);
    }

    submit(): void {
        this.bid.emit({ seven: this.seven && this.canCallSeven, hundred: this.hundred });
    }

    private describeCost(cents: number): string {
        const spades = this.trump === 'SPADES';
        return (spades ? cents * 2 : cents) + '¢ from each opponent, won or lost' + (spades ? ' (doubled for spades)' : '');
    }
}
