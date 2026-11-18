import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RaiseBet } from '../../raising';
import { RaiseDialogComponent } from './raise-dialog.component';

describe('RaiseDialogComponent', () => {
  let fixture: ComponentFixture<RaiseDialogComponent>;
  let raised: RaiseBet[];
  const element = () => fixture.nativeElement as HTMLElement;
  const button = () => element().querySelector('.raise-button') as HTMLButtonElement;
  const toggle = (bet: string) => {
    const input = element().querySelector('.raise-' + bet) as HTMLInputElement;
    input.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [RaiseDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(RaiseDialogComponent);
    Object.assign(fixture.componentInstance, {
      player: 2,
      bidSummary: 'Player 1 bid the Game and the Called 7♥',
      options: [
        { bet: 'game', raiseName: 'Kontra', label: 'the Game', cents: 4 },
        { bet: 'seven', raiseName: 'Kontra', label: 'the Called 7♥', cents: 8 }
      ]
    });
    fixture.componentInstance.ngOnChanges();
    raised = undefined;
    fixture.componentInstance.raise.subscribe((bets: RaiseBet[]) => raised = bets);
    fixture.detectChanges();
  });

  it('should ask the player, say what the caller bid, and list each bet with what the raise makes it worth', () => {
    expect(element().querySelector('h2').textContent).toBe('Player 2: raise the stakes?');
    expect(element().querySelector('.bid-summary').textContent).toBe('Player 1 bid the Game and the Called 7♥');
    const names = Array.from(element().querySelectorAll('.toggle-name')).map(name => name.textContent);
    expect(names).toEqual(['Kontra on the Game', 'Kontra on the Called 7♥']);
    const costs = Array.from(element().querySelectorAll('.toggle-cost')).map(cost => cost.textContent);
    expect(costs).toEqual(['4¢ per player', '8¢ per player']);
  });

  it('should pass everything when no switch is on', () => {
    expect(button().textContent).toBe('Pass');
    button().click();
    expect(raised).toEqual([]);
  });

  it('should raise the bets switched on, and turn back to Pass when they are switched off', () => {
    toggle('seven');
    expect(button().textContent).toBe('Raise');
    button().click();
    expect(raised).toEqual(['seven']);
    toggle('seven');
    expect(button().textContent).toBe('Pass');
  });

  it('should start a new player\'s turn with every switch off', () => {
    toggle('game');
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    expect(button().textContent).toBe('Pass');
  });
});
