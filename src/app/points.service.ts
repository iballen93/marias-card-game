import {Injectable} from '@angular/core';
import {Card} from './components/card-pile/card-pile.component';
import {cardName} from './pc-brain';
import {isPointCard, marriagePoints, SevenResult} from './rules';

export interface Points {
    totalTricks: string;
    lastTrick: boolean;
    theSeven: boolean;
}

export interface Earnings {
    centsGained: number;
    centsLost: number;
}

@Injectable({
    providedIn: 'root'
})
export class PointsService {

    private readonly BASE_EARNINGS_CENTS = 2;
    private readonly TRICKS_TO_DOUBLE_BID = 10;

    playerPoints: Map<string, number>;

    constructor() {
        this.playerPoints = new Map();
    }

    calculateEarnings(allPiles: Map<string, Card[]>, callerPlayer: number, lastTrickPlayer: number, bidMultiplier: number, trump: string): {
        earnings: Map<string, number>;
        winMessage: string
    } {

        console.log('calculating earnings');
        console.log(allPiles);
        console.log(callerPlayer);
        console.log(lastTrickPlayer);

        // for each player, calculate points
        for (let player = 1; player <= 3; player++) {
            this.playerPoints.set('player' + player, this.calculatePlayerPoints(allPiles, player, lastTrickPlayer, trump));
        }

        let callerPoints = 0;
        let opponentPoints = 0;

        for (let player = 1; player <= 3; player++) {
            if (player === callerPlayer) {
                callerPoints = this.playerPoints.get('player' + player);
            } else {
                opponentPoints += this.playerPoints.get('player' + player);
            }
        }

        if (this.isEnoughTricksToMultiplyBid(callerPoints, opponentPoints)) {
            console.log('bidMultiplier' + bidMultiplier);
            bidMultiplier = this.multiplyTricksOver10(bidMultiplier, callerPoints, opponentPoints);
            console.log('bidMultiplier' + bidMultiplier);
        }

        console.log('caller points: ' + callerPoints);
        console.log('opponent points: ' + opponentPoints);

        const earnings: Map<string, number> = new Map();
        const moneyWon = (this.BASE_EARNINGS_CENTS ** bidMultiplier);
        const moneyLost = (this.BASE_EARNINGS_CENTS ** bidMultiplier) * -1;

        console.log('money won: ' + moneyWon);
        console.log('money lost: ' + moneyLost);

        let winMessage = '';
        if (this.callerWins(callerPoints, opponentPoints)) {
            winMessage = 'Player ' + callerPlayer + ' Wins the Round ' + callerPoints + ' to ' + opponentPoints + '!';
            earnings.set('player' + callerPlayer, moneyWon * 2);
            let opponent1 = callerPlayer + 1;
            if (opponent1 === 4) {
                opponent1 = 1;
            }
            earnings.set('player' + opponent1, moneyLost);
            let opponent2 = opponent1 + 1;
            if (opponent2 === 4) {
                opponent2 = 1;
            }
            earnings.set('player' + opponent2, moneyLost);
        } else {
            earnings.set('player' + callerPlayer, moneyLost * 2);
            let opponent1 = callerPlayer + 1;
            if (opponent1 === 4) {
                opponent1 = 1;
            }
            earnings.set('player' + opponent1, moneyWon);
            let opponent2 = opponent1 + 1;
            if (opponent2 === 4) {
                opponent2 = 1;
            }
            earnings.set('player' + opponent2, moneyWon);
            winMessage = 'Players ' + opponent1 + ' and ' + opponent2 + ' Win the Round ' + opponentPoints + ' to ' + callerPoints + '!';
        }

        console.log('earnings');
        console.log(earnings);

        return {earnings, winMessage};
    }

    // The 7 of trump on the last trick is paid separately from the game: by each opponent of the side that won it,
    // or to each of them when it was lost
    calculateSevenEarnings(seven: SevenResult, callerPlayer: number): { earnings: Map<string, number>; message: string } {
        const defenders = [1, 2, 3].filter(player => player !== callerPlayer);
        const callerSide = seven.player === callerPlayer;
        // +1 when the caller collects, -1 when the caller pays
        const callerCollects = callerSide === seven.won ? 1 : -1;
        const earnings: Map<string, number> = new Map();
        earnings.set('player' + callerPlayer, callerCollects * seven.cents * 2);
        defenders.forEach(player => earnings.set('player' + player, -callerCollects * seven.cents));

        const seven7 = (seven.called ? 'called ' : '') + cardName(seven.card);
        const defenderNames = 'Players ' + defenders.join(' and ');
        const outcome = seven.won ? ' won the last trick: ' : seven.playedLast ? ' lost the last trick: ' : ' wasn\'t played in the last trick: ';
        const result = 'Player ' + seven.player + '\'s ' + seven7 + outcome;
        const payment = callerCollects > 0
            ? defenderNames + ' each pay Player ' + callerPlayer + ' ' + seven.cents + '¢'
            : 'Player ' + callerPlayer + ' pays ' + defenderNames + ' ' + seven.cents + '¢ each';
        return { earnings, message: result + payment };
    }

    callerWins(callerPoints: number, opponentPoints: number): boolean {
        return callerPoints > opponentPoints;
    }

    multiplyTricksOver10(earningsMultiplier: number, callerPoints: number, opponentPoints: number): number {
        if (callerPoints > this.TRICKS_TO_DOUBLE_BID) {
            earningsMultiplier += (callerPoints - this.TRICKS_TO_DOUBLE_BID);
        }
        if (opponentPoints > this.TRICKS_TO_DOUBLE_BID) {
            earningsMultiplier += (opponentPoints - this.TRICKS_TO_DOUBLE_BID);
        }
        return earningsMultiplier;
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

    isEnoughTricksToMultiplyBid(callerPoints: number, opponentPoints: number): boolean {
        return callerPoints > this.TRICKS_TO_DOUBLE_BID || opponentPoints > this.TRICKS_TO_DOUBLE_BID;
    }
}


// Inputs:
// map of playerName to Points for the round
// caller (active) Player (1, 2 or 3)

// Output:
// map of playerName to Earnings for the round
