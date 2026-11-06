import { TestBed } from '@angular/core/testing';

import { Card } from './components/card-pile/card-pile.component';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  const cards = (...codes: string[]): Card[] => codes.map(code => ({ code, image: '', suit: '' }));

  // Hearts are trump in every test
  const play = (table: string[], hand: string[], selected: string): string => {
    service.loadCards(cards(...table), cards(...hand), selected, 'HEARTS');
    return service.validateMove();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValidationService);
  });

  it('should allow any card to lead', () => {
    expect(play([], ['7S', 'AH'], '7S')).toBe('');
  });

  describe('card 2', () => {
    it('should have to go over the lead card', () => {
      expect(play(['9S'], ['KS', '7S'], '7S')).toBe(service.illegalMoves.MUST_OVERRIDE);
      expect(play(['9S'], ['KS', '7S'], 'KS')).toBe('');
    });

    it('should treat a 10 as higher than a king', () => {
      expect(play(['KS'], ['0S', '7S'], '7S')).toBe(service.illegalMoves.MUST_OVERRIDE);
      expect(play(['KS'], ['0S', '7S'], '0S')).toBe('');
    });

    it('should play under the lead card when unable to go over', () => {
      expect(play(['AS'], ['7S', 'KD'], '7S')).toBe('');
    });

    it('should have to follow suit', () => {
      expect(play(['AS'], ['7S', 'KD'], 'KD')).toBe(service.illegalMoves.MUST_FOLLOW_SUIT);
    });

    it('should have to play trump when unable to follow suit', () => {
      expect(play(['AS'], ['7H', 'KD'], 'KD')).toBe(service.illegalMoves.MUST_TRUMP);
      expect(play(['AS'], ['7H', 'KD'], '7H')).toBe('');
    });

    it('should play anything when unable to follow suit or trump', () => {
      expect(play(['AS'], ['AD', '7C'], 'AD')).toBe('');
    });
  });

  describe('card 3', () => {
    it('should have to go over the highest card in suit', () => {
      expect(play(['9S', 'KS'], ['QS', 'AS'], 'QS')).toBe(service.illegalMoves.MUST_OVERRIDE);
      expect(play(['9S', 'KS'], ['QS', 'AS'], 'AS')).toBe('');
    });

    it('should ignore an off suit second card when going over', () => {
      expect(play(['9S', 'AD'], ['8S', 'JS'], '8S')).toBe(service.illegalMoves.MUST_OVERRIDE);
    });

    it('should not have to go over when the second card trumped', () => {
      expect(play(['9S', '7H'], ['8S', 'JS'], '8S')).toBe('');
    });

    it('should still have to follow suit when the second card trumped', () => {
      expect(play(['9S', '7H'], ['8S', 'AH'], 'AH')).toBe(service.illegalMoves.MUST_FOLLOW_SUIT);
    });

    it('should have to go over a trump played second', () => {
      expect(play(['9S', '9H'], ['7H', 'KH'], '7H')).toBe(service.illegalMoves.MUST_OVER_TRUMP);
      expect(play(['9S', '9H'], ['7H', 'KH'], 'KH')).toBe('');
    });

    it('should still have to play trump when unable to go over the second card', () => {
      expect(play(['9S', 'AH'], ['7H', '7D'], '7H')).toBe('');
      expect(play(['9S', 'AH'], ['7H', '7D'], '7D')).toBe(service.illegalMoves.MUST_TRUMP);
    });

    it('should go over when trump was led', () => {
      expect(play(['9H', '7D'], ['KH', '7H'], '7H')).toBe(service.illegalMoves.MUST_OVERRIDE);
    });

    it('should play anything when unable to follow suit or trump', () => {
      expect(play(['9S', '7D'], ['AD', '7C'], 'AD')).toBe('');
    });
  });

  it('should not allow point cards to be buried', () => {
    expect(service.validateBuryCard('AS')).toBe(service.illegalMoves.BURY_POINTS);
    expect(service.validateBuryCard('0S')).toBe(service.illegalMoves.BURY_POINTS);
    expect(service.validateBuryCard('KS')).toBe('');
  });
});
