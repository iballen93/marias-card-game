import { HandComponent } from './hand.component';

describe('HandComponent', () => {
  const cards = ['AS', '7S', '8S', 'KD', 'QD', '9D'].map(code => ({ code, image: '', suit: '' }));

  it('should show every card in a face-up win pile', () => {
    const hand = new HandComponent();
    hand.winCards = cards;
    expect(hand.getShownWinCards()).toEqual(cards);
  });

  it('should show a face-down win pile as a single card, so nobody can count the tricks', () => {
    const hand = new HandComponent();
    hand.winCards = cards;
    hand.hideWin = true;
    expect(hand.getShownWinCards().length).toBe(1);
    expect(hand.getWinPileTitle()).toBe('Win Pile');
  });

  it('should show nothing for an empty face-down win pile', () => {
    const hand = new HandComponent();
    hand.winCards = undefined;
    hand.hideWin = true;
    expect(hand.getShownWinCards()).toBeUndefined();
  });
});
