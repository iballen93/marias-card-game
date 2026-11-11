import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Card } from 'src/app/components/card-pile/card-pile.component';
import { DeckService } from 'src/app/deck.service';
import { BetResult, PointsService } from 'src/app/points.service';
import { ValidationService } from 'src/app/validation.service';
import { ComputerPlayerService, PcView } from 'src/app/computer-player.service';
import { CardAnimationService } from 'src/app/card-animation.service';
import { ActivatedRoute } from '@angular/router';
import { DEFAULT_GAME_MODE, GameMode, isVsPc } from 'src/app/game-mode';
import { completesMarriage, sevenOfTrump, sevenOnLastTrick, trickWinnerIndex, validateBury } from 'src/app/rules';
import { cardName } from 'src/app/pc-brain';
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
    // why the PC made its last move, shown in vs PC so you can learn from it
    pcExplanation = '';
    activePlayer = 1;
    currentCaller = 1;
    lastTrickPlayer: number;
    canPlayAgain = false;
    showingCompletedHand = false;
    private isFastPlaying = false;
    private isDestroyed = false;
    private pcTimer: ReturnType<typeof setTimeout>;
    // vs PC Slow: after each PC move the game waits for you to click Next
    waitingForNext = false;
    // vs PC Slow: a trick the PC finished stays on the table until Next; this is who won it
    private trickWinnerToCollect: number = null;
    pickingTrump = false;
    buryingCards = false;
    // after burying, a caller holding the 7 of trump plays the Game or calls the 7 as well
    announcing = false;
    sevenCalled = false;
    // the 100 replaces the Game: the caller alone must reach 100
    hundredCalled = false;
    // what the 7 of trump scored on the last trick, if it was played there
    // under the round's result: who pays whom in all, then whether the caller won or lost each bet
    payoutTotal = '';
    betResults: BetResult[] = [];
    // whether the caller won the Game or the 100, which colours the result line
    callerWonRound = false;
    // whether the caller owes money in all, which colours the total red
    callerPays = false;
    legalCards: string[] = [];

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
        return isVsPc(this.gameMode) && player !== this.HUMAN_SEAT;
    }

    // Standard: everything but your own hand, the trick and the marriages is face down
    private isStandard(): boolean {
        return this.gameMode === 'standard';
    }

    isHandHidden(player: number): boolean {
        return this.isStandard() && player !== this.HUMAN_SEAT;
    }

    // You see your own bury while you choose it; it turns face down once the first card is led. The caller never
    // has to show its bury, so the PC's stays face down, even after the round.
    isBuryHidden(player: number): boolean {
        if (!this.isStandard()) {
            return false;
        }
        const firstCardLed = (this.allPiles.get('game') || []).length > 0 || this.trickHistory.length > 0;
        return player !== this.HUMAN_SEAT || firstCardLed;
    }

    // Win piles stay face down, points and all, until the round is over
    isWinHidden(): boolean {
        return this.isStandard() && !this.canPlayAgain;
    }

    // In Learning Mode, the cards the active player may play are lifted; Standard leaves you to work it out
    getLiftedCards(player: number): string[] {
        return !this.isStandard() && player === this.activePlayer ? this.legalCards : [];
    }

    getPlayerTitle(player: number): string {
        return 'Player ' + player + (this.isPcSeat(player) ? ' (PC)' : '');
    }

    // After every change to the board: if it's now a PC's move, make it after a short pause
    private schedulePcTurn(): void {
        clearTimeout(this.pcTimer);
        if (this.isPcTurn() && !this.waitingForNext) {
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
        if (this.announcing) {
            const announcement = this.computerPlayerService.chooseAnnouncement(this.getPcView());
            this.pcExplanation = this.isStandard() ? '' : this.getPlayerTitle(this.activePlayer) + ' ' + announcement.reason;
            this.waitingForNext = this.gameMode === 'learning-pc-slow';
            this.animateCardMoves(() => this.announce(announcement.callSeven, announcement.callHundred));
            return;
        }
        const { card, reason } = this.choosePcCard();
        // the explanations are part of Learning Mode
        this.pcExplanation = this.isStandard() ? '' : this.getPlayerTitle(this.activePlayer) + ' ' + reason;
        this.waitingForNext = this.gameMode === 'learning-pc-slow';
        this.animateCardMoves(() => this.handleCardSelected(card));
    }

    // The active PC's choice, checked against the rules
    private choosePcCard(): { card: Card; reason: string } {
        const view = this.getPcView();
        const choice = this.computerPlayerService.chooseMove(view);
        if (!this.isPcChoiceAllowed(view, choice.card)) {
            // a PC bug must never freeze the game
            console.error('PC chose a card the rules do not allow', view, choice.card);
            return { card: this.getFastPlayCard(), reason: choice.reason };
        }
        return choice;
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
        return isVsPc(this.gameMode) ? this.PC_HAND_DISPLAY_MS : this.HAND_DISPLAY_MS;
    }

    // vs PC Slow: you've read why the PC made its move, so the game carries on
    next(): void {
        if (!this.waitingForNext) {
            return;
        }
        this.waitingForNext = false;
        if (this.trickWinnerToCollect !== null) {
            const winner = this.trickWinnerToCollect;
            this.trickWinnerToCollect = null;
            this.animateCardMoves(() => this.collectCompletedHand(winner));
        } else {
            this.playPcTurn();
        }
    }

    private getPcView(): PcView {
        return {
            seat: this.activePlayer,
            phase: this.pickingTrump ? 'trump' : this.buryingCards ? 'bury' : this.announcing ? 'announce' : 'play',
            hand: this.getActivePlayerPile(),
            trick: this.allPiles.get('game') || [],
            trump: this.trump,
            caller: this.currentCaller,
            bury: this.allPiles.get('player' + this.activePlayer + 'Bury') || [],
            tricks: this.trickHistory
        };
    }

    private updateLegalCards(): void {
        const isCardToPlay = !this.pickingTrump && !this.buryingCards && !this.announcing && !this.showingCompletedHand;
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
        // in vs PC Slow, playing your card also counts as reading the PC's last move
        if (!this.showingCompletedHand) {
            this.waitingForNext = false;
        }
        this.animateCardMoves(() => this.handleCardSelected($event));
    }

    // For testing: plays by the rules for every player until only the last hand is left
    fastPlayToLastHand(): void {
        this.waitingForNext = false;
        // the last explanation would be about a move from before the fast forward
        this.pcExplanation = '';
        this.animateCardMoves(() => {
            this.isFastPlaying = true;
            while (!this.isOnLastHand()) {
                if (this.announcing) {
                    const isPc = this.isPcSeat(this.activePlayer);
                    const choice = isPc ? this.computerPlayerService.chooseAnnouncement(this.getPcView()) : undefined;
                    this.announce(!!choice?.callSeven, !!choice?.callHundred);
                    this.updateLegalCards();
                    continue;
                }
                // in vs PC the PC seats keep playing their strategy; only your cards are picked at random
                this.handleCardSelected(this.isPcSeat(this.activePlayer) ? this.choosePcCard().card : this.getFastPlayCard());
                this.updateLegalCards();
            }
            this.isFastPlaying = false;
        });
    }

    canFastPlay(): boolean {
        // a testing shortcut; Standard offers it for now too, and will stop once testing is done
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
        // and while the caller announces, the cards wait
        if (this.showingCompletedHand || this.announcing) {
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
            // once you play, the PC's last move is old news; a PC's own move keeps the explanation it just set
            if (!this.isPcSeat(this.activePlayer)) {
                this.pcExplanation = '';
            }
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
                } else if (this.waitingForNext) {
                    // vs PC Slow: the PC played the last card, so the trick stays until you click Next
                    this.showingCompletedHand = true;
                    this.trickWinnerToCollect = winningPlayer;
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
        // the explanation was about a card in this trick, which is now off the table
        this.pcExplanation = '';

        if (this.isRoundComplete()) {
            // TODO implement earningsMultiplier
            const { earnings, winMessage, betResult } = this.pointsService.calculateEarnings(
                this.allPiles, this.currentCaller, this.lastTrickPlayer, this.trump, this.hundredCalled);
            for (let player = 1; player <= 3; player++) {
                const currentMoney = this.playerToMoney.get('player' + player);
                this.playerToMoney.set('player' + player, currentMoney + earnings.get('player' + player));
            }

            this.winMessage = winMessage;
            this.callerWonRound = betResult.won;
            // the result line already says whether the Game was won, so only the 100 gets a line of its own
            this.betResults = this.hundredCalled ? [betResult] : [];
            const sevenEarnings = this.scoreSevenOfTrump();
            const caller = 'player' + this.currentCaller;
            // the caller collects from, or pays, both defenders together, so each defender's share is half
            const callerTotal = earnings.get(caller) + (sevenEarnings ? sevenEarnings.get(caller) : 0);
            this.payoutTotal = this.pointsService.describePayment(callerTotal / 2, this.currentCaller);
            this.callerPays = callerTotal < 0;
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
            // the caller chooses the Game or the 100, and the 7 of trump too when holding it
            this.announcing = true;
        }
    }

    // Pays out the 7 of trump if it was played in the last trick, on top of the game, and returns what it paid
    private scoreSevenOfTrump(): Map<string, number> | undefined {
        const lastTrick = this.trickHistory[this.trickHistory.length - 1];
        const plays = (lastTrick?.plays || []).map(play => ({ player: play.player, card: play.card.code }));
        const seven = sevenOnLastTrick({ plays, winner: lastTrick?.winner }, this.trump, this.currentCaller, this.sevenCalled);
        if (!seven) {
            return undefined;
        }
        const { earnings, betResult } = this.pointsService.calculateSevenEarnings(seven, this.currentCaller);
        earnings.forEach((cents, player) => this.playerToMoney.set(player, this.playerToMoney.get(player) + cents));
        this.betResults.push(betResult);
        return earnings;
    }

    // The Game or the 100, each with or without the 7 of trump. Called by the caller's buttons, or by the PC.
    announce(callSeven: boolean, callHundred = false): void {
        if (!this.announcing) {
            return;
        }
        // only a caller holding the 7 of trump can call it
        this.sevenCalled = callSeven && this.holdsSevenOfTrump();
        this.hundredCalled = callHundred;
        this.announcing = false;
    }

    // The buttons only work for a caller you are playing
    announceFromButton(choice: { seven: boolean; hundred: boolean }): void {
        if (this.isPcSeat(this.activePlayer)) {
            return;
        }
        this.animateCardMoves(() => this.announce(choice.seven, choice.hundred));
    }

    holdsSevenOfTrump(): boolean {
        return !!this.trump && (this.getActivePlayerPile() || []).some(card => card.code === sevenOfTrump(this.trump));
    }

    // the 7 of trump as players say it, such as 7♥
    getSevenName(): string {
        return this.trump ? cardName(sevenOfTrump(this.trump)) : '';
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
            this.pcExplanation = '';
            this.announcing = false;
            this.sevenCalled = false;
            this.hundredCalled = false;
            this.payoutTotal = '';
            this.betResults = [];
            this.waitingForNext = false;
            this.trickWinnerToCollect = null;
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
