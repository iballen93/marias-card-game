import {
  completesMarriage, getLegalCards, isHigherRank, isPointCard, isTrump, marriagePoints, sevenOnLastTrick, trickWinnerIndex, validateBury
} from './rules';

// Hearts are trump in every test; the move rules themselves are covered in validation.service.spec.ts
describe('rules', () => {
  it('should rank A, 10, K, Q, J, 9, 8, 7 from highest to lowest', () => {
    const order = ['AS', '0S', 'KS', 'QS', 'JS', '9S', '8S', '7S'];
    order.slice(1).forEach((card, index) => expect(isHigherRank(order[index], card)).toBeTrue());
  });

  it('should know trump, point cards and what can be buried', () => {
    expect(isTrump('7H', 'HEARTS')).toBeTrue();
    expect(isTrump('7S', 'HEARTS')).toBeFalse();
    expect(isTrump('7H', '')).toBeFalse();
    expect([isPointCard('AS'), isPointCard('0S'), isPointCard('KS')]).toEqual([true, true, false]);
    expect(validateBury('KS')).toBe('');
    expect(validateBury('0S')).not.toBe('');
  });

  describe('trick winner', () => {
    it('should go to the highest card of the lead suit', () => {
      expect(trickWinnerIndex(['9S', 'KS', '0S'], 'HEARTS')).toBe(2);
      expect(trickWinnerIndex(['KS', '9S', 'AD'], 'HEARTS')).toBe(0);
    });

    it('should go to trump over the lead suit', () => {
      expect(trickWinnerIndex(['AS', '7H', 'KS'], 'HEARTS')).toBe(1);
    });

    it('should go to the highest trump when two are played', () => {
      expect(trickWinnerIndex(['AS', '7H', '9H'], 'HEARTS')).toBe(2);
      expect(trickWinnerIndex(['AS', 'AH', '9H'], 'HEARTS')).toBe(1);
    });

    it('should go to the highest trump when trump is led', () => {
      expect(trickWinnerIndex(['9H', 'AS', 'KH'], 'HEARTS')).toBe(2);
    });
  });

  it('should score a marriage only while holding the other card', () => {
    expect(completesMarriage('KS', ['QS', '7D'])).toBeTrue();
    expect(completesMarriage('QS', ['KS'])).toBeTrue();
    expect(completesMarriage('KS', ['QD'])).toBeFalse();
    expect(completesMarriage('JS', ['QS', 'KS'])).toBeFalse();
    expect([marriagePoints('KS', 'HEARTS'), marriagePoints('KH', 'HEARTS')]).toEqual([2, 4]);
  });

  it('should treat an empty table as leading', () => {
    expect(getLegalCards(undefined, ['7S', 'AH'], 'HEARTS')).toEqual(['7S', 'AH']);
  });

  describe('the 7 of trump on the last trick', () => {
    // Player 1 is the caller in every test
    const lastTrick = (winner: number, ...cards: string[]) => ({
      plays: cards.map((card, index) => ({ player: index + 1, card })), winner
    });

    it('should be won when it takes the last trick, worth 2 cents', () => {
      expect(sevenOnLastTrick(lastTrick(1, '7H', 'AS', 'KS'), 'HEARTS', 1, false))
        .toEqual({ card: '7H', player: 1, won: true, called: false, playedLast: true, cents: 2 });
    });

    it('should be lost when it is played in the last trick and beaten', () => {
      expect(sevenOnLastTrick(lastTrick(2, '7H', '8H', 'KS'), 'HEARTS', 1, false).won).toBeFalse();
    });

    it('should double when called, and double again in spades', () => {
      expect(sevenOnLastTrick(lastTrick(1, '7H', 'AD', 'KD'), 'HEARTS', 1, true).cents).toBe(4);
      expect(sevenOnLastTrick(lastTrick(1, '7S', 'AD', 'KD'), 'SPADES', 1, false).cents).toBe(4);
      expect(sevenOnLastTrick(lastTrick(1, '7S', 'AD', 'KD'), 'SPADES', 1, true).cents).toBe(8);
    });

    it('should count a defender\'s 7 as silent, since only the caller can call it', () => {
      const seven = sevenOnLastTrick(lastTrick(2, 'AD', '7H', 'KD'), 'HEARTS', 1, true);
      expect(seven.player).toBe(2);
      expect(seven.called).toBeFalse();
      expect(seven.cents).toBe(2);
    });

    it('should score nothing for a silent 7 that is not in the last trick', () => {
      expect(sevenOnLastTrick(lastTrick(1, 'AH', '8H', 'KS'), 'HEARTS', 1, false)).toBeUndefined();
    });

    it('should count a called 7 that was played before the last trick as lost', () => {
      expect(sevenOnLastTrick(lastTrick(1, 'AH', '8H', 'KS'), 'SPADES', 1, true))
        .toEqual({ card: '7S', player: 1, won: false, called: true, playedLast: false, cents: 8 });
    });
  });
});
