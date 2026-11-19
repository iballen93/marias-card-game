// The game's rules as plain functions on card codes ('AS' = Ace of Spades, '0H' = 10 of Hearts).
// They never touch the page or any shared state, so the PC can use them to think ahead.

export const ILLEGAL_MOVES = {
    MUST_FOLLOW_SUIT: 'If possible, card must follow suit.',
    MUST_OVERRIDE: 'If possible, when following suit, card must be higher than previously played.',
    MUST_TRUMP: 'If possible, card must be trump when unable to follow suit.',
    MUST_OVER_TRUMP: 'If possible, card must be higher than the trump already played.',
    BURY_POINTS: 'Point cards can not be buried.'
};

// Strongest first
const RANKS = 'A0KQJ987';
// No Tricks and All Tricks have no trump, and the 10 sits in its natural place
const NO_TRUMP_RANKS = 'AKQJ0987';

// What the game stores as the trump in No Tricks and All Tricks, so no card is ever trump
export const NO_TRUMP = 'NONE';

export function rankOf(code: string): string {
    return code.charAt(0);
}

export function suitOf(code: string): string {
    return code.charAt(1);
}

// Higher is stronger: 7 = 0 up to A = 7. Without trump the 10 drops below the J.
export function rankStrength(code: string, trump = ''): number {
    const ranks = trump === NO_TRUMP ? NO_TRUMP_RANKS : RANKS;
    return ranks.length - 1 - ranks.indexOf(rankOf(code));
}

// trump is the suit's full name, as the game stores it ('HEARTS')
export function isTrump(code: string, trump: string): boolean {
    return !!trump && suitOf(code) === trump.charAt(0);
}

export function isSameSuit(code1: string, code2: string): boolean {
    return suitOf(code1) === suitOf(code2);
}

// Only compares rank; callers check the suit
export function isHigherRank(code: string, other: string, trump = ''): boolean {
    return rankStrength(code, trump) > rankStrength(other, trump);
}

export function isPointCard(code: string): boolean {
    return rankOf(code) === 'A' || rankOf(code) === '0';
}

// Points don't count in No Tricks and All Tricks, so a player taking one of them over may bury any card
export function validateBury(code: string, contract: Contract = 'game'): string {
    return contract === 'game' && isPointCard(code) ? ILLEGAL_MOVES.BURY_POINTS : '';
}

// The card a follower has to beat in suit: the lead, or the second card if it went over the lead in suit
function cardToBeatInSuit(trick: string[], trump: string): string {
    const [lead, second] = trick;
    return second && isSameSuit(second, lead) && isHigherRank(second, lead, trump) ? second : lead;
}

// Returns '' for a legal play, or the rule it breaks
export function validateMove(trick: string[], hand: string[], card: string, trump: string): string {
    if (!trick?.length) {
        return '';
    }
    const toBeat = cardToBeatInSuit(trick, trump);
    if (hand.some(handCard => isSameSuit(handCard, toBeat))) {
        if (!isSameSuit(card, toBeat)) {
            return ILLEGAL_MOVES.MUST_FOLLOW_SUIT;
        }
        // a second card trump already wins over the lead suit, so the third card only has to follow suit
        const trumpedSecond = trick.length === 2 && !isTrump(trick[0], trump) && isTrump(trick[1], trump);
        const canGoOver = !trumpedSecond && hand.some(handCard => isSameSuit(handCard, toBeat) && isHigherRank(handCard, toBeat, trump));
        return canGoOver && !isHigherRank(card, toBeat, trump) ? ILLEGAL_MOVES.MUST_OVERRIDE : '';
    }
    if (hand.some(handCard => isTrump(handCard, trump))) {
        if (!isTrump(card, trump)) {
            return ILLEGAL_MOVES.MUST_TRUMP;
        }
        const trumpToBeat = trick.find(played => isTrump(played, trump));
        const canGoOver = trumpToBeat && hand.some(handCard => isTrump(handCard, trump) && isHigherRank(handCard, trumpToBeat));
        return canGoOver && !isHigherRank(card, trumpToBeat) ? ILLEGAL_MOVES.MUST_OVER_TRUMP : '';
    }
    return '';
}

export function getLegalCards(trick: string[], hand: string[], trump: string): string[] {
    return hand.filter(card => validateMove(trick, hand, card, trump) === '');
}

// Which card in the trick wins it, counting from 0: the highest trump, or else the highest card of the lead suit
export function trickWinnerIndex(trick: string[], trump: string): number {
    let winner = 0;
    trick.forEach((card, index) => {
        const best = trick[winner];
        const beatsBest = isTrump(card, trump) && !isTrump(best, trump)
            || isSameSuit(card, best) && isHigherRank(card, best, trump);
        if (beatsBest) {
            winner = index;
        }
    });
    return winner;
}

// Playing a K or Q while still holding the other one scores a marriage
export function completesMarriage(card: string, hand: string[]): boolean {
    const partner = { K: 'Q', Q: 'K' }[rankOf(card)];
    return !!partner && hand.includes(partner + suitOf(card));
}

export function marriagePoints(card: string, trump: string): number {
    return isTrump(card, trump) ? 4 : 2;
}

