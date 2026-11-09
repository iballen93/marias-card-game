import {Injectable} from '@angular/core';
import {Card} from './components/card-pile/card-pile.component';
import {ILLEGAL_MOVES, isTrump, validateBury, validateMove} from './rules';

// Checks the move being made on the board; the rules themselves live in rules.ts
@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  illegalMoves = ILLEGAL_MOVES;

  gamePile: Card[];
  activePlayerPile: Card[];
  selectedCardCode: string;
  trump: string;

  loadCards(gamePile: Card[], activePlayerPile: Card[], selectedCardCode: string, trump: string): void {
    this.gamePile = gamePile;
    this.activePlayerPile = activePlayerPile;
    this.selectedCardCode = selectedCardCode;
    this.trump = trump;
  }

  validateMove(): string {
    const trick = (this.gamePile || []).map(card => card.code);
    const hand = this.activePlayerPile.map(card => card.code);
    return validateMove(trick, hand, this.selectedCardCode, this.trump);
  }

  isCardFromActivePlayerPile(cardCode: string): boolean {
    return this.activePlayerPile.map(playerCard => playerCard.code).includes(cardCode);
  }

  isTrump(cardCode: string): boolean {
    return isTrump(cardCode, this.trump);
  }

  validateBuryCard(cardCode: string): string {
    return validateBury(cardCode);
  }
}
