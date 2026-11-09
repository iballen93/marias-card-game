import * as pc from '../pc-brain';
import { measure, playRound, RANDOM_BRAIN } from './pc-strength';
import { seededRandom } from './seeded-random';

// A quick check that the strength simulation works and the PC still clearly beats random play.
// For the full report, run `npm run strength` (see "Measuring strength" in PC-STRATEGY.md).
describe('PC strength simulation', () => {
  beforeEach(() => spyOn(Math, 'random').and.callFake(seededRandom(1)));

  it('should score every point in a round', () => {
    for (let round = 0; round < 50; round++) {
      const result = playRound(round, pc, pc);
      // 8 point cards and the last trick, plus any marriages, which are worth 2 or 4
      const total = result.callerPoints + result.defenderPoints;
      expect(total).toBeGreaterThanOrEqual(9);
      expect((total - 9) % 2).toBe(0);
      expect(result.callerWins).toBe(result.callerPoints > result.defenderPoints);
    }
  });

  it('should show the PC as caller beating random defenders far more often than a random caller does', () => {
    const pcCaller = measure('PC', pc, 'random', RANDOM_BRAIN, 300);
    const randomCaller = measure('random', RANDOM_BRAIN, 'random', RANDOM_BRAIN, 300);
    expect(pcCaller.callerWinPercent).toBeGreaterThan(randomCaller.callerWinPercent + 15);
  });
});
