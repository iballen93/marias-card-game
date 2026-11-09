import { completesMarriage, getLegalCards, isHigherRank, isPointCard, isTrump, marriagePoints, trickWinnerIndex, validateBury } from './rules';

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
});
