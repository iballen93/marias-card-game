import { TestBed } from '@angular/core/testing';

import { Card } from './components/card-pile/card-pile.component';
import { ComputerPlayerService } from './computer-player.service';

describe('ComputerPlayerService', () => {
  let service: ComputerPlayerService;

  const cards = (...codes: string[]): Card[] => codes.map(code => ({ code, image: '', suit: '' }));

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComputerPlayerService);
  });

  it('should allow the whole hand when leading the first hand of the round', () => {
    expect(service.getLegalCards(undefined, cards('7S', 'AH'), 'HEARTS')).toEqual(['7S', 'AH']);
  });

  it('should allow the whole hand when leading', () => {
    expect(service.getLegalCards([], cards('7S', 'AH'), 'HEARTS')).toEqual(['7S', 'AH']);
  });

  it('should only allow cards that go over the lead card', () => {
    expect(service.getLegalCards(cards('9S'), cards('7S', 'KS', 'AS', 'AH'), 'HEARTS')).toEqual(['KS', 'AS']);
  });

  it('should allow every card in suit when unable to go over', () => {
    expect(service.getLegalCards(cards('AS'), cards('7S', 'KS', 'AH'), 'HEARTS')).toEqual(['7S', 'KS']);
  });

  it('should only allow trump when unable to follow suit', () => {
    expect(service.getLegalCards(cards('AS'), cards('7D', '7H', 'KH'), 'HEARTS')).toEqual(['7H', 'KH']);
  });

  it('should allow every card when unable to follow suit or trump', () => {
    expect(service.getLegalCards(cards('AS'), cards('7D', '7C'), 'HEARTS')).toEqual(['7D', '7C']);
  });

  it('should only allow higher trump when the second card trumped', () => {
    expect(service.getLegalCards(cards('9S', '9H'), cards('7H', 'KH', '7D'), 'HEARTS')).toEqual(['KH']);
  });
});
