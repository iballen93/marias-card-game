import {Injectable} from '@angular/core';
import {Card} from './hand/hand.component';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  illegalMoves = {
    MUST_FOLLOW_SUIT: 'If possible, card must follow suit.',
    MUST_OVERRIDE: 'If possible, when following suit, card must be higher than previously played.',
    MUST_TRUMP: 'If possible, card must be trump when unable to follow suit.',
    BURY_POINTS: 'Point cards can not be buried.'
  };

  cardPriority: Map<string, number>;

  gamePile: Card[];
  activePlayerPile: Card[];
  selectedCardCode: string;
  trump: string;

  constructor() {
    this.setCardPriority();
  }

  loadCards(gamePile: Card[], activePlayerPile: Card[], selectedCardCode: string, trump: string): void {
    this.gamePile = gamePile;
    this.activePlayerPile = activePlayerPile;
    this.selectedCardCode = selectedCardCode;
    this.trump = trump;
  }

  getCardCodeToCompare(): string {
    switch (this.gamePile.length) {
      case 1:
        return this.gamePile[0].code;
      case 2:
        if (this.isMatchingSuit(this.gamePile[0].code, this.gamePile[1].code)) {
          if (this.isCardOverride(this.gamePile[1].code, this.gamePile[0].code)) {
            return this.gamePile[1].code;
          } else {
            return this.gamePile[0].code;
          }
        } else {
          return this.gamePile[0].code;
        }
    }
  }

  isMatchingSuit(cardCode1: string, cardCode2: string): boolean {
    return cardCode1.charAt(1) === cardCode2.charAt(1);
  }

  isCardOverride(cardCode: string, previousPlayedCardCode: string): boolean {
    return this.cardPriority.get(cardCode.charAt(0)) < this.cardPriority.get(previousPlayedCardCode.charAt(0));
  }

  validateMove(): string {
    if (this.gamePile?.length > 0) {
      const cardCodeToCompare = this.getCardCodeToCompare();
      if (this.canMatchSuit(cardCodeToCompare)) {
        if (this.isMatchingSuit(this.selectedCardCode, cardCodeToCompare)) {
          if (!this.isCardOverride(this.selectedCardCode, cardCodeToCompare) && this.canOverride(cardCodeToCompare)) {
            return this.illegalMoves.MUST_OVERRIDE;
          }
        } else {
          return this.illegalMoves.MUST_FOLLOW_SUIT;
        }
      } else {
        if (!this.isTrump(this.selectedCardCode) && this.hasTrump()) {
          return this.illegalMoves.MUST_TRUMP;
        }
      }
    }
    return '';
  }

  isCardFromActivePlayerPile(cardCode: string): boolean {
    return this.activePlayerPile.map(playerCard => playerCard.code).includes(cardCode);
  }

  canOverride(cardCodeToCompare: string): boolean {
    if (this.gamePile.length === 2 && !this.isTrump(this.gamePile[0].code) && this.isTrump(this.gamePile[1].code)) {
      return false;
    }
    for (const activePlayerCardCode of this.activePlayerPile.map(activePlayerCard => activePlayerCard.code)) {
      if (this.isMatchingSuit(activePlayerCardCode, cardCodeToCompare)) {
        if (this.isCardHigherPriority(activePlayerCardCode, cardCodeToCompare)) {
          return true;
        }
      }
    }
    return false;
  }

  hasTrump(): boolean {
    return this.activePlayerPile.map(activePlayerCard => activePlayerCard.code.charAt(1))
      .includes(this.trump.charAt(0));
  }

  isTrump(cardCode: string): boolean {
    return cardCode.charAt(1) === this.trump.charAt(0);
  }

  canMatchSuit(cardCodeToCompare: string): boolean {
    return this.activePlayerPile.map(activePlayerCard => activePlayerCard.code.charAt(1))
      .includes(cardCodeToCompare.charAt(1));
  }

  isCardHigherPriority(cardCode: string, previousPlayedCardCode: string): boolean {
    return this.cardPriority.get(cardCode.charAt(0)) < this.cardPriority.get(previousPlayedCardCode.charAt(0));
  }

  private setCardPriority(): void {
    this.cardPriority = new Map();
    this.cardPriority.set('A', 1);
    this.cardPriority.set('0', 2);
    this.cardPriority.set('K', 3);
    this.cardPriority.set('Q', 4);
    this.cardPriority.set('J', 5);
    this.cardPriority.set('9', 6);
    this.cardPriority.set('8', 7);
    this.cardPriority.set('7', 8);
  }

  validateBuryCard(cardCode: string): string {
    if (cardCode.charAt(0) === 'A' || cardCode.charAt(0) === '0') {
      return this.illegalMoves.BURY_POINTS;
    }
    return '';
  }
}
