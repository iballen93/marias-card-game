import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { Contract, CONTRACT_CENTS, HUNDRED_CENTS, SEVEN_CENTS } from '../../rules';

// The caller's bid after burying: the Game, with the 7 of trump when they hold it and the 100 instead of the Game,
// or No Tricks or All Tricks, open or not. Shown over a dimmed screen. Everything starts on the plain Game each time,
// so Bid on its own plays just the Game.
export type ContractKind = 'game' | 'no-tricks' | 'all-tricks';
@Component({
    selector: 'app-bid-dialog',
    templateUrl: './bid-dialog.component.html',
    styleUrls: ['./bid-dialog.component.less']
})
export class BidDialogComponent {

    @Input() canCallSeven: boolean;
    @Input() sevenName: string;
    @Input() trump: string;
    @Output() bid = new EventEmitter<{ seven: boolean; hundred: boolean; contract: Contract }>();

    readonly kinds: { kind: ContractKind; name: string }[] = [
        { kind: 'game', name: 'The Game' }, { kind: 'no-tricks', name: 'No Tricks' }, { kind: 'all-tricks', name: 'All Tricks' }
    ];
    kind: ContractKind = 'game';
    // No Tricks and All Tricks played with the caller's cards face up
    open = false;
    seven = false;
    hundred = false;

    constructor(private changeDetector: ChangeDetectorRef) {
    }

    setKind(kind: ContractKind): void {
        this.kind = kind;
        this.changeDetector.detectChanges();
    }

    setOpen(on: boolean): void {
        this.open = on;
        this.changeDetector.detectChanges();
    }

    get contract(): Contract {
        return this.kind === 'game' ? 'game' : (this.kind + (this.open ? '-open' : '')) as Contract;
    }

    // what No Tricks or All Tricks is worth per player, won or lost; there's no trump, so spades doesn't double it
    getContractCost(): string {
        const contract = this.contract;
        return contract === 'game' ? '' : CONTRACT_CENTS[contract] + '¢ per player';
    }

    getContractNote(): string {
        return this.kind === 'no-tricks' ? 'Take no tricks at all. No trump, and the 10 ranks below the J.'
            : 'Take every trick. No trump, and the 10 ranks below the J.';
    }

    // redraw straight away, so the switch moves as soon as it's tapped
    setSeven(on: boolean): void {
        this.seven = on;
        this.changeDetector.detectChanges();
    }

    setHundred(on: boolean): void {
        this.hundred = on;
        this.changeDetector.detectChanges();
    }

    // what each bet is worth per player if switched on, won or lost: calling the 7 doubles it, and spades doubles everything
    getSevenCost(): string {
        return this.describeCost(SEVEN_CENTS * 2);
    }

    getHundredCost(): string {
        return this.describeCost(HUNDRED_CENTS);
    }

    submit(): void {
        const game = this.kind === 'game';
        this.bid.emit({ seven: game && this.seven && this.canCallSeven, hundred: game && this.hundred, contract: this.contract });
    }

    private describeCost(cents: number): string {
        const spades = this.trump === 'SPADES';
        return (spades ? cents * 2 : cents) + '¢ per player' + (spades ? ' (doubled for spades)' : '');
    }
}
