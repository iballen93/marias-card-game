import { Injectable } from '@angular/core';
import { Card } from './components/card-pile/card-pile.component';
import { getLegalCards } from './rules';

@Injectable({
    providedIn: 'root'
})
export class ComputerPlayerService {

    // Uses the same rules as a played card, so this list always matches what the game accepts
    public getLegalCards(gamePile: Card[], playerPile: Card[], trump: string): string[] {
        return getLegalCards((gamePile || []).map(card => card.code), playerPile.map(card => card.code), trump);
    }
}
