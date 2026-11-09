import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Card } from 'src/app/components/card-pile/card-pile.component';
import { DeckService } from 'src/app/deck.service';
import { PointsService } from 'src/app/points.service';
import { ValidationService } from 'src/app/validation.service';
import { ComputerPlayerService, PcView } from 'src/app/computer-player.service';
import { CardAnimationService } from 'src/app/card-animation.service';
import { ActivatedRoute } from '@angular/router';
import { DEFAULT_GAME_MODE, GameMode } from 'src/app/game-mode';
import { completesMarriage, trickWinnerIndex, validateBury } from 'src/app/rules';
import { Trick } from 'src/app/trick';

@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.less']
})
export class GameComponent implements OnInit, OnDestroy {


    private readonly PLAYER_COUNT = 3;
    private readonly DEFAULT_MONEY_CENTS = 128;
    // how long a finished trick stays on the table; longer in vs PC, so you can see what the PC played
    private readonly HAND_DISPLAY_MS = 1000;
    private readonly PC_HAND_DISPLAY_MS = 2000;
    // how long the PC waits before each move, so you can follow it
    private readonly PC_MOVE_MS = 1300;
    // in vs PC you are always Player 1
    private readonly HUMAN_SEAT = 1;

    gameMode: GameMode = DEFAULT_GAME_MODE;

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
    private isFastPlaying = false;
    private isDestroyed = false;
    private pcTimer: ReturnType<typeof setTimeout>;
    pickingTrump = false;
    buryingCards = false;
    legalCards: string[] = [];

    BACK_CARD = 'assets/cards/back.png';

    deck: Card[];
    trump = '';
    cardPriority: Map<string, number>;
    suitPriority: Map<string, number>;

