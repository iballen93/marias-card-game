import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Card } from 'src/app/components/card-pile/card-pile.component';
import { GameComponent } from 'src/app/components/game/game.component';
import { DeckService } from 'src/app/deck.service';
import { REGRESSION_BASELINE } from './regression-baseline';
import { fingerprint, seededRandom } from './seeded-random';

// Plays the same seeded random games every run, through the real game, and compares every round with a saved baseline.
// A change that should not affect the rules (a refactor, the menu, layout, the PC in other modes) must keep every
// fingerprint the same. See REGRESSION-TESTING.md for when and how to update the baseline.
describe('Game regression', () => {
  const GAMES = 1000;
  const ROUNDS_PER_GAME = 3; // one round with each player as caller
  const START_MONEY = 128;

  const codes = (cards: Card[]) => (cards || []).map(card => card.code).join(',');

  const playRound = (game: any, plays: string[]) => {
    // collects each finished trick at once instead of leaving it on the table for a second
    game.isFastPlaying = true;
    while (!game.canPlayAgain) {
      game.updateLegalCards();
      game.handleCardSelected(game.getFastPlayCard());
    }
    game.isFastPlaying = false;
    const piles: Map<string, Card[]> = game.allPiles;
    const players = [1, 2, 3];
    const roundLine = [
      'trump=' + game.trump,
      'caller=' + game.currentCaller,
      'bury=' + codes(piles.get('player' + game.currentCaller + 'Bury')),
      'plays=' + plays.join(' '),
      ...players.map(p => 'win' + p + '=' + codes(piles.get('player' + p + 'Win'))),
      ...players.map(p => 'marriage' + p + '=' + codes(piles.get('player' + p + 'Marriage'))),
      'points=' + [game.player1RoundPoints, game.player2RoundPoints, game.player3RoundPoints].join(','),
      'money=' + players.map(p => game.playerToMoney.get('player' + p)).join(','),
      'message=' + game.winMessage
    ].join(' | ');

    // rules that must always hold, whatever the baseline says
    const won = players.reduce((count, p) => count + (piles.get('player' + p + 'Win') || []).length, 0);
    const bury = piles.get('player' + game.currentCaller + 'Bury') || [];
    expect(won).withContext('cards won ' + roundLine).toBe(30);
    expect(bury.length).withContext('cards buried ' + roundLine).toBe(2);
    expect(bury.some(card => 'A0'.includes(card.code.charAt(0)))).withContext('point card buried ' + roundLine).toBeFalse();
    const money = players.reduce((total, p) => total + game.playerToMoney.get('player' + p), 0);
    expect(money).withContext('money created or lost ' + roundLine).toBe(START_MONEY * 3);
    return roundLine;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GameComponent],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: { mode: 'learning-solo' } } } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    spyOn(TestBed.inject(DeckService), 'preloadCardImages').and.returnValue(new Promise(() => {}));
  });

  it('should play every seeded game exactly as the baseline recorded it', async () => {
    // the game logs every move; keep the console for this test's own report
    const log = console.log.bind(console);
    spyOn(console, 'log');
    const random = spyOn(Math, 'random');
    const hashes: string[] = [];
    const gameLines: string[][] = [];

    for (let seed = 1; seed <= GAMES; seed++) {
      random.and.callFake(seededRandom(seed));
      const fixture = TestBed.createComponent(GameComponent);
      const game: any = fixture.componentInstance;
      fixture.detectChanges();

      const plays: string[] = [];
      const addToGamePile = game.addToGamePile.bind(game);
      game.addToGamePile = (card: Card) => {
        plays.push(game.activePlayer + ':' + card.code);
        addToGamePile(card);
      };

      game.shuffleDeck();
      const lines: string[] = [];
      for (let round = 0; round < ROUNDS_PER_GAME; round++) {
        if (round > 0) {
          game.playAgain();
        }
        plays.length = 0;
        lines.push(playRound(game, plays));
      }
      hashes.push(fingerprint(lines.join('\n')));
      gameLines.push(lines);
      fixture.destroy();
      // lets the test browser answer the test runner between games
      await new Promise(resolve => setTimeout(resolve));
    }

    // read by scripts/regression-baseline.js to save a new baseline
    log('REGRESSION_HASHES=' + JSON.stringify(hashes));

    if (!REGRESSION_BASELINE.length) {
      fail('No regression baseline yet. Run: npm run regression:baseline');
      return;
    }
    expect(hashes.length).toBe(REGRESSION_BASELINE.length);
    const changed = hashes.map((hash, index) => hash === REGRESSION_BASELINE[index] ? 0 : index + 1).filter(seed => seed);
    if (changed.length) {
      log('REGRESSION first changed game, seed ' + changed[0] + ':\n' + gameLines[changed[0] - 1].join('\n'));
    }
    expect(changed).withContext(changed.length + ' of ' + GAMES + ' games played differently (seeds)').toEqual([]);
  }, 10 * 60 * 1000);
});
