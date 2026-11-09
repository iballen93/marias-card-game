// Plays whole rounds between two kinds of player without showing them, to measure how well a PC plays.
// Scoring follows the game: 1 point for each A and 10 won, 1 for the last trick, and 2 for a marriage (4 in trump),
// and the caller wins with more points than the two defenders together. See "Measuring strength" in PC-STRATEGY.md.
import { BrainChoice, BrainView } from '../pc-brain';
import { completesMarriage, getLegalCards, isPointCard, marriagePoints, trickWinnerIndex, validateBury } from '../rules';
import { seededRandom } from './seeded-random';

// What a player does at each step of a round, given only what it may know
export interface Brain {
    chooseTrump(hand: string[]): BrainChoice;
    chooseBury(hand: string[], trump: string): BrainChoice;
    choosePlay(view: BrainView): BrainChoice;
}

export interface RoundResult {
    callerPoints: number;
    defenderPoints: number;
    callerWins: boolean;
}

export interface Matchup {
    caller: string;
    defenders: string;
    rounds: number;
    callerWinPercent: number;
    callerAveragePoints: number;
    defenderAveragePoints: number;
}

const SUITS = { S: 'SPADES', D: 'DIAMONDS', C: 'CLUBS', H: 'HEARTS' };
const DECK = ['S', 'D', 'C', 'H'].reduce((cards, suit) => cards.concat('A0KQJ987'.split('').map(rank => rank + suit)), [] as string[]);
const pick = (cards: string[]) => cards[Math.floor(Math.random() * cards.length)];

// Plays a random legal card, picks trump from a random card and buries random cards the rules allow
export const RANDOM_BRAIN: Brain = {
    chooseTrump: hand => ({ card: pick(hand), reason: 'random' }),
    chooseBury: hand => ({ card: pick(hand.filter(card => validateBury(card) === '')), reason: 'random' }),
    choosePlay: view => ({ card: pick(getLegalCards(view.trick, view.hand, view.trump)), reason: 'random' })
};

// One round, dealt from the seed so every matchup can play the same deals. The caller rotates with the seed.
export function playRound(dealSeed: number, callerBrain: Brain, defenderBrain: Brain): RoundResult {
    const random = seededRandom(dealSeed);
    const shuffled = DECK.map(card => ({ card, order: random() })).sort((a, b) => a.order - b.order).map(entry => entry.card);
    const caller = 1 + dealSeed % 3;
    const hands: { [seat: number]: string[] } = {};
    let dealt = 0;
    for (let seat = 1; seat <= 3; seat++) {
        const size = seat === caller ? 12 : 10;
        hands[seat] = shuffled.slice(dealt, dealt + size);
        dealt += size;
    }
    const brainOf = (seat: number) => seat === caller ? callerBrain : defenderBrain;

    // the caller picks trump from its first 7 cards, then buries 2
    const trump = SUITS[callerBrain.chooseTrump(hands[caller].slice(0, 7)).card.charAt(1)];
    const bury: string[] = [];
    for (let i = 0; i < 2; i++) {
        const card = callerBrain.chooseBury(hands[caller], trump).card;
        if (validateBury(card) !== '' || !hands[caller].includes(card)) {
            throw new Error('Buried a card the rules do not allow: ' + card);
        }
        bury.push(card);
        hands[caller] = hands[caller].filter(other => other !== card);
    }

    const points = { 1: 0, 2: 0, 3: 0 };
    const tricks = [];
    let leader = caller;
    for (let trickNumber = 0; trickNumber < 10; trickNumber++) {
        const trick: string[] = [];
        const plays = [];
        for (let i = 0; i < 3; i++) {
            const seat = (leader - 1 + i) % 3 + 1;
            const view: BrainView = {
                seat, caller, trump, hand: [...hands[seat]], trick: [...trick], bury: seat === caller ? bury : [], tricks
            };
            const card = brainOf(seat).choosePlay(view).card;
            if (!getLegalCards(trick, hands[seat], trump).includes(card)) {
                throw new Error('Played a card the rules do not allow: ' + card);
            }
            if (completesMarriage(card, hands[seat])) {
                points[seat] += marriagePoints(card, trump);
            }
            trick.push(card);
            plays.push({ player: seat, card });
            hands[seat] = hands[seat].filter(other => other !== card);
        }
        const winner = plays[trickWinnerIndex(trick, trump)].player;
        points[winner] += trick.filter(isPointCard).length + (trickNumber === 9 ? 1 : 0);
        tricks.push({ plays, winner });
        leader = winner;
    }

    const callerPoints = points[caller];
    const defenderPoints = [1, 2, 3].filter(seat => seat !== caller).reduce((total, seat) => total + points[seat], 0);
    return { callerPoints, defenderPoints, callerWins: callerPoints > defenderPoints };
}

// Plays the same deals for a caller and defenders, and sums up how the caller did
export function measure(callerName: string, callerBrain: Brain, defenderName: string, defenderBrain: Brain, rounds: number): Matchup {
    let wins = 0;
    let callerTotal = 0;
    let defenderTotal = 0;
    for (let round = 0; round < rounds; round++) {
        const result = playRound(round, callerBrain, defenderBrain);
        wins += result.callerWins ? 1 : 0;
        callerTotal += result.callerPoints;
        defenderTotal += result.defenderPoints;
    }
    const round2 = (value: number) => Math.round(value * 100) / 100;
    return {
        caller: callerName,
        defenders: defenderName,
        rounds,
        callerWinPercent: round2(100 * wins / rounds),
        callerAveragePoints: round2(callerTotal / rounds),
        defenderAveragePoints: round2(defenderTotal / rounds)
    };
}
