import { Injectable } from '@angular/core';
import { Card } from './components/card-pile/card-pile.component';
import {
    AnnouncementChoice, chooseAnnouncement, chooseBury, chooseNoTrumpBury, choosePlay, chooseRaises, chooseTakeOver, chooseTrump,
    RaiseChoice, TakeOverChoice
} from './pc-brain';
import { RaiseBet } from './raising';
import { Contract, getLegalCards } from './rules';
import { Trick } from './trick';

// What the PC is being asked to do
export type PcPhase = 'trump' | 'bury' | 'announce' | 'take-over' | 'raise' | 'play';

// Everything a PC seat is allowed to know when it makes a choice
export interface PcView {
    seat: number;
    phase: PcPhase;
    hand: Card[];
    trick: Card[];
    trump: string;
    caller: number;
    // this seat's own buried cards
    bury: Card[];
    tricks: Trick[];
    contract: Contract;
}

export interface PcChoice {
    card: Card;
    // finishes the sentence "Player 2 (PC) ...", for the Learning Mode explanation
    reason: string;
}

@Injectable({
    providedIn: 'root'
})
export class ComputerPlayerService {

    // Uses the same rules as a played card, so this list always matches what the game accepts
    public getLegalCards(gamePile: Card[], playerPile: Card[], trump: string): string[] {
        return getLegalCards((gamePile || []).map(card => card.code), playerPile.map(card => card.code), trump);
    }

    // The caller holds the 7 of trump and decides whether to call it
    public chooseAnnouncement(view: PcView): AnnouncementChoice {
        return chooseAnnouncement(view.hand.map(card => card.code), view.trump);
    }

    // A defender may take over with No Tricks or All Tricks
    public chooseTakeOver(view: PcView): TakeOverChoice {
        return chooseTakeOver(view.hand.map(card => card.code), view.contract);
    }

    // Which of the bets it may raise now it raises, as the caller or as a defender
    public chooseRaises(view: PcView, hundredCalled: boolean, bets: { bet: RaiseBet; level: number }[]): RaiseChoice {
        return chooseRaises({
            hand: view.hand.map(card => card.code), trump: view.trump, isCaller: view.seat === view.caller, hundredCalled, bets,
            contract: view.contract
        });
    }

    public chooseMove(view: PcView): PcChoice {
        const codes = (cards: Card[]) => (cards || []).map(card => card.code);
        const hand = codes(view.hand);
        const choice = view.phase === 'trump' ? chooseTrump(hand)
            // a player who took over buries for No Tricks or All Tricks; the caller buries for the Game, or to set those up
            : view.phase === 'bury' ? (view.contract === 'game' ? chooseBury(hand, view.trump) : chooseNoTrumpBury(hand, view.contract))
            : choosePlay({
                seat: view.seat,
                caller: view.caller,
                trump: view.trump,
                hand,
                trick: codes(view.trick),
                bury: codes(view.bury),
                tricks: view.tricks.map(trick => ({ plays: trick.plays.map(play => ({ player: play.player, card: play.card.code })) })),
                contract: view.contract
            });
        return { card: view.hand.find(card => card.code === choice.card), reason: choice.reason };
    }
}
