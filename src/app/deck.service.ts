import {Injectable} from '@angular/core';
import {Card, CARD_BACK_IMAGE} from './components/card-pile/card-pile.component';

@Injectable({
  providedIn: 'root'
})
export class DeckService {

  private readonly RANKS = ['A', 'K', 'Q', 'J', '0', '9', '8', '7'];
  private readonly SUITS = new Map([['S', 'SPADES'], ['D', 'DIAMONDS'], ['C', 'CLUBS'], ['H', 'HEARTS']]);
  private readonly CARD_IMAGE_PATH = 'assets/cards';

  // Held so the browser keeps the loaded images in memory
  private preloadedImages: HTMLImageElement[] = [];

  createShuffledDeck(): Card[] {
    const deck: Card[] = [];
    this.SUITS.forEach((suit, suitCode) => {
      for (const rank of this.RANKS) {
        const code = rank + suitCode;
        deck.push({code, suit, image: `${this.CARD_IMAGE_PATH}/${code}.png`});
      }
    });
    return this.shuffle(deck);
  }

  async preloadCardImages(): Promise<void> {
    const images = this.createShuffledDeck().map(card => card.image).concat(CARD_BACK_IMAGE);
    await Promise.all(images.map(src => new Promise<void>(resolve => {
      const image = new Image();
      image.onload = image.onerror = () => resolve();
      image.src = src;
      this.preloadedImages.push(image);
    })));
  }

  // Fisher-Yates, so every ordering of the deck is equally likely
  private shuffle(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
}
