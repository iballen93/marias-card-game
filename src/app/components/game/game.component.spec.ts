import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DeckService } from 'src/app/deck.service';
import { GameComponent } from './game.component';

describe('GameComponent', () => {
  let component: GameComponent;

  const handSizes = () => [1, 2, 3].map(player => component.allPiles.get('player' + player).length);

  const startGame = async () => {
    const fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    spyOn(TestBed.inject(DeckService), 'preloadCardImages').and.returnValue(Promise.resolve());
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GameComponent],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: { mode: 'learning-pc' } } } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    component = TestBed.createComponent(GameComponent).componentInstance;
  });

  it('should take the game mode from the route', async () => {
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
});
