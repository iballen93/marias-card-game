import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Contract } from '../../rules';
import { TakeOverDialogComponent } from './take-over-dialog.component';

describe('TakeOverDialogComponent', () => {
  let fixture: ComponentFixture<TakeOverDialogComponent>;
  let answers: (Contract | undefined)[];
  const element = () => fixture.nativeElement as HTMLElement;
  const button = () => element().querySelector('.take-over-button') as HTMLButtonElement;
  const toggle = (contract: string) => {
    (element().querySelector('.take-over-' + contract) as HTMLInputElement).click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [TakeOverDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(TakeOverDialogComponent);
    Object.assign(fixture.componentInstance, {
      player: 3,
      bidSummary: 'Player 2 bid No Tricks',
      options: [
        { contract: 'all-tricks', name: 'All Tricks', cents: 10 },
        { contract: 'no-tricks-show', name: 'No Tricks Show', cents: 12 }
      ]
    });
    fixture.componentInstance.ngOnChanges();
    answers = [];
    fixture.componentInstance.takeOver.subscribe((contract: Contract | undefined) => answers.push(contract));
    fixture.detectChanges();
  });

  it('should ask the player, say what is bid, and list each higher contract with its price', () => {
    expect(element().querySelector('h2').textContent).toBe('Player 3: take over?');
    expect(element().querySelector('.bid-summary').textContent).toBe('Player 2 bid No Tricks');
    const texts = (selector: string) => Array.from(element().querySelectorAll(selector)).map(text => text.textContent.trim());
    expect(texts('.toggle-name')).toEqual(['All Tricks', 'No Tricks Show']);
    expect(texts('.toggle-cost')).toEqual(['10¢ per player', '12¢ per player']);
  });

  it('should pass with nothing chosen', () => {
    expect(button().textContent).toBe('Pass');
    button().click();
    expect(answers).toEqual([undefined]);
  });

  it('should take over with one contract at most, switching any other off', () => {
    toggle('all-tricks');
    toggle('no-tricks-show');
    expect((element().querySelector('.take-over-all-tricks') as HTMLInputElement).checked).toBeFalse();
    expect(button().textContent).toBe('Take Over');
    button().click();
    expect(answers).toEqual(['no-tricks-show']);
  });
});
