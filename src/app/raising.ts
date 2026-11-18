// Raising the stakes, after the caller's bid and before the first card is led.
// Each announced bet has its own track: the Game (or the called 100, which replaces it) and a called 7 of trump.
// A silent 7 can't be raised, since nobody knows about it yet.
// Every raise doubles that bet. The defenders make the 1st, 3rd and 5th raises and the caller the 2nd, 4th and 6th.
// A defender's raise counts for both defenders. On the defenders' turn, the defender who plays after the caller speaks
// first, and the other one only gets a say on a bet the first one passed. A side that passes a bet ends that bet's track.

export type RaiseBet = 'game' | 'seven';

export const RAISE_BETS: RaiseBet[] = ['game', 'seven'];

export const RAISE_NAMES = ['Kontra', 'Re', 'Supre', 'Kontra More', 'Re More', 'Supre More'];
export const MAX_RAISES = RAISE_NAMES.length;

export interface RaiseTrack {
    // how many times it has been raised
    level: number;
    // false once the side whose turn it was passed it, or for a bet that was never announced
    open: boolean;
}

export type RaiseTracks = Record<RaiseBet, RaiseTrack>;

export function startRaiseTracks(sevenCalled: boolean): RaiseTracks {
    return { game: { level: 0, open: true }, seven: { level: 0, open: sevenCalled } };
}

// the defenders raise from 0, 2 and 4 raises, the caller from 1, 3 and 5
export function isDefendersRaise(level: number): boolean {
    return level % 2 === 0;
}

// The bets one side may raise now
export function raisableBets(tracks: RaiseTracks, defenders: boolean): RaiseBet[] {
    return RAISE_BETS.filter(bet => {
        const { open, level } = tracks[bet];
        return open && level < MAX_RAISES && isDefendersRaise(level) === defenders;
    });
}

// The name of the raise a bet is on: '' before any raise
export function raiseName(level: number): string {
    return level > 0 ? RAISE_NAMES[level - 1] : '';
}

export function raiseMultiplier(level: number): number {
    return 2 ** level;
}

// The two defenders, in the order they speak: the one who plays after the caller first
export function defendersInOrder(caller: number): number[] {
    const first = caller % 3 + 1;
    return [first, first % 3 + 1];
}
