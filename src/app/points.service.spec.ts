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
    expect(service.calculateEarnings(piles, 1, 1, 'HEARTS').winMessage).toBe('Player 1 Wins the Round 4 to 1!');
  });

  it('should show both team scores when the opponents win', () => {
    const piles = new Map([['player1Win', cards('AS')], ['player2Win', cards('AD')], ['player3Win', cards('0D')]]);
    expect(service.calculateEarnings(piles, 1, 3, 'HEARTS').winMessage).toBe('Players 2 and 3 Win the Round 3 to 1!');
  });

  it('should say whether a called 100 was made or missed, and pay it instead of the Game', () => {
    const made = new Map([['player1Win', cards('AS', '0S', 'AD', '0D', 'AC', '0C', 'AH', '0H')], ['player1Marriage', cards('KS')]]);
    const result = service.calculateEarnings(made, 1, 1, 'HEARTS', true);
    expect(result.winMessage).toBe('Player 1 Makes the Called 100, 11 to 0!');
    expect([1, 2, 3].map(player => result.earnings.get('player' + player))).toEqual([32, -16, -16]);
    const missed = new Map([['player1Win', cards('AS', '0S')], ['player2Win', cards('AD')]]);
    expect(service.calculateEarnings(missed, 1, 1, 'HEARTS', true).winMessage).toBe('Player 1 Misses the Called 100, 3 to 1!');
  });

  it('should only give the last trick point to the player who won it', () => {
    expect(service.calculatePlayerPoints(new Map(), 1, 1, 'HEARTS')).toBe(1);
    expect(service.calculatePlayerPoints(new Map(), 2, 1, 'HEARTS')).toBe(0);
  });

  describe('paying the 7 of trump', () => {
    const seven = (player: number, won: boolean, called = false, cents = 2, playedLast = true) =>
      ({ card: '7H', player, won, called, playedLast, cents });
    const paid = (result: { earnings: Map<string, number> }) => [1, 2, 3].map(player => result.earnings.get('player' + player));

    it('should have each defender pay the caller when the caller\'s 7 wins, and the reverse when it loses', () => {
      expect(paid(service.calculateSevenEarnings(seven(1, true, true, 4), 1))).toEqual([8, -4, -4]);
      expect(paid(service.calculateSevenEarnings(seven(1, false, true, 4), 1))).toEqual([-8, 4, 4]);
    });

    it('should pay the defenders when a defender\'s 7 wins, and the caller when it loses', () => {
      expect(paid(service.calculateSevenEarnings(seven(3, true), 1))).toEqual([-4, 2, 2]);
      expect(paid(service.calculateSevenEarnings(seven(3, false), 1))).toEqual([4, -2, -2]);
    });

    it('should say what the 7 did and who pays', () => {
      expect(service.calculateSevenEarnings(seven(1, true, true, 4), 1).message)
        .toBe('Player 1\'s called 7♥ won the last trick: Players 2 and 3 each pay Player 1 4¢');
      expect(service.calculateSevenEarnings(seven(2, false), 1).message)
        .toBe('Player 2\'s 7♥ lost the last trick: Players 2 and 3 each pay Player 1 2¢');
      expect(service.calculateSevenEarnings(seven(1, false, true, 4, false), 1).message)
        .toBe('Player 1\'s called 7♥ wasn\'t played in the last trick: Player 1 pays Players 2 and 3 4¢ each');
    });
  });
});
