import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TurnInfoComponent } from './turn-info.component';

describe('TurnInfoComponent', () => {
  let fixture: ComponentFixture<TurnInfoComponent>;

  const showResult = (hundredCalled: boolean, betResults: { text: string; won: boolean }[]) => {
    fixture = TestBed.createComponent(TurnInfoComponent);
    Object.assign(fixture.componentInstance, {
      winMessage: 'Player 1 lost: 5 to 4', payoutTotal: 'Player 1 pays Players 2 and 3 24¢ each',
      callerWonRound: false, hundredCalled, betResults
    });
    fixture.detectChanges();
    return Array.from(fixture.nativeElement.querySelectorAll('.round-result > div')).map((line: HTMLElement) => line.textContent.trim());
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [TurnInfoComponent] }).compileComponents();
  });

  it('should leave out the result line after a called 100, since its own line carries the score', () => {
    expect(showResult(true, [{ text: '-24¢ Player 1 lost the Called 100: 5 to 4', won: false }]))
      .toEqual(['-24¢ Player 1 lost the Called 100: 5 to 4', 'Player 1 pays Players 2 and 3 24¢ each']);
  });

  it('should keep the result line in a normal game', () => {
    expect(showResult(false, [])).toEqual(['Player 1 lost: 5 to 4', 'Player 1 pays Players 2 and 3 24¢ each']);
  });
});
