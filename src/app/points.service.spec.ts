import { TestBed } from '@angular/core/testing';

import { Card } from './components/card-pile/card-pile.component';
import { PointsService } from './points.service';

// Hearts are trump in every test
describe('PointsService', () => {
  let service: PointsService;

  const cards = (...codes: string[]): Card[] => codes.map(code => ({ code, image: '', suit: '' }));

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PointsService);
  });

  it('should start a player on 0 points', () => {
    expect(service.calculatePlayerPoints(new Map(), 1, undefined, 'HEARTS')).toBe(0);
  });

  it('should count aces and 10s in the win pile', () => {
    const piles = new Map([['player1Win', cards('AS', '0D', 'KC')]]);
    expect(service.calculatePlayerPoints(piles, 1, undefined, 'HEARTS')).toBe(2);
  });

  it('should count 2 for a marriage and 4 for a trump marriage', () => {
    const piles = new Map([['player1Marriage', cards('KS', 'QH')]]);
    expect(service.calculatePlayerPoints(piles, 1, undefined, 'HEARTS')).toBe(6);
  });

  it('should show both team scores when the caller wins', () => {
    const piles = new Map([['player1Win', cards('AS', '0S', 'AD')], ['player2Win', cards('0D')]]);
    expect(service.calculateEarnings(piles, 1, 1, 1, 'HEARTS').winMessage).toBe('Player 1 Wins the Round 4 to 1!');
  });

  it('should show both team scores when the opponents win', () => {
    const piles = new Map([['player1Win', cards('AS')], ['player2Win', cards('AD')], ['player3Win', cards('0D')]]);
    expect(service.calculateEarnings(piles, 1, 3, 1, 'HEARTS').winMessage).toBe('Players 2 and 3 Win the Round 3 to 1!');
  });

  it('should only give the last trick point to the player who won it', () => {
    expect(service.calculatePlayerPoints(new Map(), 1, 1, 'HEARTS')).toBe(1);
    expect(service.calculatePlayerPoints(new Map(), 2, 1, 'HEARTS')).toBe(0);
  });
});
