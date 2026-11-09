import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DeckService } from 'src/app/deck.service';
import { GameComponent } from './game.component';

describe('GameComponent', () => {
  let component: GameComponent;
  // the route's data; tests set the mode before starting a game
  let routeData: { mode: string };

  const handSizes = () => [1, 2, 3].map(player => component.allPiles.get('player' + player).length);

  const startGame = async () => {
    const fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    spyOn(TestBed.inject(DeckService), 'preloadCardImages').and.returnValue(Promise.resolve());
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    routeData = { mode: 'learning-solo' };
    await TestBed.configureTestingModule({
      declarations: [GameComponent],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { get data(): any { return routeData; } } } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    component = TestBed.createComponent(GameComponent).componentInstance;
  });

  it('should take the game mode from the route', async () => {
    routeData.mode = 'learning-pc';
    await startGame();
    expect(component.gameMode).toEqual('learning-pc');
  });

  it('should determine the winning player for card 1 when activePlayer is 1', () => {
    component.activePlayer = 1;
    expect(component.determineRoundWinningPlayer(1)).toEqual(1);
  });

  it('should determine the winning player for card 2 when activePlayer is 1', () => {
    component.activePlayer = 1;
    expect(component.determineRoundWinningPlayer(2)).toEqual(2);
  });

  it('should determine the winning player for card 3 when activePlayer is 1', () => {
    component.activePlayer = 1;
    expect(component.determineRoundWinningPlayer(3)).toEqual(3);
  });

  it('should determine the winning player for card 1 when activePlayer is 2', () => {
    component.activePlayer = 2;
    expect(component.determineRoundWinningPlayer(1)).toEqual(2);
  });

  it('should determine the winning player for card 2 when activePlayer is 2', () => {
    component.activePlayer = 2;
    expect(component.determineRoundWinningPlayer(2)).toEqual(3);
  });

  it('should determine the winning player for card 3 when activePlayer is 2', () => {
    component.activePlayer = 2;
    expect(component.determineRoundWinningPlayer(3)).toEqual(1);
  });

  it('should determine the winning player for card 1 when activePlayer is 3', () => {
    component.activePlayer = 3;
    expect(component.determineRoundWinningPlayer(1)).toEqual(3);
  });

  it('should determine the winning player for card 2 when activePlayer is 3', () => {
    component.activePlayer = 3;
    expect(component.determineRoundWinningPlayer(2)).toEqual(1);
  });

  it('should determine the winning player for card 3 when activePlayer is 3', () => {
    component.activePlayer = 3;
    expect(component.determineRoundWinningPlayer(3)).toEqual(2);
  });

  it('should fast play from the deal to the last hand', async () => {
    await startGame();
    component.fastPlayToLastHand();

    expect(handSizes()).toEqual([1, 1, 1]);
    expect(component.allPiles.get('game')).toEqual([]);
    expect(component.trump).not.toBe('');
    expect(component.allPiles.get('player1Bury').length).toBe(2);
    expect(component.canPlayAgain).toBe(false);
    expect(component.canFastPlay()).toBe(false);
  });

  it('should record who played each card and who won every trick', async () => {
    await startGame();
    component.fastPlayToLastHand();

    expect(component.trickHistory.length).toBe(9);
    component.trickHistory.forEach((trick, index) => {
      const players = trick.plays.map(play => play.player);
      expect([...players].sort()).toEqual([1, 2, 3]);
      // each player follows the one before them, and the winner leads the next trick
      expect(players[1]).toBe(players[0] % 3 + 1);
      const next = component.trickHistory[index + 1];
      if (next) {
        expect(next.plays[0].player).toBe(trick.winner);
      }
    });
    expect(component.activePlayer).toBe(component.trickHistory[8].winner);
    const recorded = [].concat(...component.trickHistory.map(trick => trick.plays.map(play => play.card.code))).sort();
    const winPile = (player: number) => (component.allPiles.get('player' + player + 'Win') || []).map(card => card.code);
    const won = [].concat(...[1, 2, 3].map(winPile)).sort();
    expect(recorded).toEqual(won);
  });

  it('should offer fast play until the last hand', async () => {
    await startGame();
    expect(component.canFastPlay()).toBe(true);
  });

  it('should keep a finished trick on the table for 1 second in Solo', fakeAsync(() => {
    const fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    spyOn(TestBed.inject(DeckService), 'preloadCardImages').and.returnValue(Promise.resolve());
    fixture.detectChanges();
    flushMicrotasks();
    const playLegal = () => component.cardSelected(component.getActivePlayerPile().find(c => component.legalCards.includes(c.code)));
    component.cardSelected(component.getActivePlayerPile()[0]);
    [0, 1].forEach(() => component.cardSelected(component.getActivePlayerPile().find(c => !'A0'.includes(c.code.charAt(0)))));
    [0, 1, 2].forEach(playLegal);
    expect(component.showingCompletedHand).toBeTrue();

    tick(999);
    expect(component.allPiles.get('game').length).toBe(3);
    tick(1);
    expect(component.allPiles.get('game').length).toBe(0);
    fixture.destroy();
  }));

  describe('vs PC', () => {
    const PC_MOVE_MS = 1300;
    const HAND_DISPLAY_MS = 2000;
    let fixture;

    const startPcGame = () => {
      routeData.mode = 'learning-pc';
      fixture = TestBed.createComponent(GameComponent);
      component = fixture.componentInstance;
      spyOn(TestBed.inject(DeckService), 'preloadCardImages').and.returnValue(Promise.resolve());
      fixture.detectChanges();
      flushMicrotasks();
    };
    const hand = (player: number) => component.allPiles.get('player' + player);
    const pile = (name: string) => component.allPiles.get(name) || [];

    // Plays your cards when it's your turn and lets time pass otherwise, until the round ends
    const playRoundAsPlayer1 = () => {
      for (let step = 0; step < 500 && !component.canPlayAgain; step++) {
        if (component.activePlayer === 1 && !component.showingCompletedHand) {
          const card = component.buryingCards || component.pickingTrump
            ? hand(1).find(c => !'A0'.includes(c.code.charAt(0)))
            : hand(1).find(c => component.legalCards.includes(c.code));
          component.cardSelected(card);
        } else {
          tick(Math.max(PC_MOVE_MS, HAND_DISPLAY_MS));
        }
      }
    };

    // Same as above for Slow, clicking Next whenever the game waits for it
    const playRoundAsPlayer1WithNext = () => {
      for (let step = 0; step < 500 && !component.canPlayAgain; step++) {
        if (component.waitingForNext && (component.showingCompletedHand || component.activePlayer !== 1)) {
          component.next();
        } else if (component.activePlayer === 1 && !component.showingCompletedHand) {
          const card = component.buryingCards || component.pickingTrump
            ? hand(1).find(c => !'A0'.includes(c.code.charAt(0)))
            : hand(1).find(c => component.legalCards.includes(c.code));
          component.cardSelected(card);
        } else {
          tick(Math.max(PC_MOVE_MS, HAND_DISPLAY_MS));
        }
      }
    };

    it('should label Players 2 and 3 as the PC only in vs PC', fakeAsync(() => {
      startPcGame();
      expect([1, 2, 3].map(player => component.getPlayerTitle(player))).toEqual(['Player 1', 'Player 2 (PC)', 'Player 3 (PC)']);
      component.gameMode = 'learning-solo';
      expect(component.getPlayerTitle(2)).toBe('Player 2');
      fixture.destroy();
    }));

    it('should play a whole round with you as Player 1 and the PC as Players 2 and 3', fakeAsync(() => {
      startPcGame();
      playRoundAsPlayer1();

      expect(component.canPlayAgain).toBeTrue();
      expect(component.trickHistory.length).toBe(10);
      expect([1, 2, 3].reduce((count, player) => count + pile('player' + player + 'Win').length, 0)).toBe(30);
      const pcPlays = component.trickHistory.reduce((count, trick) => count + trick.plays.filter(play => play.player !== 1).length, 0);
      expect(pcPlays).toBe(20);
      fixture.destroy();
    }));

    it('should let the PC pick trump and bury when it is the caller', fakeAsync(() => {
      startPcGame();
      playRoundAsPlayer1();
      component.playAgain();
      expect(component.currentCaller).toBe(2);
      expect(component.pickingTrump).toBeTrue();

      tick(PC_MOVE_MS);
      expect(component.trump).not.toBe('');
      tick(PC_MOVE_MS * 2);
      expect(pile('player2Bury').length).toBe(2);
      expect(pile('player2Bury').some(card => 'A0'.includes(card.code.charAt(0)))).toBeFalse();
      tick(PC_MOVE_MS);
      expect(pile('game').length).toBe(1);
      fixture.destroy();
    }));

    it('should wait before each PC move', fakeAsync(() => {
      startPcGame();
      component.cardSelected(hand(1)[0]);
      [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
      component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));
      expect(component.activePlayer).toBe(2);

      tick(PC_MOVE_MS - 1);
      expect(pile('game').length).toBe(1);
      tick(1);
      expect(pile('game').length).toBe(2);
      fixture.destroy();
    }));

    it('should leave a finished trick on the table for 2 seconds', fakeAsync(() => {
      startPcGame();
      component.cardSelected(hand(1)[0]);
      [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
      component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));
      tick(PC_MOVE_MS * 2);
      expect(pile('game').length).toBe(3);
      expect(component.showingCompletedHand).toBeTrue();

      tick(HAND_DISPLAY_MS - 1);
      expect(pile('game').length).toBe(3);
      tick(1);
      expect(pile('game').length).toBe(0);
      fixture.destroy();
      tick(PC_MOVE_MS);
    }));

    it('should only show the PC its own hand, never the other hands', fakeAsync(() => {
      startPcGame();
      component.cardSelected(hand(1)[0]);
      [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
      component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));

      const pcView = (component as any).getPcView();
      expect(Object.keys(pcView).sort()).toEqual(['bury', 'caller', 'hand', 'phase', 'seat', 'trick', 'tricks', 'trump']);
      expect(pcView.hand).toBe(hand(2));
      // Player 1 is the caller, so Player 2 has no buried cards to know about
      expect(pcView.bury).toEqual([]);
      fixture.destroy();
      tick(PC_MOVE_MS);
    }));

    it('should ignore clicks on cards during the PC turn', fakeAsync(() => {
      startPcGame();
      component.cardSelected(hand(1)[0]);
      [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
      component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));

      const pcCard = hand(2).find(c => component.legalCards.includes(c.code));
      component.cardSelected(pcCard);
      expect(pile('game').length).toBe(1);
      expect(hand(2)).toContain(pcCard);
      tick(PC_MOVE_MS);
      fixture.destroy();
    }));

    it('should wait for Next after every PC move in Slow', fakeAsync(() => {
      startPcGame();
      component.gameMode = 'learning-pc-slow';
      component.cardSelected(hand(1)[0]);
      [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
      component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));

      // Player 2 plays and explains, then nothing happens until Next
      tick(PC_MOVE_MS);
      expect(pile('game').length).toBe(2);
      expect(component.waitingForNext).toBeTrue();
      tick(PC_MOVE_MS * 5);
      expect(pile('game').length).toBe(2);

      // Next lets Player 3 play right away, and the finished trick stays until Next again
      component.next();
      expect(pile('game').length).toBe(3);
      expect(component.showingCompletedHand).toBeTrue();
      tick(HAND_DISPLAY_MS * 5);
      expect(pile('game').length).toBe(3);
      component.next();
      expect(pile('game').length).toBe(0);
      expect(component.trickHistory.length).toBe(1);
      fixture.destroy();
      tick(PC_MOVE_MS);
    }));

    it('should let the PC pick trump, bury and lead one Next at a time in Slow', fakeAsync(() => {
      startPcGame();
      component.gameMode = 'learning-pc-slow';
      playRoundAsPlayer1WithNext();
      component.playAgain();
      expect(component.currentCaller).toBe(2);

      tick(PC_MOVE_MS);
      expect(component.trump).not.toBe('');
      expect(component.waitingForNext).toBeTrue();
      component.next();
      expect(pile('player2Bury').length).toBe(1);
      component.next();
      expect(pile('player2Bury').length).toBe(2);
      expect(pile('game').length).toBe(0);
      component.next();
      expect(pile('game').length).toBe(1);
      fixture.destroy();
      tick(PC_MOVE_MS);
    }));

    it('should not make a PC move after the game is left', fakeAsync(() => {
      startPcGame();
      component.cardSelected(hand(1)[0]);
      [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
      component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));
      fixture.destroy();

      tick(PC_MOVE_MS * 3);
      expect(pile('game').length).toBe(1);
    }));
  });
});
