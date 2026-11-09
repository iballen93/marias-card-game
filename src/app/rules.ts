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

export function rankOf(code: string): string {
    return code.charAt(0);
}

export function suitOf(code: string): string {
    return code.charAt(1);
}

// Higher is stronger: 7 = 0 up to A = 7
export function rankStrength(code: string): number {
    return RANKS.length - 1 - RANKS.indexOf(rankOf(code));
}

// trump is the suit's full name, as the game stores it ('HEARTS')
export function isTrump(code: string, trump: string): boolean {
    return !!trump && suitOf(code) === trump.charAt(0);
}

export function isSameSuit(code1: string, code2: string): boolean {
    return suitOf(code1) === suitOf(code2);
}

// Only compares rank; callers check the suit
export function isHigherRank(code: string, other: string): boolean {
    return rankStrength(code) > rankStrength(other);
}

export function isPointCard(code: string): boolean {
    return rankOf(code) === 'A' || rankOf(code) === '0';
}

export function validateBury(code: string): string {
    return isPointCard(code) ? ILLEGAL_MOVES.BURY_POINTS : '';
}

// The card a follower has to beat in suit: the lead, or the second card if it went over the lead in suit
function cardToBeatInSuit(trick: string[]): string {
    const [lead, second] = trick;
    return second && isSameSuit(second, lead) && isHigherRank(second, lead) ? second : lead;
}

// Returns '' for a legal play, or the rule it breaks
export function validateMove(trick: string[], hand: string[], card: string, trump: string): string {
    if (!trick?.length) {
        return '';
    }
    const toBeat = cardToBeatInSuit(trick);
    if (hand.some(handCard => isSameSuit(handCard, toBeat))) {
        if (!isSameSuit(card, toBeat)) {
            return ILLEGAL_MOVES.MUST_FOLLOW_SUIT;
        }
        // a second card trump already wins over the lead suit, so the third card only has to follow suit
        const trumpedSecond = trick.length === 2 && !isTrump(trick[0], trump) && isTrump(trick[1], trump);
        const canGoOver = !trumpedSecond && hand.some(handCard => isSameSuit(handCard, toBeat) && isHigherRank(handCard, toBeat));
        return canGoOver && !isHigherRank(card, toBeat) ? ILLEGAL_MOVES.MUST_OVERRIDE : '';
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
            || isSameSuit(card, best) && isHigherRank(card, best);
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
