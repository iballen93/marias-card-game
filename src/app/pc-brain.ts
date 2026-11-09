// How the PC decides, as plain functions on card codes. It only uses what a real player would know:
// its own hand, its own buried cards if it is the caller, every card played so far, and who has run out of a suit.
import { completesMarriage, getLegalCards, isPointCard, isTrump, rankOf, rankStrength, suitOf, trickWinnerIndex, validateBury } from './rules';

export interface BrainView {
    seat: number;
    caller: number;
    trump: string;
    hand: string[];
    // the cards on the table now, in the order they were played
    trick: string[];
    // this seat's own buried cards (only the caller has any)
    bury: string[];
    tricks: { plays: { player: number; card: string }[] }[];
}

export interface BrainChoice {
    card: string;
    // finishes the sentence "Player 2 (PC) ..."
    reason: string;
}

const SUITS = 'SDCH';
const RANKS = 'A0KQJ987';
const RANK_NAMES = { A: 'A', 0: '10', K: 'K', Q: 'Q', J: 'J', 9: '9', 8: '8', 7: '7' };
const SUIT_SYMBOLS = { S: '♠', D: '♦', C: '♣', H: '♥' };
const SUIT_NAMES = { S: 'Spades', D: 'Diamonds', C: 'Clubs', H: 'Hearts' };
// as in "the highest diamond left"
const ONE_OF_SUIT = { S: 'spade', D: 'diamond', C: 'club', H: 'heart' };
const ALL_CARDS = SUITS.split('').reduce((cards, suit) => cards.concat(RANKS.split('').map(rank => rank + suit)), [] as string[]);
// a trump this high is worth keeping for a trick that has points in it
const HIGH_TRUMP = rankStrength('KS');

export function cardName(code: string): string {
    return RANK_NAMES[rankOf(code)] + SUIT_SYMBOLS[suitOf(code)];
}

function suitName(suit: string): string {
    return SUIT_NAMES[suit];
}

function seatAfter(seat: number, steps: number): number {
    return (seat - 1 + steps) % 3 + 1;
}

// What this seat can work out from the table
class Knowledge {
    readonly unseen: string[];
    private readonly voids = new Map<number, Set<string>>();

    constructor(private view: BrainView) {
        const played = new Set<string>();
        const allTricks = view.tricks.map(trick => trick.plays).concat([this.currentPlays()]);
        for (const plays of allTricks) {
            plays.forEach(play => played.add(play.card));
            if (!plays.length) {
                continue;
            }
            const leadSuit = suitOf(plays[0].card);
            for (const play of plays.slice(1)) {
                if (suitOf(play.card) !== leadSuit) {
                    this.markVoid(play.player, leadSuit);
                    if (view.trump && !isTrump(play.card, view.trump)) {
                        this.markVoid(play.player, view.trump.charAt(0));
                    }
                }
            }
        }
        const known = new Set(view.hand.concat(view.bury, Array.from(played)));
        this.unseen = ALL_CARDS.filter(card => !known.has(card));
    }

    leader(): number {
        return seatAfter(this.view.seat, 3 - this.view.trick.length);
    }

    currentPlays(): { player: number; card: string }[] {
        const leader = this.leader();
        return this.view.trick.map((card, index) => ({ player: seatAfter(leader, index), card }));
    }

    isVoid(player: number, suit: string): boolean {
        return !!this.voids.get(player)?.has(suit);
    }

    // No card still out can beat it in its own suit
    isMaster(card: string): boolean {
        return !this.unseen.some(other => suitOf(other) === suitOf(card) && rankStrength(other) > rankStrength(card));
    }

    // The player has shown they're out of this suit and may still have trump
    mayTrump(player: number, suit: string): boolean {
        const trumpSuit = this.view.trump.charAt(0);
        return suit !== trumpSuit && this.isVoid(player, suit) && !this.isVoid(player, trumpSuit)
            && this.unseen.some(card => suitOf(card) === trumpSuit);
    }

    unseenTrumps(): number {
        return this.unseen.filter(card => isTrump(card, this.view.trump)).length;
    }

