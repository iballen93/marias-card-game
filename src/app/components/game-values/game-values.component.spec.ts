import { TestBed } from '@angular/core/testing';
import { GameValuesComponent } from './game-values.component';

describe('GameValuesComponent', () => {
  const show = (values: Partial<GameValuesComponent>) => {
    const fixture = TestBed.createComponent(GameValuesComponent);
    Object.assign(fixture.componentInstance, values);
    fixture.detectChanges();
    return Array.from(fixture.nativeElement.querySelectorAll('.value')).map((value: HTMLElement) => value.textContent.trim());
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [GameValuesComponent] }).compileComponents();
  });

  it('should mark spades as doubled, and show only the trump before anything is called or raised', () => {
    expect(show({ trump: 'SPADES' })).toEqual(['Trump: SPADES (doubled)']);
    expect(show({ trump: 'HEARTS' })).toEqual(['Trump: HEARTS']);
  });

  it('should show each bet with the raise it is on', () => {
    expect(show({ trump: 'HEARTS', gameRaise: 'Re', sevenCalled: true, sevenRaise: 'Kontra' }))
      .toEqual(['Trump: HEARTS', 'Game: Re', '7 of Trump: Called, Kontra']);
    expect(show({ trump: 'HEARTS', hundredCalled: true, gameRaise: 'Kontra' })).toEqual(['Trump: HEARTS', '100: Called, Kontra']);
  });
});
