import {Injectable} from '@angular/core';
import {Card} from './hand/hand.component';
import {ValidationService} from './validation.service';

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

    constructor(private validationService: ValidationService) {
        this.playerPoints = new Map();
    }

    calculateEarnings(allPiles: Map<string, Card[]>, callerPlayer: number, lastTrickPlayer: number, bidMultiplier: number): {
        earnings: Map<string, number>;
        winMessage: string
    } {

        console.log('calculating earnings');
        console.log(allPiles);
        console.log(callerPlayer);
        console.log(lastTrickPlayer);

        // for each player, calculate points
        for (let player = 1; player <= 3; player++) {
            this.playerPoints.set('player' + player, this.calculatePlayerPoints(allPiles, player, lastTrickPlayer));
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
            winMessage = 'Player ' + callerPlayer + ' Wins the Round!';
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
            winMessage = 'Players ' + opponent1 + ' and ' + opponent2 + ' Win the Round!';
        }

        console.log('earnings');
        console.log(earnings);

        return {earnings, winMessage};
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

    calculatePlayerPoints(allPiles: Map<string, Card[]>, player: number, lastTrickPlayer: number): number {
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
            console.log('player got last trick so adding points ' + player);
            points++;
        }

        // 4 points for trump marriage, 2 points for normal marriage
        if (allPiles.get('player' + player + 'Marriage')?.length > 0) {
            console.log('we have detected marriage(s) for player ' + player);
            for (const marriageCard of allPiles.get('player' + player + 'Marriage')) {
                if (this.validationService.isTrump(marriageCard.code)) {
                    points += 4;
                } else {
                    points += 2;
                }
            }
        }

        return points;
    }

    // Ace and 10 is worth points
    isCardPoint(cardCode: string): boolean {
        return cardCode.charAt(0) === 'A' || cardCode.charAt(0) === '0';
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
