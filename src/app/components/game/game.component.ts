import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Card } from 'src/app/components/card-pile/card-pile.component';
import { DeckService } from 'src/app/deck.service';
import { PointsService } from 'src/app/points.service';
import { ValidationService } from 'src/app/validation.service';
import { ComputerPlayerService } from 'src/app/computer-player.service';
import { CardAnimationService } from 'src/app/card-animation.service';

@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.less']
})
export class GameComponent implements OnInit, OnDestroy {


    private readonly PLAYER_COUNT = 3;
    private readonly DEFAULT_MONEY_CENTS = 128;
    private readonly HAND_DISPLAY_MS = 1000;

    versusComputer = false;

    bidMultiplier = 1;
    // game modes                   = bid
    // point trick game             = 2
    // no tricks                    = 6
    // all tricks                   = 10
    // no tricks show               = 12
    // all tricks show              = 20
    // point trick game (100,40,7)  = 10
    // call trump7 last trick       = 4
    // no call trump7 last trick    = 2
    //
    // * spades adds to the earnings multiplier (doubles)
    // * each point over 10 adds to earnings multiplier (doubles)

    title = 'marias';
    illegalMoveMessage = '';
    winMessage = '';
    activePlayer = 1;
    currentCaller = 1;
    lastTrickPlayer: number;
    canPlayAgain = false;
    showingCompletedHand = false;
    private isDestroyed = false;
    pickingTrump = false;
    buryingCards = false;
    legalCards: string[] = [];

    BACK_CARD = 'assets/cards/back.png';

    deck: Card[];
    trump = '';
    cardPriority: Map<string, number>;
    suitPriority: Map<string, number>;

    // Pile Types include: Game, Player, Win, Bury, Marriage
    allPiles: Map<string, Card[]>;
    playerToMoney: Map<string, number>;

    player1RoundPoints = 0;
    player2RoundPoints = 0;
    player3RoundPoints = 0;

    constructor(private deckService: DeckService,
                private pointsService: PointsService,
                private validationService: ValidationService,
                private computerPlayerService: ComputerPlayerService,
                private cardAnimationService: CardAnimationService,
                private changeDetector: ChangeDetectorRef) {
    }

    ngOnInit(): void {
        this.allPiles = new Map();
        this.playerToMoney = new Map();
        this.playerToMoney.set('player1', this.DEFAULT_MONEY_CENTS);
        this.playerToMoney.set('player2', this.DEFAULT_MONEY_CENTS);
        this.playerToMoney.set('player3', this.DEFAULT_MONEY_CENTS);
        this.setCardPriority();
        this.setSuitPriority();
        this.deckService.preloadCardImages().then(() => this.animateCardMoves(() => this.shuffleDeck(), true));
    }

    ngOnDestroy(): void {
        this.isDestroyed = true;
    }

    // Runs a change to the piles, then animates each card from where it was to where it ended up
    private animateCardMoves(change: () => void, isNewDeal = false): void {
        // the first deal and collecting a hand both run later, by which time this game may have been left
        if (this.isDestroyed) {
            return;
        }

        const positions = isNewDeal ? new Map() : this.cardAnimationService.capturePositions();
        change();
        this.updateLegalCards();
        this.changeDetector.detectChanges();
        this.cardAnimationService.animateFrom(positions);
    }

