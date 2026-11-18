import { defendersInOrder, isDefendersRaise, MAX_RAISES, raisableBets, raiseMultiplier, raiseName, startRaiseTracks } from './raising';

describe('raising the stakes', () => {
  it('should name the six raises in order', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(raiseName)).toEqual(['', 'Kontra', 'Re', 'Supre', 'Kontra More', 'Re More', 'Supre More']);
    expect(MAX_RAISES).toBe(6);
  });

  it('should double the bet with every raise', () => {
    expect([0, 1, 2, 6].map(raiseMultiplier)).toEqual([1, 2, 4, 64]);
  });

  it('should give the defenders the 1st, 3rd and 5th raises, and the caller the others', () => {
    expect([0, 1, 2, 3, 4, 5].map(isDefendersRaise)).toEqual([true, false, true, false, true, false]);
  });

  it('should only let a called 7 be raised', () => {
    expect(raisableBets(startRaiseTracks(false), true)).toEqual(['game']);
    expect(raisableBets(startRaiseTracks(true), true)).toEqual(['game', 'seven']);
    expect(raisableBets(startRaiseTracks(true), false)).toEqual([]);
  });

  it('should hand each bet to the other side after a raise, and stop it once passed or raised six times', () => {
    const tracks = startRaiseTracks(true);
    tracks.game.level = 1;
    expect(raisableBets(tracks, true)).toEqual(['seven']);
    expect(raisableBets(tracks, false)).toEqual(['game']);
    tracks.seven.open = false;
    tracks.game.level = 6;
    expect(raisableBets(tracks, true)).toEqual([]);
    expect(raisableBets(tracks, false)).toEqual([]);
  });

  it('should let the defender who plays after the caller speak first', () => {
    expect(defendersInOrder(1)).toEqual([2, 3]);
    expect(defendersInOrder(2)).toEqual([3, 1]);
    expect(defendersInOrder(3)).toEqual([1, 2]);
  });
});
