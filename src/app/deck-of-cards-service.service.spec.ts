import { TestBed } from '@angular/core/testing';

import { DeckOfCardsServiceService } from './deck-of-cards-service.service';

describe('DeckOfCardsServiceService', () => {
  let service: DeckOfCardsServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckOfCardsServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