// The game and the 100 are one contract: the caller either plays the Game, or calls the 100, which replaces it.
// Each is paid by every defender to the caller (or by the caller to every defender), and spades doubles either.
export const GAME_CENTS = 2;
export const HUNDRED_CENTS = 8;
// 100 in the usual counting, where each A, 10 and the last trick are 10; here they are 1
export const HUNDRED_POINTS = 10;

// What each defender pays the caller; negative when the caller pays each defender.
// The Game: whoever has more points wins it. A side reaching 100 without calling it (a silent 100) doubles the Game,
// and it doubles again for every 10 over 100. A called 100: the caller alone must reach 100, and the win doubles for
// every 10 over 100; a miss loses the 100's value once.
export function contractCents(callerPoints: number, defenderPoints: number, trump: string, hundredCalled: boolean): number {
    const spades = trump === 'SPADES' ? 2 : 1;
    if (hundredCalled) {
        return callerPoints >= HUNDRED_POINTS
            ? HUNDRED_CENTS * spades * 2 ** (callerPoints - HUNDRED_POINTS)
            : -HUNDRED_CENTS * spades;
    }
    const best = Math.max(callerPoints, defenderPoints);
    // 100 doubles the Game, 110 doubles it again, and so on
    const silentHundred = best >= HUNDRED_POINTS ? 2 ** (best - HUNDRED_POINTS + 1) : 1;
    return (callerPoints > defenderPoints ? 1 : -1) * GAME_CENTS * spades * silentHundred;
}

// The 7 of trump scores when it is played in the last trick: won if it takes that trick, lost if it is beaten.
// It is worth 2 cents from each opponent, doubled when the caller called it, and doubled again in spades.
export const SEVEN_CENTS = 2;

export function sevenOfTrump(trump: string): string {
    return '7' + trump.charAt(0);
}

export interface SevenResult {
    // the 7 of trump, and the player it belongs to
    card: string;
    player: number;
    won: boolean;
    called: boolean;
    // false for a called 7 that was played before the last trick, which counts as lost
    playedLast: boolean;
    // paid by, or to, each opponent of the player's side
    cents: number;
}

// A silent 7 only scores when it is played in the last trick. A called 7 must win the last trick, so a called 7
// played earlier is lost too; otherwise calling it would cost nothing.
export function sevenOnLastTrick(lastTrick: { plays: { player: number; card: string }[]; winner: number }, trump: string,
                                 caller: number, sevenCalled: boolean): SevenResult | undefined {
    const seven = sevenOfTrump(trump);
    const spades = trump === 'SPADES' ? 2 : 1;
    const play = lastTrick?.plays.find(other => other.card === seven);
    if (!play) {
        return sevenCalled
            ? { card: seven, player: caller, won: false, called: true, playedLast: false, cents: SEVEN_CENTS * 2 * spades }
            : undefined;
    }
    // only the caller can call it; a defender's 7 is always silent
    const called = sevenCalled && play.player === caller;
    const cents = SEVEN_CENTS * (called ? 2 : 1) * spades;
    return { card: play.card, player: play.player, won: lastTrick.winner === play.player, called, playedLast: true, cents };
}

// What the caller plays. The Game is played with trump, marriages, the 7 and the 100. No Tricks and All Tricks replace
// all of that: no trump, and only tricks count. The caller must take no trick at all, or every trick, and the round ends
// as soon as that fails. The Show versions are played with the caller's cards face up from the start, and pay double.
export type Contract = 'game' | 'no-tricks' | 'all-tricks' | 'no-tricks-show' | 'all-tricks-show';

// Weakest first: a player can only take over with a contract further along
export const CONTRACTS: Contract[] = ['game', 'no-tricks', 'all-tricks', 'no-tricks-show', 'all-tricks-show'];

// Paid by each defender to the caller, or by the caller to each defender. Spades doesn't double these: there's no trump.
export const CONTRACT_CENTS: Record<Exclude<Contract, 'game'>, number> = {
    'no-tricks': 6,
    'all-tricks': 10,
    'no-tricks-show': 12,
    'all-tricks-show': 20
};

const CONTRACT_NAMES: Record<Contract, string> = {
    game: 'the Game',
    'no-tricks': 'No Tricks',
    'all-tricks': 'All Tricks',
    'no-tricks-show': 'No Tricks Show',
    'all-tricks-show': 'All Tricks Show'
};

export function contractName(contract: Contract): string {
    return CONTRACT_NAMES[contract];
}

export function isNoTrumpContract(contract: Contract): boolean {
    return contract !== 'game';
}

export function isShowContract(contract: Contract): boolean {
    return contract === 'no-tricks-show' || contract === 'all-tricks-show';
}

export function isAllTricks(contract: Contract): boolean {
    return contract === 'all-tricks' || contract === 'all-tricks-show';
}

// The contracts a player may take over with
export function higherContracts(contract: Contract): Contract[] {
    return CONTRACTS.slice(CONTRACTS.indexOf(contract) + 1);
}

// After each trick of No Tricks or All Tricks: 'lost' as soon as the caller takes a trick (No Tricks) or loses one
// (All Tricks), 'won' once all ten went the caller's way, and undefined while it's still open
export function noTrumpResult(contract: Contract, tricksPlayed: number, callerTricks: number): 'won' | 'lost' | undefined {
    const allTricks = isAllTricks(contract);
    if (allTricks ? callerTricks < tricksPlayed : callerTricks > 0) {
        return 'lost';
    }
    return tricksPlayed === 10 ? 'won' : undefined;
}