    private updateLegalCards(): void {
        const isCardToPlay = !this.pickingTrump && !this.buryingCards && !this.showingCompletedHand;
        this.legalCards = isCardToPlay
            ? this.computerPlayerService.getLegalCards(this.allPiles.get('game'), this.getActivePlayerPile(), this.trump)
            : [];
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

    private setSuitPriority(): void {
        this.suitPriority = new Map();
        this.suitPriority.set('S', 1);
        this.suitPriority.set('D', 2);
        this.suitPriority.set('C', 3);
        this.suitPriority.set('H', 4);
    }

    shuffleDeck(): void {
        this.deck = this.deckService.createShuffledDeck();
        this.deal([7, 5, 5]);
        this.pickingTrump = true;
    }

    deal(cardsToDeal: number[]): void {
        for (let i = 0; i < this.PLAYER_COUNT; i++) {
            const newCards = this.deck.splice(0, cardsToDeal[i]);
            const playerPile = this.allPiles.get('player' + this.activePlayer) || [];
            this.allPiles.set('player' + this.activePlayer, this.sortHand(playerPile.concat(newCards)));
            this.setToNextActivePlayer();
        }
    }

    private compareCards(card1: Card, card2: Card): number {
        const suit1 = card1.code.charAt(1);
        const suit2 = card2.code.charAt(1);

        const suitPriority1 = this.suitPriority.get(suit1) || 0;
        const suitPriority2 = this.suitPriority.get(suit2) || 0;

        if (suitPriority1 !== suitPriority2) {
            return suitPriority1 - suitPriority2;
        } else {
            const value1 = this.cardPriority.get(card1.code.charAt(0)) || 0;
            const value2 = this.cardPriority.get(card2.code.charAt(0)) || 0;
            return value2 - value1; // Reversed the order for ascending sorting
        }
    }

    public sortHand(hand: Card[]): Card[] {
        return hand.sort((card1, card2) => this.compareCards(card1, card2));
    }

    isCardInMarriage(cardCode: string): boolean {
        if (cardCode.charAt(0) === 'K' || cardCode.charAt(0) === 'Q') {
            // then check if they have the marriage
            for (const activePlayerCardCode of this.getActivePlayerPile().map(activePlayerCard => activePlayerCard.code)) {
                if (this.isMatchingSuit(activePlayerCardCode, cardCode)) {
                    if ((cardCode.charAt(0) === 'Q' && activePlayerCardCode.charAt(0) === 'K')
                        || (cardCode.charAt(0) === 'K' && activePlayerCardCode.charAt(0) === 'Q')) {
                        console.log('this card is in marriage');
                        return true;
                    }
                }
            }
        }
        return false;
    }

    cardSelected($event: Card): void {
        this.animateCardMoves(() => this.handleCardSelected($event));
    }

    private handleCardSelected($event: Card): void {
        // the completed hand is still on the table, so ignore input until it is collected
        if (this.showingCompletedHand) {
            return;
        }

        console.log('all piles HERE');
        console.log(this.allPiles);

        this.winMessage = '';
        this.illegalMoveMessage = '';

        this.validationService.loadCards(this.allPiles.get('game'), this.getActivePlayerPile(), $event.code, this.trump);

        // card selected must be from active player pile
        if (!this.validationService.isCardFromActivePlayerPile($event.code)) {
            return;
        }

        if (this.pickingTrump) {
            this.pickTrump($event.suit);
            this.buryingCards = true;
            return;
        }

        if (this.buryingCards && this.canBuryCard()) {
            this.buryCard($event);
            return;
        }

        this.illegalMoveMessage = this.validationService.validateMove();

        if (this.illegalMoveMessage === '') {
            // CARD PICKED HERE
            if (this.isCardInMarriage($event.code)) {
                this.removeFromPlayerPile($event.code);
                this.addToPlayerMarriagePile($event);
                this.addToGamePile($event);
            } else {
                this.removeFromPlayerPile($event.code);
                this.addToGamePile($event);
            }

            this.setToNextActivePlayer();

            if (this.isHandComplete()) {
                const winningCard = this.determineRoundWinningCard();
                const winningPlayer = this.determineRoundWinningPlayer(winningCard);

                this.winMessage = 'Player ' + winningPlayer + ' Wins the Hand';

                // player that wins the hand leads the next hand
                this.activePlayer = winningPlayer;
                this.lastTrickPlayer = winningPlayer;

                // leave the completed hand on the table long enough to see the third card
                this.showingCompletedHand = true;
                setTimeout(() => this.animateCardMoves(() => this.collectCompletedHand(winningPlayer)), this.HAND_DISPLAY_MS);
            }
        }
    }

    private collectCompletedHand(winningPlayer: number): void {
        // add to player win pile (which removes from game pile)
        this.addGamePileToPlayerWinPile(winningPlayer);
        this.showingCompletedHand = false;

        if (this.isRoundComplete()) {
            // TODO implement earningsMultiplier
            const { earnings, winMessage } = this.pointsService.calculateEarnings(
                this.allPiles, this.currentCaller, this.lastTrickPlayer, this.bidMultiplier);
            for (let player = 1; player <= 3; player++) {
                const currentMoney = this.playerToMoney.get('player' + player);
                this.playerToMoney.set('player' + player, currentMoney + earnings.get('player' + player));
            }

            this.winMessage = winMessage;
            this.canPlayAgain = true;
        }
    }

    // TODO don't show trump until game mode has been decided.
    //  Game mode is decided after dealing is finished and every player starting with the caller passes (meaning normal tricks)
    //  OR a player calls no-tricks or all-tricks. Anyone is welcome to any mode. (normal tricks < no-tricks < all-tricks)
    // TODO after the game mode is decided, betting can commence. After betting is complete, the game can start.
    pickTrump(suit: string): void {
        if (suit === 'SPADES') {
            this.bidMultiplier++;
        }
        this.trump = suit;
        this.pickingTrump = false;
        this.deal([5, 5, 5]);
    }

    buryCard($event: Card): void {
        this.illegalMoveMessage = this.validationService.validateBuryCard($event.code);
        if (this.illegalMoveMessage !== '') {
            return;
        }
        let playerBuryPile = this.allPiles.get('player' + this.activePlayer + 'Bury');
        if (!playerBuryPile) {
            this.allPiles.set('player' + this.activePlayer + 'Bury', [$event]);
        } else {
            playerBuryPile = playerBuryPile.concat([$event]);
            this.allPiles.set('player' + this.activePlayer + 'Bury', playerBuryPile);
        }
        this.removeFromPlayerPile($event.code);
        console.log(this.allPiles);
        if (this.allPiles.get('player' + this.activePlayer + 'Bury').length === 2) {
            this.buryingCards = false;
        }
    }

    canBuryCard(): boolean {
        return !this.allPiles.get('player' + this.activePlayer + 'Bury')
            || this.allPiles.get('player' + this.activePlayer + 'Bury').length < 2;
    }

    determineRoundWinningCard(): number {
        // assume the first cards wins
        let winningCard = 1;

        // if the first card is not trump, and one of the other two are, then check trump priority
        if (!this.validationService.isTrump(this.allPiles.get('game')[0].code)
            && (this.validationService.isTrump(this.allPiles.get('game')[1].code)
                || this.validationService.isTrump(this.allPiles.get('game')[2].code))) {
            // if the second card is trump, assume it wins until we check the third
            if (this.validationService.isTrump(this.allPiles.get('game')[1].code)) {
                winningCard = 2;
            }
            // if the third card is trump, check if the second card is trump
            if (this.validationService.isTrump(this.allPiles.get('game')[2].code)) {
                // if the third and second cards are trump, then compare priority, else, third card wins
                if (this.validationService.isTrump(this.allPiles.get('game')[1].code)) {
                    if (this.isCardHigherPriority(this.allPiles.get('game')[2].code, this.allPiles.get('game')[1].code)) {
                        winningCard = 3;
                    }
                } else {
                    winningCard = 3;
                }
            }
            // if trump was played as second or third card, then return winning card, no need to check additional priorities
            return winningCard;
        }

        // if the first card is trump or no trump cards were played, assume normal logic from below
        // compare first and second cards if same suit
        if (this.isMatchingSuit(this.allPiles.get('game')[0].code, this.allPiles.get('game')[1].code)) {
            if (this.isCardHigherPriority(this.allPiles.get('game')[1].code, this.allPiles.get('game')[0].code)) {
                winningCard = 2;
            }
            // if third card is same suit, then compare to the current winningCard (could be 1 or 2)
            if (this.isMatchingSuit(this.allPiles.get('game')[0].code, this.allPiles.get('game')[2].code)) {
                if (this.isCardHigherPriority(this.allPiles.get('game')[2].code, this.allPiles.get('game')[winningCard - 1].code)) {
                    winningCard = 3;
                }
            }
            // if the second card isn't able to win, and third card matches suit of first, then compare first and third
        } else if (this.isMatchingSuit(this.allPiles.get('game')[0].code, this.allPiles.get('game')[2].code)) {
            if (this.isCardHigherPriority(this.allPiles.get('game')[2].code, this.allPiles.get('game')[0].code)) {
                winningCard = 3;
            }
        }
        return winningCard;
    }

    determineRoundWinningPlayer(winningCard: number): number {
        const relativePosition = (winningCard + this.activePlayer - 2) % 3;
        return (relativePosition + 3) % 3 + 1;
    }

    isRoundComplete(): boolean {
        return this.allPiles.get('player1').length === 0
            && this.allPiles.get('player2').length === 0
            && this.allPiles.get('player3').length === 0;
    }

    playAgain(): void {
        this.animateCardMoves(() => {
            this.canPlayAgain = false;
            this.winMessage = '';
            this.trump = '';
            this.bidMultiplier = 1;
            this.resetRoundPoints();
            this.allPiles = new Map();
            this.setToNextDealer();
            this.activePlayer = this.currentCaller;
            this.shuffleDeck();
        }, true);
    }

    resetRoundPoints(): void {
        this.player1RoundPoints = 0;
        this.player2RoundPoints = 0;
        this.player3RoundPoints = 0;
    }

    clearGamePile(): void {
        this.allPiles.set('game', []);
    }

    removeFromPlayerPile(cardCode: string): void {
        this.getActivePlayerPile().splice(this.getActivePlayerPile().findIndex((card) => card.code === cardCode), 1);
    }

    addToPlayerMarriagePile(card: Card): void {
        const marriagePile = this.allPiles.get('player' + this.activePlayer + 'Marriage');
        if (!marriagePile) {
            this.allPiles.set('player' + this.activePlayer + 'Marriage', [card]);
        } else {
            marriagePile.push(card);
            this.allPiles.set('player' + this.activePlayer + 'Marriage', marriagePile);
        }
    }

    addToGamePile($event: Card): void {
        const gamePile = this.allPiles.get('game');
        if (!gamePile) {
            this.allPiles.set('game', [$event]);
        } else {
            gamePile.push($event);
            this.allPiles.set('game', gamePile);
        }
    }

    addGamePileToPlayerWinPile(winningPlayer: number): void {
        const winPile = this.allPiles.get('player' + winningPlayer + 'Win') || [];
        this.allPiles.set('player' + winningPlayer + 'Win', winPile.concat(this.allPiles.get('game')));
        this.clearGamePile();
    }

    setToNextActivePlayer(): void {
        if (this.activePlayer === 3) {
            this.activePlayer = 1;
        } else {
            this.activePlayer++;
        }
    }

    setToNextDealer(): void {
        if (this.currentCaller === 3) {
            this.currentCaller = 1;
        } else {
            this.currentCaller++;
        }
    }

    isMatchingSuit(cardCode1: string, cardCode2: string): boolean {
        return cardCode1.charAt(1) === cardCode2.charAt(1);
    }

    isCardHigherPriority(cardCode: string, previousPlayedCardCode: string): boolean {
        return this.cardPriority.get(cardCode.charAt(0)) < this.cardPriority.get(previousPlayedCardCode.charAt(0));
    }

    getActivePlayerPile(): any[] {
        return this.allPiles.get('player' + this.activePlayer);
    }

    isHandComplete(): boolean {
        return this.allPiles.get('game').length === this.PLAYER_COUNT;
    }

    formatCurrency(value: number): string {
        return (value / 100).toFixed(2);
    }
}
