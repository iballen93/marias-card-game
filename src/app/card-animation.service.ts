import {Injectable} from '@angular/core';

export const MARRIAGE_CARD_KEY_PREFIX = 'marriage-';

export type CardPositions = Map<string, DOMRect>;

/**
 * Makes cards visibly travel between piles. Capture where every card is, change the piles, then
 * animateFrom() flies a copy of each card from its old position to its new one.
 *
 * Copies are used because several piles have overflow: hidden, which would clip the real card.
 */
@Injectable({
  providedIn: 'root'
})
export class CardAnimationService {

  private readonly DURATION_MS = 350;
  private readonly DEAL_STAGGER_MS = 25;
  private readonly MIN_MOVE_PX = 1;

  private cleanups: (() => void)[] = [];

  capturePositions(): CardPositions {
    const positions: CardPositions = new Map();
    this.getCardElements().forEach(card => positions.set(card.dataset.cardKey, card.getBoundingClientRect()));
    return positions;
  }

  // Cards missing from positions are new, so they are dealt from the middle of the table
  animateFrom(positions: CardPositions): void {
    this.finishRunningAnimations();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let dealtCards = 0;
    this.getCardElements().forEach(card => {
      const to = card.getBoundingClientRect();
      const key = card.dataset.cardKey;
      // a card joining the marriage pile also starts from wherever the played card was
      const from = positions.get(key) || positions.get(key.replace(MARRIAGE_CARD_KEY_PREFIX, ''));

      if (to.width === 0) {
        return;
      }
      if (!from) {
        this.fly(card, this.getDeckPosition(to), to, dealtCards++ * this.DEAL_STAGGER_MS);
      } else if (this.hasMoved(from, to)) {
        this.fly(card, from, to, 0);
      }
    });
  }

  private fly(card: HTMLImageElement, from: DOMRect, to: DOMRect, delay: number): void {
    const copy = card.cloneNode() as HTMLImageElement;
    copy.removeAttribute('data-card-key');
    copy.classList.add('card-in-flight');
    Object.assign(copy.style, {
      position: 'fixed',
      left: `${to.left}px`,
      top: `${to.top}px`,
      width: `${to.width}px`,
      height: `${to.height}px`,
      maxWidth: 'none',
      margin: '0',
      zIndex: '1000',
      pointerEvents: 'none',
      transformOrigin: 'top left'
    });
    document.body.appendChild(copy);

    // opacity rather than visibility, so the real card can still be clicked during the flight
    card.style.opacity = '0';

    const cleanup = () => {
      copy.remove();
      card.style.opacity = '';
    };
    const start = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
    const animation = copy.animate(
      [{transform: start}, {transform: 'none'}],
      {duration: this.DURATION_MS, delay, easing: 'ease-in-out', fill: 'backwards'}
    );
    animation.onfinish = cleanup;
    this.cleanups.push(cleanup);
  }

  private finishRunningAnimations(): void {
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups = [];
  }

  private getCardElements(): HTMLImageElement[] {
    return Array.from(document.querySelectorAll<HTMLImageElement>('img[data-card-key]'));
  }

  private getDeckPosition(card: DOMRect): DOMRect {
    return new DOMRect((window.innerWidth - card.width) / 2, (window.innerHeight - card.height) / 2, card.width, card.height);
  }

  private hasMoved(from: DOMRect, to: DOMRect): boolean {
    return Math.abs(from.left - to.left) > this.MIN_MOVE_PX
      || Math.abs(from.top - to.top) > this.MIN_MOVE_PX
      || Math.abs(from.width - to.width) > this.MIN_MOVE_PX;
  }
}