    private markVoid(player: number, suit: string): void {
        if (!this.voids.has(player)) {
            this.voids.set(player, new Set());
        }
        this.voids.get(player).add(suit);
    }
}

// How much it hurts to give a card away: points first, then trump, then marriage cards, then rank
function cost(card: string, view: BrainView): number {
    if (isPointCard(card)) {
        return 100 + rankStrength(card);
    }
    if (isTrump(card, view.trump)) {
        return 50 + rankStrength(card);
    }
    if (completesMarriage(card, view.hand)) {
        return 30 + rankStrength(card);
    }
    return rankStrength(card);
}

function cheapest(cards: string[], view: BrainView): string {
    return cards.reduce((best, card) => cost(card, view) < cost(best, view) ? card : best);
}

function strongestPoint(cards: string[]): string | undefined {
    const points = cards.filter(isPointCard);
    return points.length ? points.reduce((best, card) => rankStrength(card) > rankStrength(best) ? card : best) : undefined;
}

// Gives the 10 before the A: both are one point, and the A is more often the highest card left
function weakestPoint(cards: string[]): string | undefined {
    const points = cards.filter(isPointCard);
    return points.length ? points.reduce((best, card) => rankStrength(card) < rankStrength(best) ? card : best) : undefined;
}

export function chooseTrump(hand: string[]): BrainChoice {
    const score = (option: string) => {
        const inSuit = hand.filter(card => suitOf(card) === option);
        const has = (rank: string) => inSuit.includes(rank + option);
        return inSuit.length * 3 + (has('A') ? 4 : 0) + (has('0') ? 3 : 0) + (has('K') ? 2 : 0) + (has('Q') ? 1 : 0)
            + (has('K') && has('Q') ? 3 : 0);
    };
    const suits = SUITS.split('').filter(option => hand.some(card => suitOf(card) === option));
    const best = (options: string[]) => options.reduce((top, option) => score(option) > score(top) ? option : top);
    const others = suits.filter(option => option !== 'S');
    // Spades doubles what's won or lost, so only pick it when it's clearly the strongest
    let suit = others.length ? best(others) : 'S';
    if (suits.includes('S') && (!others.length || score('S') >= score(suit) + 2)) {
        suit = 'S';
    }

    const cards = hand.filter(card => suitOf(card) === suit);
    const extras = [];
    if (cards.includes('A' + suit)) {
        extras.push('the A');
    }
    if (cards.includes('K' + suit) && cards.includes('Q' + suit)) {
        extras.push('the K and Q for a 4 point marriage');
    }
    const reason = 'picked ' + suitName(suit) + ' as trump: it holds ' + cards.length + ' of them'
        + (extras.length ? ', including ' + extras.join(' and ') : '') + (suit === 'S' ? '. Spades doubles the stakes' : '');
    return { card: cards[0], reason };
}

export function chooseBury(hand: string[], trump: string): BrainChoice {
    const allowed = hand.filter(card => validateBury(card) === '');
    const keepsTrumpAndMarriages = allowed.filter(card => !isTrump(card, trump) && !completesMarriage(card, hand));
    const notTrump = allowed.filter(card => !isTrump(card, trump));
    const options = keepsTrumpAndMarriages.length ? keepsTrumpAndMarriages : notTrump.length ? notTrump : allowed;

    const suitCount = (option: string) => hand.filter(other => suitOf(other) === suitOf(option)).length;
    // the shortest suit first, so burying can leave the PC out of it; then the lowest card
    const isBetter = (option: string, best: string) => suitCount(option) < suitCount(best)
        || suitCount(option) === suitCount(best) && rankStrength(option) < rankStrength(best);
    const pick = options.reduce((best, option) => isBetter(option, best) ? option : best);

    const reason = suitCount(pick) === 1 && !isTrump(pick, trump)
        ? 'buried the ' + cardName(pick) + ' to run out of ' + suitName(suitOf(pick)) + ', so it can trump them later'
        : 'buried the ' + cardName(pick) + ', a low card it can spare';
    return { card: pick, reason };
}

