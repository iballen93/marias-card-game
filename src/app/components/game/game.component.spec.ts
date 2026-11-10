import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DeckService } from 'src/app/deck.service';
import { ComputerPlayerService } from 'src/app/computer-player.service';
import { GameComponent } from './game.component';

describe('GameComponent', () => {
  let component: GameComponent;
  // the route's data; tests set the mode before starting a game
  let routeData: { mode: string };

  const handSizes = () => [1, 2, 3].map(player => component.allPiles.get('player' + player).length);
  // the deal may give the caller the 7 of trump, which brings the Game or Game + 7 question before the first card
  // the caller's announcement buttons
  const GAME = { seven: false, hundred: false };
  const GAME_AND_SEVEN = { seven: true, hundred: false };
  const announceIfAsked = () => component.announcing && component.announceFromButton(GAME);

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
    announceIfAsked();
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
        if (component.announcing && component.activePlayer === 1) {
          component.announceFromButton(GAME);
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

    // Same as above for Slow, clicking Next whenever the game waits for it
    const playRoundAsPlayer1WithNext = () => {
      for (let step = 0; step < 500 && !component.canPlayAgain; step++) {
        if (component.waitingForNext && (component.showingCompletedHand || component.activePlayer !== 1)) {
          component.next();
        } else if (component.announcing && component.activePlayer === 1) {
          component.announceFromButton(GAME);
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
      // it announces the Game or the 100 before leading
      tick(PC_MOVE_MS);
      expect(component.announcing).toBeFalse();
      expect(pile('game').length).toBe(0);
      tick(PC_MOVE_MS);
      expect(pile('game').length).toBe(1);
      fixture.destroy();
    }));

    it('should wait before each PC move', fakeAsync(() => {
      startPcGame();
      component.cardSelected(hand(1)[0]);
      [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
      announceIfAsked();
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
      announceIfAsked();
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
      announceIfAsked();
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
      announceIfAsked();
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
      announceIfAsked();
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
      // it announces the Game or the 100, then leads: one Next each
      component.next();
      expect(pile('game').length).toBe(0);
      expect(component.pcExplanation).toMatch(/the Game|the 100/);
      component.next();
      expect(pile('game').length).toBe(1);
      fixture.destroy();
      tick(PC_MOVE_MS);
    }));

    it('should fast play the PC seats with the PC strategy and only your cards at random', fakeAsync(() => {
      startPcGame();
      const service = TestBed.inject(ComputerPlayerService);
      const seats: number[] = [];
      spyOn(service, 'chooseMove').and.callFake(view => {
        seats.push(view.seat);
        return (service.chooseMove as any).and.originalFn.call(service, view);
      });
      component.pcExplanation = 'an older move';
      component.fastPlayToLastHand();

      expect(handSizes()).toEqual([1, 1, 1]);
      const pcPlays = component.trickHistory.reduce((count, trick) => count + trick.plays.filter(play => play.player !== 1).length, 0);
      expect(pcPlays).toBe(18);
      // Player 1 is the caller, so the PC only played cards: one choice for each of its plays, and never for Player 1
      expect(seats.length).toBe(pcPlays);
      expect(seats.every(seat => seat !== 1)).toBeTrue();
      expect(component.pcExplanation).toBe('');
      fixture.destroy();
      tick(PC_MOVE_MS);
    }));

    describe('the 7 of trump', () => {
      // Moves the 7 of trump into, or out of, a player's hand, swapping it for a low card, so the deal doesn't decide the test
      const giveSeven = (player: number, holds: boolean) => {
        const seven = '7' + component.trump.charAt(0);
        const owner = [1, 2, 3].find(other => hand(other).some(c => c.code === seven));
        const target = holds ? player : [1, 2, 3].find(other => other !== player);
        if (!owner || owner === target) {
          return;
        }
        const from = hand(owner);
        const to = hand(target);
        const sevenCard = from.find(c => c.code === seven);
        const swap = to.find(c => !'A0'.includes(c.code.charAt(0)) && c.code.charAt(1) !== seven.charAt(1));
        from.splice(from.indexOf(sevenCard), 1, swap);
        to.splice(to.indexOf(swap), 1, sevenCard);
      };
      const buryLow = (player: number) => [0, 1].forEach(() => component.cardSelected(
        hand(player).find(c => !'A0'.includes(c.code.charAt(0)) && c.code !== '7' + component.trump.charAt(0))));

      it('should ask the caller holding it to play the Game or call the 7, and wait for the answer', fakeAsync(() => {
        startPcGame();
        component.cardSelected(hand(1)[0]);
        giveSeven(1, true);
        buryLow(1);
        expect(component.announcing).toBeTrue();
        expect(component.legalCards).toEqual([]);
        component.cardSelected(hand(1)[0]);
        expect(pile('game').length).toBe(0);

        component.announceFromButton(GAME_AND_SEVEN);
        expect(component.announcing).toBeFalse();
        expect(component.sevenCalled).toBeTrue();
        expect(component.legalCards.length).toBeGreaterThan(0);
        fixture.destroy();
      }));

      it('should ask every caller about the 100, but only offer the 7 to a caller holding it', fakeAsync(() => {
        startPcGame();
        component.cardSelected(hand(1)[0]);
        giveSeven(1, false);
        buryLow(1);
        expect(component.announcing).toBeTrue();
        expect(component.holdsSevenOfTrump()).toBeFalse();
        component.announceFromButton({ seven: true, hundred: true });
        expect(component.hundredCalled).toBeTrue();
        expect(component.sevenCalled).toBeFalse();
        fixture.destroy();
      }));

      it('should let the PC caller decide and explain it', fakeAsync(() => {
        startPcGame();
        playRoundAsPlayer1();
        component.playAgain();
        tick(PC_MOVE_MS);
        giveSeven(2, true);
        tick(PC_MOVE_MS * 2);
        expect(component.announcing).toBeTrue();
        // your buttons don't answer for the PC
        component.announceFromButton(GAME_AND_SEVEN);
        expect(component.announcing).toBeTrue();
        tick(PC_MOVE_MS);
        expect(component.announcing).toBeFalse();
        expect(component.pcExplanation).toContain('the 7');
        fixture.destroy();
        tick(PC_MOVE_MS);
      }));

      it('should show the total paid, then each bet won or lost, after a missed 100 with a won 7 in spades', async () => {
        await startGame();
        const cards = (...codes: string[]) => codes.map(code => ({ code, image: '', suit: '' }));
        [1, 2, 3].forEach(player => {
          component.allPiles.set('player' + player, []);
          component.playerToMoney.set('player' + player, 128);
        });
        component.allPiles.set('game', []);
        // Player 1 called the 100 and the 7 of spades, then took 3 points to 6, with the 7 winning the last trick
        component.allPiles.set('player1Win', cards('AC', '0D', '7S', '8H', '9H'));
        component.allPiles.set('player2Win', cards('AH', '0H', '0S', 'AD', '8C', '9C'));
        component.allPiles.set('player3Win', cards('AS', '0C', '8D'));
        component.trump = 'SPADES';
        component.currentCaller = 1;
        component.lastTrickPlayer = 1;
        component.hundredCalled = true;
        component.sevenCalled = true;
        component.trickHistory = [{ plays: cards('8H', '7S', '9H').map((card, index) => ({ player: [2, 1, 3][index], card })), winner: 1 }];
        (component as any).collectCompletedHand(1);
        expect(component.winMessage).toBe('Player 1 lost: 3 to 6');
        expect(component.payoutTotal).toBe('Player 1 pays Players 2 and 3 8¢ each');
        expect(component.betResults.map(bet => bet.text)).toEqual(['Player 1 lost the Called 100: 3 to 6', 'Player 1 won the Called 7♠']);
        expect(component.callerWonRound).toBeFalse();
        expect([1, 2, 3].map(player => component.playerToMoney.get('player' + player))).toEqual([112, 136, 136]);
      });

      it('should leave out a line for the Game, since the result above it already says who won', async () => {
        const cards = (...codes: string[]) => codes.map(code => ({ code, image: '', suit: '' }));
        await startGame();
        [1, 2, 3].forEach(player => component.allPiles.set('player' + player, []));
        component.allPiles.set('game', []);
        component.allPiles.set('player1Win', cards('AC', '0D'));
        component.allPiles.set('player2Win', cards('AH', '0H', 'AS'));
        component.allPiles.set('player3Win', cards('0S', '8D'));
        component.trump = 'HEARTS';
        component.currentCaller = 1;
        component.lastTrickPlayer = 2;
        component.trickHistory = [{ plays: cards('8H', '9C', '9H').map((card, index) => ({ player: [2, 1, 3][index], card })), winner: 2 }];
        (component as any).collectCompletedHand(2);
        expect(component.winMessage).toBe('Player 1 lost: 2 to 5');
        expect(component.betResults).toEqual([]);
        expect(component.payoutTotal).toBe('Player 1 pays Players 2 and 3 2¢ each');
      });

      it('should start the next round without a called 7', fakeAsync(() => {
        startPcGame();
        component.sevenCalled = true;
        component.hundredCalled = true;
        component.payoutTotal = 'something';
        component.betResults = [{ text: 'something', won: true }];
        playRoundAsPlayer1();
        component.playAgain();
        expect(component.sevenCalled).toBeFalse();
        expect(component.hundredCalled).toBeFalse();
        expect(component.payoutTotal).toBe('');
        expect(component.betResults).toEqual([]);
        fixture.destroy();
        tick(PC_MOVE_MS * 4);
      }));
    });

    describe('Standard', () => {
      const buryAndLead = () => {
        component.cardSelected(hand(1)[0]);
        [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
        announceIfAsked();
      };

      it('should keep the PC hands face down, and yours face up', fakeAsync(() => {
        startPcGame();
        component.gameMode = 'standard';
        expect([1, 2, 3].map(player => component.isHandHidden(player))).toEqual([false, true, true]);
        fixture.destroy();
      }));

      it('should show your bury while you choose it, and turn it face down once the first card is led', fakeAsync(() => {
        startPcGame();
        component.gameMode = 'standard';
        buryAndLead();
        expect(pile('player1Bury').length).toBe(2);
        expect(component.isBuryHidden(1)).toBeFalse();
        component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));
        expect(component.isBuryHidden(1)).toBeTrue();
        fixture.destroy();
        tick(PC_MOVE_MS);
      }));

      it('should hide the win piles until the round is over, but never the buries', fakeAsync(() => {
        startPcGame();
        component.gameMode = 'standard';
        expect(component.isWinHidden()).toBeTrue();
        playRoundAsPlayer1();
        expect(component.isWinHidden()).toBeFalse();
        expect(component.isBuryHidden(1)).toBeTrue();
        component.playAgain();
        // Player 2 calls the next round; its bury is never shown
        tick(PC_MOVE_MS * 3);
        expect(pile('player2Bury').length).toBe(2);
        expect(component.isBuryHidden(2)).toBeTrue();
        fixture.destroy();
        tick(PC_MOVE_MS);
      }));

      it('should not lift legal cards or explain PC moves', fakeAsync(() => {
        startPcGame();
        component.gameMode = 'standard';
        buryAndLead();
        component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));
        tick(PC_MOVE_MS);
        expect(pile('game').length).toBe(2);
        expect(component.pcExplanation).toBe('');
        expect([1, 2, 3].every(player => component.getLiftedCards(player).length === 0)).toBeTrue();
        fixture.destroy();
        tick(PC_MOVE_MS);
      }));
    });

    it('should not make a PC move after the game is left', fakeAsync(() => {
      startPcGame();
      component.cardSelected(hand(1)[0]);
      [0, 1].forEach(() => component.cardSelected(hand(1).find(c => !'A0'.includes(c.code.charAt(0)))));
      announceIfAsked();
      component.cardSelected(hand(1).find(c => component.legalCards.includes(c.code)));
      fixture.destroy();

      tick(PC_MOVE_MS * 3);
      expect(pile('game').length).toBe(1);
    }));
  });
});
