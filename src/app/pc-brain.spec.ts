import { BrainView, cardName, chooseBury, choosePlay, chooseTrump } from './pc-brain';
import { getLegalCards, isPointCard, isTrump } from './rules';
import { seededRandom } from './regression/seeded-random';

// Hearts are trump unless a test says otherwise
describe('PC brain', () => {
  const view = (fields: Partial<BrainView>): BrainView => ({
    seat: 1, caller: 1, trump: 'HEARTS', hand: [], trick: [], bury: [], tricks: [], ...fields
  });

  it('should name cards the way players say them', () => {
    expect([cardName('0H'), cardName('AS'), cardName('7C')]).toEqual(['10♥', 'A♠', '7♣']);
  });

  describe('picking trump', () => {
    it('should pick the strongest suit', () => {
      const choice = chooseTrump(['AH', '0H', 'KH', 'QH', '7S', '8S', '9D']);
      expect(choice.card.charAt(1)).toBe('H');
      expect(choice.reason).toContain('marriage');
    });

    it('should only pick Spades when it is clearly the strongest, since Spades doubles the stakes', () => {
      expect(chooseTrump(['AS', '0S', 'KS', '7H', '8H', '9H', 'JD']).card.charAt(1)).toBe('S');
      expect(chooseTrump(['AS', '8S', '7S', 'AH', '8H', '7H', 'JD']).card.charAt(1)).toBe('H');
    });
  });

  describe('burying', () => {
    const hand = ['7D', 'AS', '0S', 'KS', 'QS', '9C', '8C', '7C', 'AH', '8H', 'JC', 'QC'];

    it('should bury a card that leaves it out of a suit', () => {
      const choice = chooseBury(hand, 'HEARTS');
      expect(choice.card).toBe('7D');
      expect(choice.reason).toContain('run out of Diamonds');
    });

    it('should never bury a point card, a trump or half of a marriage', () => {
      let left = hand.filter(card => card !== '7D');
      // a round buries 2; four in a row still leaves safe cards to choose from in this hand
      for (let i = 0; i < 4; i++) {
        const card = chooseBury(left, 'HEARTS').card;
        expect(isPointCard(card)).toBeFalse();
        expect(isTrump(card, 'HEARTS')).toBeFalse();
        expect(['KS', 'QS']).not.toContain(card);
        left = left.filter(other => other !== card);
      }
    });
  });

  describe('playing last', () => {
    it('should give a point to a partner who is winning', () => {
      // Player 2 called; Player 1 led the A♠ and is winning, so Player 3 gives them the 10♠
      const choice = choosePlay(view({ seat: 3, caller: 2, trick: ['AS', '7S'], hand: ['0S', '8S', '7D'] }));
      expect(choice.card).toBe('0S');
      expect(choice.reason).toContain('partner Player 1');
    });

    it('should win with a point card when it can, since nobody plays after it', () => {
      expect(choosePlay(view({ seat: 3, caller: 3, trick: ['9S', '8S'], hand: ['JS', 'AS', '7D'] })).card).toBe('AS');
    });

    it('should win with the cheapest card that wins', () => {
      expect(choosePlay(view({ seat: 3, caller: 3, trick: ['9S', '8S'], hand: ['QS', 'JS', '7D'] })).card).toBe('JS');
    });

    it('should throw its lowest card when it cannot win', () => {
      const choice = choosePlay(view({ seat: 3, caller: 3, trick: ['AS', '0S'], hand: ['KS', '7S', 'AD'] }));
      expect(choice.card).toBe('7S');
      expect(choice.reason).toContain('can\'t win');
    });
  });

  describe('playing second', () => {
    it('should give a point when its partner led the highest card left', () => {
      // Player 3 called; Player 1 led the A♠ and Player 2 follows
      expect(choosePlay(view({ seat: 2, caller: 3, trick: ['AS'], hand: ['0S', '7S', '8D'] })).card).toBe('0S');
    });

    it('should not give a point when the caller has shown it can trump the lead', () => {
      // earlier, Player 3 had no spades and played a trump
      const tricks = [{ plays: [{ player: 1, card: 'KS' }, { player: 2, card: 'QS' }, { player: 3, card: '7H' }] }];
      expect(choosePlay(view({ seat: 2, caller: 3, trick: ['AS'], hand: ['0S', '7S', '8D'], tricks })).card).toBe('7S');
    });
  });

  describe('leading', () => {
    it('should draw trumps as the caller when it holds most of them', () => {
      const choice = choosePlay(view({ seat: 1, caller: 1, hand: ['AH', '0H', 'KH', 'QH', 'JH', '7S'] }));
      expect(choice.card).toBe('AH');
      expect(choice.reason).toContain('draw out');
    });

    it('should lead the highest card left in a suit to bank its point', () => {
      expect(choosePlay(view({ seat: 2, caller: 1, hand: ['AC', '7C', '9D'] })).card).toBe('AC');
    });

    it('should not lead a 10 while the A of that suit is still out', () => {
      expect(choosePlay(view({ seat: 2, caller: 1, hand: ['0C', '8D', '9D'] })).card).not.toBe('0C');
    });
  });

  it('should always choose a legal card and explain it', () => {
    const random = seededRandom(7);
    const deck = ['S', 'D', 'C', 'H'].reduce((cards, suit) => cards.concat('A0KQJ987'.split('').map(rank => rank + suit)), []);
    for (let round = 0; round < 3000; round++) {
      const shuffled = [...deck].sort(() => random() - 0.5);
      const trick = shuffled.slice(0, round % 3);
      const hand = shuffled.slice(3, 4 + round % 10);
      const seat = 1 + round % 3;
      const choice = choosePlay(view({ seat, caller: 1 + Math.floor(round / 3) % 3, trump: ['SPADES', 'HEARTS'][round % 2], trick, hand }));
      expect(getLegalCards(trick, hand, ['SPADES', 'HEARTS'][round % 2])).toContain(choice.card);
      expect(choice.reason.length).toBeGreaterThan(10);
    }
  });
});