export function choosePlay(view: BrainView): BrainChoice {
    const legal = getLegalCards(view.trick, view.hand, view.trump);
    if (legal.length === 1) {
        return { card: legal[0], reason: 'played the ' + cardName(legal[0]) + ', its only legal card' };
    }
    const knowledge = new Knowledge(view);
    switch (view.trick.length) {
        case 0:
            return lead(view, knowledge, legal);
        case 1:
            return playSecond(view, knowledge, legal);
        default:
            return playLast(view, knowledge, legal);
    }
}

function isTeammate(view: BrainView, player: number): boolean {
    return player === view.seat || (player !== view.caller && view.seat !== view.caller);
}

function winningCards(view: BrainView, legal: string[]): string[] {
    return legal.filter(card => trickWinnerIndex([...view.trick, card], view.trump) === view.trick.length);
}

function trickPoints(view: BrainView): number {
    return view.trick.filter(isPointCard).length;
}

function pointsText(points: number): string {
    return points === 1 ? '1 point' : points + ' points';
}

function playLast(view: BrainView, knowledge: Knowledge, legal: string[]): BrainChoice {
    const winnerIndex = trickWinnerIndex(view.trick, view.trump);
    const winner = knowledge.currentPlays()[winnerIndex].player;
    const winners = winningCards(view, legal);

    if (isTeammate(view, winner)) {
        const keepsPartnerWinning = legal.filter(option => !winners.includes(option));
        if (keepsPartnerWinning.length) {
            const gift = weakestPoint(keepsPartnerWinning);
            return gift
                ? { card: gift, reason: 'gave the ' + cardName(gift) + ' to partner Player ' + winner + ', who is winning the trick' }
                : { card: cheapest(keepsPartnerWinning, view), reason: 'threw the ' + cardName(cheapest(keepsPartnerWinning, view))
                    + ': partner Player ' + winner + ' is already winning the trick' };
        }
        // the rules make it go over its partner, so the trick stays with the team either way
        const point = strongestPoint(legal);
        const card = point || cheapest(legal, view);
        return { card, reason: 'had to go over partner Player ' + winner + ', so it played the ' + cardName(card) + ' and the trick stays with the team' };
    }

    if (winners.length) {
        const point = strongestPoint(winners);
        if (point) {
            return { card: point, reason: 'won the trick with the ' + cardName(point) + ', so its point is safe' };
        }
        const card = cheapest(winners, view);
        const losers = legal.filter(other => !winners.includes(other) && !isPointCard(other));
        if (!trickPoints(view) && isTrump(card, view.trump) && rankStrength(card) >= HIGH_TRUMP && losers.length) {
            const low = cheapest(losers, view);
            return { card: low, reason: 'let the trick go with the ' + cardName(low) + ': it has no points, so it isn\'t worth the '
                + cardName(card) };
        }
        const points = trickPoints(view);
        return { card, reason: 'won the trick with the ' + cardName(card) + ', the cheapest card that wins'
            + (points ? ', taking ' + pointsText(points) : '') };
    }

    const lowest = cheapest(legal, view);
    return { card: lowest, reason: 'can\'t win the trick, so it threw its lowest card, the ' + cardName(lowest) };
}

