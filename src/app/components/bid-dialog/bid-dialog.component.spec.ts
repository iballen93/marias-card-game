import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BidDialogComponent } from './bid-dialog.component';

describe('BidDialogComponent', () => {
  let fixture: ComponentFixture<BidDialogComponent>;
  let component: BidDialogComponent;
  let bids: { seven: boolean; hundred: boolean }[];

  const element = (): HTMLElement => fixture.nativeElement;
  const toggle = (selector: string) => {
    const input = element().querySelector(selector) as HTMLInputElement;
    input.click();
    fixture.detectChanges();
  };
  const bid = () => (element().querySelector('.bid-button') as HTMLButtonElement).click();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [BidDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(BidDialogComponent);
    component = fixture.componentInstance;
    component.trump = 'HEARTS';
    component.canCallSeven = true;
    component.sevenName = '7♦';
    bids = [];
    component.bid.subscribe(choice => bids.push(choice));
    fixture.detectChanges();
  });

  it('should ask what to bid on, the 7 first and the 100 second, with both switches off and their costs shown', () => {
    expect(element().querySelector('h2').textContent).toBe('What would you like to bid on?');
    expect(Array.from(element().querySelectorAll('.toggle-name')).map(name => name.textContent)).toEqual(['Call the 7♦', 'Call the 100']);
    expect((element().querySelector('.hundred-toggle') as HTMLInputElement).checked).toBeFalse();
    expect((element().querySelector('.seven-toggle') as HTMLInputElement).checked).toBeFalse();
    expect(element().querySelector('.seven-cost').textContent).toBe('4¢ per player');
    expect(element().querySelector('.hundred-cost').textContent).toBe('8¢ per player');
  });

  it('should double both costs in spades', () => {
    component.trump = 'SPADES';
    fixture.detectChanges();
    expect(element().querySelector('.seven-cost').textContent).toBe('8¢ per player (doubled for spades)');
    expect(element().querySelector('.hundred-cost').textContent).toBe('16¢ per player (doubled for spades)');
  });

  it('should bid on the Game alone when nothing is switched on', () => {
    bid();
    expect(bids).toEqual([{ seven: false, hundred: false }]);
  });

  it('should bid on the 100 and the 7 once both are switched on', () => {
    toggle('.hundred-toggle');
    toggle('.seven-toggle');
    bid();
    expect(bids).toEqual([{ seven: true, hundred: true }]);
  });

  it('should take a switch back off when it is clicked again', () => {
    toggle('.hundred-toggle');
    toggle('.hundred-toggle');
    bid();
    expect(bids).toEqual([{ seven: false, hundred: false }]);
  });

  it('should grey out the 7 switch for a caller without the 7 of trump, so it bids without it', () => {
    component.canCallSeven = false;
    fixture.detectChanges();
    const seven = element().querySelector('.seven-toggle') as HTMLInputElement;
    expect(seven.disabled).toBeTrue();
    expect(seven.closest('.toggle').classList).toContain('unavailable');
    expect(seven.closest('.toggle').textContent).toContain('You don\'t hold the 7♦');
    toggle('.seven-toggle');
    bid();
    expect(bids).toEqual([{ seven: false, hundred: false }]);
  });
});