    // Every finished trick this round, so the PC can see who played what
    trickHistory: Trick[] = [];

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
                private changeDetector: ChangeDetectorRef,
                private route: ActivatedRoute) {
    }

    ngOnInit(): void {
        this.gameMode = this.route.snapshot.data.mode || DEFAULT_GAME_MODE;
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
        clearTimeout(this.pcTimer);
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
        this.updateRoundPoints();
        this.changeDetector.detectChanges();
        this.cardAnimationService.animateFrom(positions);
        this.schedulePcTurn();
    }

    isPcSeat(player: number): boolean {
        return this.gameMode === 'learning-pc' && player !== this.HUMAN_SEAT;
    }

    getPlayerTitle(player: number): string {
        return 'Player ' + player + (this.isPcSeat(player) ? ' (PC)' : '');
    }

    // After every change to the board: if it's now a PC's move, make it after a short pause
    private schedulePcTurn(): void {
        clearTimeout(this.pcTimer);
        if (this.isPcTurn()) {
            this.pcTimer = setTimeout(() => this.playPcTurn(), this.PC_MOVE_MS);
        }
    }

    private isPcTurn(): boolean {
        return !this.isDestroyed && this.isPcSeat(this.activePlayer) && !this.showingCompletedHand && !this.canPlayAgain
            && !!this.getActivePlayerPile()?.length;
    }

    // Plays the PC's move through the same path as a click, so rules, animations and messages all apply
    playPcTurn(): void {
        if (!this.isPcTurn()) {
            return;
        }
        const view = this.getPcView();
        let card = this.computerPlayerService.chooseMove(view).card;
        if (!this.isPcChoiceAllowed(view, card)) {
            // a PC bug must never freeze the game
            console.error('PC chose a card the rules do not allow', view, card);
            card = this.getFastPlayCard();
        }
        this.animateCardMoves(() => this.handleCardSelected(card));
    }

    private isPcChoiceAllowed(view: PcView, card: Card): boolean {
        if (!card || !view.hand.includes(card)) {
            return false;
        }
        switch (view.phase) {
            case 'trump':
                return true;
            case 'bury':
                return validateBury(card.code) === '';
            default:
                return this.legalCards.includes(card.code);
        }
    }

    private getHandDisplayMs(): number {
        return this.gameMode === 'learning-pc' ? this.PC_HAND_DISPLAY_MS : this.HAND_DISPLAY_MS;
    }

    private getPcView(): PcView {
        return {
            seat: this.activePlayer,
            phase: this.pickingTrump ? 'trump' : this.buryingCards ? 'bury' : 'play',
            hand: this.getActivePlayerPile(),
            trick: this.allPiles.get('game') || [],
            trump: this.trump,
            caller: this.currentCaller,
            tricks: this.trickHistory
        };
    }

    private updateLegalCards(): void {
        const isCardToPlay = !this.pickingTrump && !this.buryingCards && !this.showingCompletedHand;
        this.legalCards = isCardToPlay
            ? this.computerPlayerService.getLegalCards(this.allPiles.get('game'), this.getActivePlayerPile(), this.trump)
            : [];
    }

    private updateRoundPoints(): void {
        // whoever wins the latest hand only keeps the last trick point if that hand was the last one
        const lastTrickPlayer = this.canPlayAgain ? this.lastTrickPlayer : undefined;
        this.player1RoundPoints = this.pointsService.calculatePlayerPoints(this.allPiles, 1, lastTrickPlayer, this.trump);
        this.player2RoundPoints = this.pointsService.calculatePlayerPoints(this.allPiles, 2, lastTrickPlayer, this.trump);
        this.player3RoundPoints = this.pointsService.calculatePlayerPoints(this.allPiles, 3, lastTrickPlayer, this.trump);
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
        return completesMarriage(cardCode, this.getActivePlayerPile().map(card => card.code));
    }

    cardSelected($event: Card): void {
        // in vs PC the PC plays its own cards, so clicks only count on your turn
        if (this.isPcSeat(this.activePlayer)) {
            return;
        }
        this.animateCardMoves(() => this.handleCardSelected($event));
    }

    // For testing: plays by the rules for every player until only the last hand is left
    fastPlayToLastHand(): void {
        this.animateCardMoves(() => {
            this.isFastPlaying = true;
            while (!this.isOnLastHand()) {
                this.handleCardSelected(this.getFastPlayCard());
                this.updateLegalCards();
            }
            this.isFastPlaying = false;
        });
    }

    canFastPlay(): boolean {
        return !this.showingCompletedHand && !this.isOnLastHand();
    }

    private isOnLastHand(): boolean {
        return [1, 2, 3].every(player => (this.allPiles.get('player' + player) || []).length <= 1);
    }

    private getFastPlayCard(): Card {
        let choices: Card[] = this.getActivePlayerPile();
        if (this.buryingCards) {
            choices = choices.filter(card => validateBury(card.code) === '');
        } else if (!this.pickingTrump) {
            choices = choices.filter(card => this.legalCards.includes(card.code));
        }
        return choices[Math.floor(Math.random() * choices.length)];
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
                // all three have played, so the active player is back to the one who led
                this.trickHistory.push({
                    plays: this.allPiles.get('game').map((card, index) => ({ player: (this.activePlayer + index - 1) % 3 + 1, card })),
                    winner: winningPlayer
                });

                this.winMessage = 'Player ' + winningPlayer + ' Wins the Hand';

                // player that wins the hand leads the next hand
                this.activePlayer = winningPlayer;
                this.lastTrickPlayer = winningPlayer;

                if (this.isFastPlaying) {
                    this.collectCompletedHand(winningPlayer);
                } else {
                    // leave the completed hand on the table long enough to see the third card
                    this.showingCompletedHand = true;
                    setTimeout(() => this.animateCardMoves(() => this.collectCompletedHand(winningPlayer)), this.getHandDisplayMs());
                }
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
                this.allPiles, this.currentCaller, this.lastTrickPlayer, this.bidMultiplier, this.trump);
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

    // 1, 2 or 3: the position in the trick of the winning card
    determineRoundWinningCard(): number {
        return trickWinnerIndex(this.allPiles.get('game').map(card => card.code), this.trump) + 1;
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
            this.allPiles = new Map();
            this.trickHistory = [];
            this.setToNextDealer();
            this.activePlayer = this.currentCaller;
            this.shuffleDeck();
        }, true);
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
