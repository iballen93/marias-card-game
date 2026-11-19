import {Injectable} from '@angular/core';
import {Card} from './components/card-pile/card-pile.component';
import {cardName} from './pc-brain';
import {Contract, CONTRACT_CENTS, contractCents, contractName, isPointCard, marriagePoints, SevenResult} from './rules';
import {raiseMultiplier, raiseName} from './raising';
import { formatCents } from './money';

export interface Points {
    totalTricks: string;
    lastTrick: boolean;
    theSeven: boolean;
}

// One bet's outcome, always from the caller's side: "Player 1 lost the Called 100"
export interface BetResult {
    text: string;
    won: boolean;
}

export interface Earnings {
    centsGained: number;
    centsLost: number;
}

@Injectable({
    providedIn: 'root'
})
export class PointsService {

    playerPoints: Map<string, number>;

    constructor() {
        this.playerPoints = new Map();
    }

    // The Game, or the called 100 that replaces it
    // raises: how many times the Game or the 100 was raised, each one doubling it
    calculateEarnings(allPiles: Map<string, Card[]>, callerPlayer: number, lastTrickPlayer: number, trump: string,
                      hundredCalled = false, raises = 0): { earnings: Map<string, number>; winMessage: string; betResult: BetResult } {
        const defenders = [1, 2, 3].filter(player => player !== callerPlayer);
        const callerPoints = this.calculatePlayerPoints(allPiles, callerPlayer, lastTrickPlayer, trump);
        const defenderPoints = defenders
            .reduce((total, player) => total + this.calculatePlayerPoints(allPiles, player, lastTrickPlayer, trump), 0);
        const cents = contractCents(callerPoints, defenderPoints, trump, hundredCalled) * raiseMultiplier(raises);

        const earnings: Map<string, number> = new Map();
        earnings.set('player' + callerPlayer, cents * 2);
        defenders.forEach(player => earnings.set('player' + player, -cents));

        // always from the caller's side, kept short: the bets below the result say whether it was the Game or the 100
        const winMessage = 'Player ' + callerPlayer + (cents > 0 ? ' won: ' : ' lost: ') + callerPoints + ' to ' + defenderPoints;
        // when the contract gets a line of its own (the 100, or a raised Game), that line carries the score and replaces the
        // result line above it; a called 100 can be lost with more points than the defenders, so "won: 5 to 4" would mislead
        const ownLine = hundredCalled || raises > 0;
        const score = ': ' + callerPoints + ' to ' + defenderPoints;
        const bet = (hundredCalled ? 'the Called 100' : 'the Game') + this.describeRaise(raises) + (ownLine ? score : '');
        const betResult = this.describeBet(callerPlayer, cents, bet);
        return { earnings, winMessage, betResult };
    }

    // No Tricks or All Tricks: a fixed price, doubled for each raise. lostOnTrick is the trick that broke it, if one did.
    calculateNoTrumpEarnings(contract: Exclude<Contract, 'game'>, callerPlayer: number, lostOnTrick: number | undefined, raises = 0)
        : { earnings: Map<string, number>; winMessage: string; betResult: BetResult } {
        const won = lostOnTrick === undefined;
        const cents = (won ? 1 : -1) * CONTRACT_CENTS[contract] * raiseMultiplier(raises);
        const earnings: Map<string, number> = new Map();
        earnings.set('player' + callerPlayer, cents * 2);
        [1, 2, 3].filter(player => player !== callerPlayer).forEach(player => earnings.set('player' + player, -cents));
        const name = contractName(contract);
        const winMessage = 'Player ' + callerPlayer + (won ? ' won ' + name : ' lost ' + name + ' on trick ' + lostOnTrick);
        // a raised one gets a line of its own, which replaces the result line, so it says the trick too
        const bet = name + this.describeRaise(raises) + (won ? '' : ' on trick ' + lostOnTrick);
        return { earnings, winMessage, betResult: this.describeBet(callerPlayer, cents, bet) };
    }

    // Who pays whom, given what each defender pays the caller (negative when the caller pays each of them)
    describePayment(centsFromEachDefender: number, callerPlayer: number): string {
        const defenderNames = 'Players ' + [1, 2, 3].filter(player => player !== callerPlayer).join(' and ');
        if (centsFromEachDefender > 0) {
            return defenderNames + ' each pay Player ' + callerPlayer + ' ' + formatCents(centsFromEachDefender);
        }
        if (centsFromEachDefender < 0) {
            return 'Player ' + callerPlayer + ' pays ' + defenderNames + ' ' + formatCents(centsFromEachDefender) + ' each';
        }
        return 'Nobody pays anything';
    }

    // starts with what the bet paid the caller from each defender: "-8¢ Player 1 lost the Called 7♠"
    // the raise a bet ended on, such as " (Re)"
    private describeRaise(raises: number): string {
        return raises > 0 ? ' (' + raiseName(raises) + ')' : '';
    }

    private describeBet(callerPlayer: number, centsFromEachDefender: number, bet: string): BetResult {
        const won = centsFromEachDefender > 0;
        const cents = (won ? '+' : '-') + formatCents(centsFromEachDefender) + ' ';
        return { text: cents + 'Player ' + callerPlayer + (won ? ' won ' : ' lost ') + bet, won };
    }

    // The 7 of trump on the last trick is paid separately from the game: by each opponent of the side that won it,
    // or to each of them when it was lost
    calculateSevenEarnings(seven: SevenResult, callerPlayer: number, raises = 0): { earnings: Map<string, number>; betResult: BetResult } {
        const defenders = [1, 2, 3].filter(player => player !== callerPlayer);
        const callerSide = seven.player === callerPlayer;
        // +1 when the caller collects, -1 when the caller pays
        // only a called 7 can be raised
        const cents = seven.cents * (seven.called ? raiseMultiplier(raises) : 1);
        const callerCollects = callerSide === seven.won ? 1 : -1;
        const earnings: Map<string, number> = new Map();
        earnings.set('player' + callerPlayer, callerCollects * cents * 2);
        defenders.forEach(player => earnings.set('player' + player, -callerCollects * cents));

        // a defender's 7 is always silent, and its result is still told from the caller's side
        const bet = seven.called ? 'the Called ' + cardName(seven.card) + this.describeRaise(raises) : 'the Silent ' + cardName(seven.card);
        return { earnings, betResult: this.describeBet(callerPlayer, callerCollects * cents, bet) };
    }

    calculatePlayerPoints(allPiles: Map<string, Card[]>, player: number, lastTrickPlayer: number, trump: string): number {
        let points = 0;
        const playerWinPile = allPiles.get('player' + player + 'Win');

        // initial points
        if (playerWinPile) {
            for (const card of playerWinPile) {
                if (this.isCardPoint(card.code)) {
                    points++;
                }
            }
        }

        // 1 point last trick
        if (player === lastTrickPlayer) {
            points++;
        }

        // 4 points for trump marriage, 2 points for normal marriage
        if (allPiles.get('player' + player + 'Marriage')?.length > 0) {
            for (const marriageCard of allPiles.get('player' + player + 'Marriage')) {
                points += marriagePoints(marriageCard.code, trump);
            }
        }

        return points;
    }

    // Ace and 10 is worth points
    isCardPoint(cardCode: string): boolean {
        return isPointCard(cardCode);
    }

}

// Inputs:
// map of playerName to Points for the round
// caller (active) Player (1, 2 or 3)

// Output:
// map of playerName to Earnings for the round
