import { Injectable } from '@angular/core';
import { Card } from './components/card-pile/card-pile.component';
import { getLegalCards, suitOf, validateBury } from './rules';
import { Trick } from './trick';

// What the PC is being asked to do
export type PcPhase = 'trump' | 'bury' | 'play';

// Everything a PC seat is allowed to know when it makes a choice
export interface PcView {
    seat: number;
    phase: PcPhase;
    hand: Card[];
    trick: Card[];
    trump: string;
    caller: number;
    tricks: Trick[];
}

export interface PcChoice {
    card: Card;
    // one line explaining the choice, for the Learning Mode explanation
    reason: string;
}

const SUIT_NAMES = { S: 'Spades', D: 'Diamonds', C: 'Clubs', H: 'Hearts' };

@Injectable({
    providedIn: 'root'
})
export class ComputerPlayerService {

    // Uses the same rules as a played card, so this list always matches what the game accepts
    public getLegalCards(gamePile: Card[], playerPile: Card[], trump: string): string[] {
        return getLegalCards((gamePile || []).map(card => card.code), playerPile.map(card => card.code), trump);
    }

    // Easy level for now: a random choice from whatever the rules allow
    public chooseMove(view: PcView): PcChoice {
        switch (view.phase) {
            case 'trump': {
                const card = this.pickRandom(view.hand);
                return { card, reason: 'picked ' + SUIT_NAMES[suitOf(card.code)] + ' as trump at random' };
            }
            case 'bury': {
                const card = this.pickRandom(view.hand.filter(handCard => validateBury(handCard.code) === ''));
                return { card, reason: 'buried a card at random' };
            }
            default: {
                const legal = this.getLegalCards(view.trick, view.hand, view.trump);
                const card = this.pickRandom(view.hand.filter(handCard => legal.includes(handCard.code)));
                return { card, reason: 'played a legal card at random' };
            }
        }
    }

    private pickRandom(cards: Card[]): Card {
        return cards[Math.floor(Math.random() * cards.length)];
    }
}
