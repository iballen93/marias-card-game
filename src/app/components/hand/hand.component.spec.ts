import { HandComponent } from './hand.component';

describe('HandComponent', () => {
  const cards = (count: number) => ['AS', '7S', '8S', 'KD', 'QD', '9D', 'JC', '8C', '7C'].slice(0, count)
    .map(code => ({ code, image: '', suit: '' }));
  const layout = (hand: HandComponent) => [hand.getWinCardPeek(), hand.getWinPileWidth(), hand.getSideCardWidth()];

  it('should fan out a face-up win pile', () => {
    const hand = new HandComponent();
    hand.winCards = cards(6);
    expect(hand.getWinCardPeek()).not.toBe('0px');
  });

  it('should stack a face-down win pile exactly, and size it the same however many cards it holds', () => {
    const hand = new HandComponent();
    hand.hideWin = true;
    hand.winCards = cards(3);
    const small = layout(hand);
    hand.winCards = cards(9);
    expect(layout(hand)).toEqual(small);
    expect(hand.getWinCardPeek()).toBe('0px');
    expect(hand.getWinPileTitle()).toBe('Win Pile');
  });
});
