import { BrainView, cardName, chooseBury, choosePlay, chooseTrump, Knowledge } from './pc-brain';
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

    it('should go over its partner with a low trump and keep the highest trump', () => {
      // Player 3 called; partner Player 2 led the K♠ and Player 3 followed under it. Player 1 has no spades, so it must trump
      const choice = choosePlay(view({ seat: 1, caller: 3, trick: ['KS', '7S'], hand: ['AH', '7H', '9D'] }));
      expect(choice.card).toBe('7H');
      expect(choice.reason).toContain('lowest card that does, the 7♥');
    });

    it('should bank a 10 of trump over its partner while the A of trump is still out', () => {
      const choice = choosePlay(view({ seat: 1, caller: 3, trick: ['KS', '7S'], hand: ['0H', '7H', '9D'] }));
      expect(choice.card).toBe('0H');
    });

    it('should win with a low trump instead of the highest trump left', () => {
      expect(choosePlay(view({ seat: 3, caller: 3, trick: ['QS', '8S'], hand: ['AH', '8H', '9D'] })).card).toBe('8H');
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

    it('should take over a partner\'s low lead with the A to bank its point', () => {
      // Clubs are trump and Player 1 called. Partner Player 2 led the 7♥; the K♥ or 10♥ could still beat a Q♥
      const hand = ['8S', '9S', 'KD', '7C', '9C', 'AH', 'QH'];
      const choice = choosePlay(view({ seat: 3, caller: 1, trump: 'CLUBS', trick: ['7H'], hand }));
      expect(choice.card).toBe('AH');
      expect(choice.reason).toContain('took over partner Player 2\'s 7♥ with the A♥');
    });

    it('should say it went over its partner when every legal card does', () => {
      // the caller has shown it can trump hearts, so taking over with the A♥ isn't safe
      const tricks = [{ plays: [{ player: 2, card: '8H' }, { player: 3, card: 'JH' }, { player: 1, card: '7C' }] }];
      const choice = choosePlay(view({ seat: 3, caller: 1, trump: 'CLUBS', trick: ['7H'], hand: ['8S', 'AH', 'QH'], tricks }));
      expect(choice.card).toBe('QH');
      expect(choice.reason).toContain('had to go over partner Player 2\'s 7♥');
    });

    it('should give a point when its partner plays last and has shown it can trump the lead', () => {
      // Player 1 called. Earlier, partner Player 3 had no diamonds and trumped; now Player 1 leads the A♦
      const tricks = [{ plays: [{ player: 1, card: 'KD' }, { player: 2, card: '7D' }, { player: 3, card: '7C' }] }];
      const choice = choosePlay(view({ seat: 2, caller: 1, trump: 'CLUBS', trick: ['AD'], hand: ['0D', '8D', '9S'], tricks }));
      expect(choice.card).toBe('0D');
      expect(choice.reason).toContain('can most likely trump the trick');
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

    it('should bank the point in the suit with the fewest cards still out first, before someone runs out and trumps it', () => {
      // only 3 diamonds are out, against 6 clubs
      const choice = choosePlay(view({ seat: 2, caller: 1, hand: ['AC', '7C', 'AD', 'KD', 'QD', 'JD', '9D'] }));
      expect(choice.card).toBe('AD');
      expect(choice.reason).toContain('With only 3 diamonds still out, someone may already have none and trump it');
    });

    it('should draw trumps first as the caller when its point card is in a short suit', () => {
      // only the 10♦ and 7♦ are out, and it holds as many trumps as are still out
      const choice = choosePlay(view({ seat: 1, caller: 1, hand: ['AH', '0H', 'KH', 'QH', 'AD', 'KD', 'QD', 'JD', '9D', '8D'] }));
      expect(choice.card).toBe('AH');
      expect(choice.reason).toContain('draw out trumps first');
    });

    it('should not lead into a suit that nobody else has while trumps are still out', () => {
      // it holds all 8 clubs, so anyone else would have to trump them
      expect(choosePlay(view({ seat: 2, caller: 1, hand: ['AC', 'KC', 'QC', 'JC', '0C', '9C', '8C', '7C', '7S'] })).card).toBe('7S');
    });

    it('should lead the K to force out the A when it holds the 10 but not the A', () => {
      const choice = choosePlay(view({ seat: 2, caller: 1, hand: ['0D', 'KD', '7S', '8S', '9C'] }));
      expect(choice.card).toBe('KD');
      expect(choice.reason).toContain('force out the A♦');
    });

    it('should lead a suit its partner can trump, knowing the caller holds the rest of it', () => {
      // Clubs are trump and Player 1 called. Partner Player 3 had no hearts and trumped, so the A♥ and 10♥ are with Player 1
      const tricks = [{ plays: [{ player: 1, card: '8H' }, { player: 2, card: '9H' }, { player: 3, card: '7C' }] }];
      const choice = choosePlay(view({ seat: 2, caller: 1, trump: 'CLUBS', hand: ['7H', 'KD', '8S', '9S'], tricks }));
      expect(choice.card).toBe('7H');
      expect(choice.reason).toContain('so partner Player 3 can trump it');
      expect(choice.reason).toContain('are with Player 1, including the');
      expect(choice.reason).toContain('A♥');
      expect(choice.reason).toContain('10♥');
    });

    it('should not lead a suit for its partner to trump when the caller is out of it too', () => {
      const tricks = [
        { plays: [{ player: 1, card: '8H' }, { player: 2, card: '9H' }, { player: 3, card: '7C' }] },
        { plays: [{ player: 3, card: 'JH' }, { player: 1, card: '8C' }, { player: 2, card: 'QH' }] }
      ];
      expect(choosePlay(view({ seat: 2, caller: 1, trump: 'CLUBS', hand: ['7H', 'KD', '8S', '9S'], tricks })).card).not.toBe('7H');
    });

    it('should work out who holds a card once the other player runs out of its suit', () => {
      const tricks = [{ plays: [{ player: 1, card: '8H' }, { player: 2, card: '9H' }, { player: 3, card: '7C' }] }];
      const knowledge = new Knowledge(view({ seat: 2, caller: 1, trump: 'CLUBS', hand: ['7H'], tricks }));
      expect(knowledge.holder('0H')).toBe(1);
      // a K could also have been buried by the caller, so it can't be sure
      expect(knowledge.holder('KH')).toBeUndefined();
      expect(knowledge.holder('0D')).toBeUndefined();
    });

    it('should not lead the K into a suit an opponent has shown it can trump', () => {
      // Player 1 had no diamonds and trumped one, which the PC saw happen
      const tricks = [{ plays: [{ player: 3, card: 'QD' }, { player: 1, card: '7H' }, { player: 2, card: 'JD' }] }];
      expect(choosePlay(view({ seat: 2, caller: 1, hand: ['0D', 'KD', '7S', '8S', '9C'], tricks })).card).not.toBe('KD');
    });
  });

  it('should choose among equally good cards instead of always the same one', () => {
    // three 7s with plenty of each suit still out are all equally good leads
    spyOn(Math, 'random').and.returnValues(0, 0.5, 0.99);
    const hand = ['7S', '7D', '7C', 'KH'];
    const picks = [0, 1, 2].map(() => choosePlay(view({ seat: 2, caller: 1, hand })).card);
    expect(new Set(picks)).toEqual(new Set(['7S', '7D', '7C']));
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
