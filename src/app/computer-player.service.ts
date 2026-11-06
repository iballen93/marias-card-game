import { Injectable } from '@angular/core';
import { Card } from './components/card-pile/card-pile.component';
import { ValidationService } from 'src/app/validation.service';

@Injectable({
    providedIn: 'root'
})
export class ComputerPlayerService {

    constructor(private validationService: ValidationService) {
    }

    // Uses the same check as a played card, so this list always matches what the game accepts
    public getLegalCards(gamePile: Card[], playerPile: Card[], trump: string): string[] {
        return playerPile.map(card => card.code).filter(cardCode => {
            this.validationService.loadCards(gamePile, playerPile, cardCode, trump);
            return this.validationService.validateMove() === '';
        });
    }
}
