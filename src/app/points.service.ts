import {Injectable} from '@angular/core';
import {Card} from './components/card-pile/card-pile.component';
import {cardName} from './pc-brain';
import {contractCents, isPointCard, marriagePoints, SevenResult} from './rules';

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
    calculateEarnings(allPiles: Map<string, Card[]>, callerPlayer: number, lastTrickPlayer: number, trump: string,
                      hundredCalled = false): { earnings: Map<string, number>; winMessage: string; betResult: BetResult } {
        const defenders = [1, 2, 3].filter(player => player !== callerPlayer);
        const callerPoints = this.calculatePlayerPoints(allPiles, callerPlayer, lastTrickPlayer, trump);
        const defenderPoints = defenders
            .reduce((total, player) => total + this.calculatePlayerPoints(allPiles, player, lastTrickPlayer, trump), 0);
        const cents = contractCents(callerPoints, defenderPoints, trump, hundredCalled);

        const earnings: Map<string, number> = new Map();
        earnings.set('player' + callerPlayer, cents * 2);
        defenders.forEach(player => earnings.set('player' + player, -cents));

        // always from the caller's side, kept short: the bets below the result say whether it was the Game or the 100
        const winMessage = 'Player ' + callerPlayer + (cents > 0 ? ' won: ' : ' lost: ') + callerPoints + ' to ' + defenderPoints;
        // a called 100 can be lost with more points than the defenders, so its line carries the score instead of the result above
        const score = ': ' + callerPoints + ' to ' + defenderPoints;
        const betResult = this.describeBet(callerPlayer, cents > 0, hundredCalled ? 'the Called 100' + score : 'the Game');
        return { earnings, winMessage, betResult };
    }

    // Who pays whom, given what each defender pays the caller (negative when the caller pays each of them)
    describePayment(centsFromEachDefender: number, callerPlayer: number): string {
        const defenderNames = 'Players ' + [1, 2, 3].filter(player => player !== callerPlayer).join(' and ');
        if (centsFromEachDefender > 0) {
            return defenderNames + ' each pay Player ' + callerPlayer + ' ' + centsFromEachDefender + '¢';
        }
        if (centsFromEachDefender < 0) {
            return 'Player ' + callerPlayer + ' pays ' + defenderNames + ' ' + -centsFromEachDefender + '¢ each';
        }
        return 'Nobody pays anything';
    }

    private describeBet(callerPlayer: number, won: boolean, bet: string): BetResult {
        return { text: 'Player ' + callerPlayer + (won ? ' won ' : ' lost ') + bet, won };
    }

    // The 7 of trump on the last trick is paid separately from the game: by each opponent of the side that won it,
    // or to each of them when it was lost
    calculateSevenEarnings(seven: SevenResult, callerPlayer: number): { earnings: Map<string, number>; betResult: BetResult } {
        const defenders = [1, 2, 3].filter(player => player !== callerPlayer);
        const callerSide = seven.player === callerPlayer;
        // +1 when the caller collects, -1 when the caller pays
        const callerCollects = callerSide === seven.won ? 1 : -1;
        const earnings: Map<string, number> = new Map();
        earnings.set('player' + callerPlayer, callerCollects * seven.cents * 2);
        defenders.forEach(player => earnings.set('player' + player, -callerCollects * seven.cents));

        // a defender's 7 is always silent, and its result is still told from the caller's side
        const bet = (seven.called ? 'the Called ' : 'the Silent ') + cardName(seven.card);
        return { earnings, betResult: this.describeBet(callerPlayer, callerCollects > 0, bet) };
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