function playSecond(view: BrainView, knowledge: Knowledge, legal: string[]): BrainChoice {
    const leader = knowledge.leader();
    const last = seatAfter(view.seat, 1);
    const leadCard = view.trick[0];
    const winners = winningCards(view, legal);

    if (isTeammate(view, leader)) {
        const leadHolds = knowledge.isMaster(leadCard) && !knowledge.mayTrump(last, suitOf(leadCard));
        const underPartner = legal.filter(option => !winners.includes(option));
        const gift = leadHolds ? weakestPoint(underPartner) : undefined;
        if (gift) {
            return { card: gift, reason: 'gave the ' + cardName(gift) + ' to partner Player ' + leader + ', whose ' + cardName(leadCard)
                + ' is the highest ' + ONE_OF_SUIT[suitOf(leadCard)] + ' left' };
        }
        const card = cheapest(underPartner.length ? underPartner : legal, view);
        return { card, reason: 'played low with the ' + cardName(card) + ' under partner Player ' + leader + '\'s lead' };
    }

    if (isTeammate(view, last)) {
        // only its partner plays after, so a winning card here is safe
        const point = strongestPoint(winners);
        if (point) {
            return { card: point, reason: 'won with the ' + cardName(point) + ': only partner Player ' + last + ' plays after, so the point is safe' };
        }
        const cheapWinner = winners.length ? cheapest(winners, view) : undefined;
        if (cheapWinner && (trickPoints(view) || cost(cheapWinner, view) < 30)) {
            return { card: cheapWinner, reason: 'took the lead with the ' + cardName(cheapWinner) + ', with partner Player ' + last + ' still to play' };
        }
        const card = cheapest(legal, view);
        return { card, reason: 'played low with the ' + cardName(card) + ' and leaves the trick to partner Player ' + last };
    }

    // it's the caller: both other players are against it, and one still plays after
    const safe = winners.filter(card => isTrump(card, view.trump)
        ? !knowledge.unseen.some(other => isTrump(other, view.trump) && rankStrength(other) > rankStrength(card))
        : knowledge.isMaster(card) && !knowledge.mayTrump(last, suitOf(card)));
    if (safe.length) {
        const point = strongestPoint(safe);
        const card = point || cheapest(safe, view);
        return { card, reason: 'won with the ' + cardName(card) + ': no card still out can beat it'
            + (point ? ', so its point is safe' : '') };
    }
    if (winners.length && trickPoints(view)) {
        const card = cheapest(winners, view);
        return { card, reason: 'went for the ' + pointsText(trickPoints(view)) + ' on the table with the ' + cardName(card) };
    }
    const lowest = cheapest(legal, view);
    return { card: lowest, reason: 'played low with the ' + cardName(lowest) + ': Player ' + last + ' could still beat a higher card' };
}

function lead(view: BrainView, knowledge: Knowledge, legal: string[]): BrainChoice {
    const opponents = [1, 2, 3].filter(player => !isTeammate(view, player));
    const trumps = legal.filter(card => isTrump(card, view.trump));
    const unseenTrumps = knowledge.unseenTrumps();

    // the caller, holding more trumps than are still out, draws them so its other high cards are safe
    if (view.seat === view.caller && trumps.length >= 2 && unseenTrumps > 0 && trumps.length > unseenTrumps) {
        const top = trumps.reduce((best, card) => rankStrength(card) > rankStrength(best) ? card : best);
        if (knowledge.isMaster(top)) {
            return { card: top, reason: 'led the ' + cardName(top) + ' to draw out the other players\' trumps' };
        }
    }

    const safeSuit = (card: string) => !opponents.some(player => knowledge.mayTrump(player, suitOf(card)));
    const masters = legal.filter(card => !isTrump(card, view.trump) && knowledge.isMaster(card) && safeSuit(card));
    const pointMaster = strongestPoint(masters);
    if (pointMaster) {
        return { card: pointMaster, reason: 'led the ' + cardName(pointMaster) + ': it\'s the highest ' + ONE_OF_SUIT[suitOf(pointMaster)]
            + ' left, so its point is safe' };
    }

    const suitLength = (card: string) => view.hand.filter(other => suitOf(other) === suitOf(card)).length;
    const lowLeads = legal.filter(card => !isTrump(card, view.trump) && !isPointCard(card) && safeSuit(card));
    if (lowLeads.length) {
        const card = lowLeads.reduce((best, option) => cost(option, view) < cost(best, view)
            || cost(option, view) === cost(best, view) && suitLength(option) > suitLength(best) ? option : best);
        return { card, reason: 'led the ' + cardName(card) + ' to keep its high cards for later' };
    }
    if (masters.length) {
        const card = cheapest(masters, view);
        return { card, reason: 'led the ' + cardName(card) + ', the highest ' + ONE_OF_SUIT[suitOf(card)] + ' left' };
    }
    const spare = cheapest(legal, view);
    return { card: spare, reason: 'led the ' + cardName(spare) + ', the card it could best spare' };
}
