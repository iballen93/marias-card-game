import {TestBed} from '@angular/core/testing';

import {DeckService} from './deck.service';

describe('DeckService', () => {
  let service: DeckService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckService);
  });

  it('should create 32 unique cards', () => {
    const codes = service.createShuffledDeck().map(card => card.code);
    expect(codes.length).toBe(32);
    expect(new Set(codes).size).toBe(32);
  });

  it('should only contain ranks 7 and up', () => {
    const ranks = new Set(service.createShuffledDeck().map(card => card.code.charAt(0)));
    expect([...ranks].sort()).toEqual(['0', '7', '8', '9', 'A', 'J', 'K', 'Q']);
  });

  it('should give each card its suit name and bundled image', () => {
    const aceOfSpades = service.createShuffledDeck().find(card => card.code === 'AS');
    expect(aceOfSpades.suit).toBe('SPADES');
    expect(aceOfSpades.image).toBe('assets/cards/AS.png');
  });

  it('should shuffle', () => {
    const first = service.createShuffledDeck().map(card => card.code).join();
    const second = service.createShuffledDeck().map(card => card.code).join();
    expect(first).not.toEqual(second);
  });
});
