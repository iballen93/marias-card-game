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
    expect(service.calculateEarnings(piles, 1, 1, 'HEARTS').winMessage).toBe('Player 1 won: 4 to 1');
  });

  it('should show both team scores when the opponents win', () => {
    const piles = new Map([['player1Win', cards('AS')], ['player2Win', cards('AD')], ['player3Win', cards('0D')]]);
    expect(service.calculateEarnings(piles, 1, 3, 'HEARTS').winMessage).toBe('Players 2 and 3 won: 3 to 1');
  });

  it('should say whether a called 100 was made or missed, and pay it instead of the Game', () => {
    const made = new Map([['player1Win', cards('AS', '0S', 'AD', '0D', 'AC', '0C', 'AH', '0H')], ['player1Marriage', cards('KS')]]);
    const result = service.calculateEarnings(made, 1, 1, 'HEARTS', true);
    expect(result.winMessage).toBe('Player 1 won: 11 to 0');
    expect([1, 2, 3].map(player => result.earnings.get('player' + player))).toEqual([32, -16, -16]);
    const missed = new Map([['player1Win', cards('AS', '0S')], ['player2Win', cards('AD')]]);
    expect(service.calculateEarnings(missed, 1, 1, 'HEARTS', true).winMessage).toBe('Player 1 lost: 3 to 1');
  });

  it('should say whether the caller won or lost the Game or the 100', () => {
    const won = new Map([['player1Win', cards('AS', '0S')], ['player2Win', cards('AD')]]);
    expect(service.calculateEarnings(won, 1, 1, 'HEARTS').betResult).toEqual({ text: 'Player 1 won the Game', won: true });
    expect(service.calculateEarnings(won, 1, 1, 'SPADES', true).betResult).toEqual({ text: 'Player 1 lost the Called 100', won: false });
  });

  it('should say who pays whom', () => {
    expect(service.describePayment(4, 2)).toBe('Players 1 and 3 each pay Player 2 4¢');
    expect(service.describePayment(-8, 1)).toBe('Player 1 pays Players 2 and 3 8¢ each');
    expect(service.describePayment(0, 2)).toBe('Nobody pays anything');
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

    it('should say whether the caller won or lost the 7, even when a defender played it', () => {
      expect(service.calculateSevenEarnings(seven(1, true, true, 4), 1).betResult.text).toBe('Player 1 won the Called 7♥');
      expect(service.calculateSevenEarnings(seven(2, false), 1).betResult.text).toBe('Player 1 won the Silent 7♥');
      expect(service.calculateSevenEarnings(seven(3, true), 1).betResult.text).toBe('Player 1 lost the Silent 7♥');
      expect(service.calculateSevenEarnings(seven(1, false, true, 4, false), 1).betResult.text).toBe('Player 1 lost the Called 7♥');
    });
  });
});
