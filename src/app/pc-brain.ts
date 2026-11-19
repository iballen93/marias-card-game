// How the PC decides, as plain functions on card codes. It only uses what a real player would know:
// its own hand, its own buried cards if it is the caller, every card played so far, and who has run out of a suit.
import {
    completesMarriage, Contract, contractName, getLegalCards, higherContracts, isAllTricks, isPointCard, isTrump, marriagePoints, NO_TRUMP,
    rankOf, rankStrength, sevenOfTrump, suitOf, trickWinnerIndex, validateBury
} from './rules';
import { RAISE_NAMES, RaiseBet } from './raising';

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
    // the Game unless it says otherwise
    contract?: Contract;
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
// with this few cards of a suit still out, one of the other players has probably run out of it
const SHORT_SUIT = 2;

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
export class Knowledge {
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

    // How many cards of a suit it hasn't seen: in the other hands, or buried by the caller
    outInSuit(suit: string): number {
        return this.unseen.filter(card => suitOf(card) === suit).length;
    }

    // Who could be holding a card it hasn't seen: each other player who hasn't shown they're out of its suit, and the
    // caller's bury. The bury can't hold an A or 10, and when this seat is the caller it already knows its own bury.
    // With only two other players, one running out of a suit means the rest of that suit is with the other one.
    holders(card: string): (number | 'bury')[] {
        const players: (number | 'bury')[] = [1, 2, 3].filter(player => player !== this.view.seat && !this.isVoid(player, suitOf(card)));
        const mayBeBuried = this.view.caller !== this.view.seat && !isPointCard(card);
        return mayBeBuried ? players.concat('bury') : players;
    }

    // The player who must be holding this card, when everyone else has been ruled out
    holder(card: string): number | undefined {
        const holders = this.holders(card);
        return holders.length === 1 && holders[0] !== 'bury' ? holders[0] as number : undefined;
    }

    // Cards of the same suit still out that would beat this one
    higherOut(card: string): string[] {
        return this.unseen.filter(other => suitOf(other) === suitOf(card) && rankStrength(other) > rankStrength(card));
    }

    private markVoid(player: number, suit: string): void {
        if (!this.voids.has(player)) {
            this.voids.set(player, new Set());
        }
        this.voids.get(player).add(suit);
    }
}

// How much it hurts to give a card away: points first, then trump, then marriage cards, then rank.
// The caller keeps the 7 of trump for the last trick, where it scores, so for the caller it comes just below the point
// cards. A defender gives it up early, as its lowest trump: on the last trick it would usually be beaten by the caller's
// higher trumps, and a beaten 7 costs its side.
function cost(card: string, view: BrainView): number {
    if (card === sevenOfTrump(view.trump) && view.seat === view.caller && view.hand.length > 1) {
        return 95;
    }
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

// The option with the lowest score. When several are equally good (three 7s in different suits, say),
// any of them may be chosen, so the PC doesn't play the same way every time.
function bestOf<T>(options: T[], score: (option: T) => number): T {
    const lowest = Math.min(...options.map(score));
    const ties = options.filter(option => score(option) === lowest);
    return ties[Math.floor(Math.random() * ties.length)];
}

function cheapest(cards: string[], view: BrainView): string {
    return bestOf(cards, card => cost(card, view));
}

function strongestPoint(cards: string[]): string | undefined {
    const points = cards.filter(isPointCard);
    return points.length ? bestOf(points, card => -rankStrength(card)) : undefined;
}

// The point card worth cashing in a trick that's won anyway: one that could still be lost later. A trump that no card
// still out can beat will win a trick of its own later, so it isn't spent where any trump would do.
function pointAtRisk(cards: string[], view: BrainView, knowledge: Knowledge): string | undefined {
    return strongestPoint(cards.filter(card => !(isTrump(card, view.trump) && knowledge.isMaster(card))));
}

// Gives the 10 before the A: both are one point, and the A is more often the highest card left
function weakestPoint(cards: string[]): string | undefined {
    const points = cards.filter(isPointCard);
    return points.length ? bestOf(points, rankStrength) : undefined;
}

// With this many trumps, the caller expects to keep the 7 of trump to the last trick and win it there
const CALL_SEVEN_TRUMPS = 5;

// It calls the 100 when what it holds already adds up to this many points. Measured with npm run strength, calling at 9
// pays best: the tricks it wins from the defenders usually make up the rest.
const CALL_HUNDRED_ESTIMATE = 9;

export interface AnnouncementChoice {
    callSeven: boolean;
    callHundred: boolean;
    // the Game unless it says otherwise
    contract?: Contract;
    reason: string;
}

// A rough count of the points the caller can expect alone: its marriages, its A and 10s, and the last trick if it
// holds enough trumps to keep one. It ignores points it might win from the defenders, so it only calls on a strong hand.
export function expectedPoints(hand: string[], trump: string): number {
    const marriages = hand.filter(card => rankOf(card) === 'K' && hand.includes('Q' + suitOf(card)))
        .reduce((total, king) => total + marriagePoints(king, trump), 0);
    const pointCards = hand.filter(isPointCard).length;
    const lastTrick = hand.filter(card => isTrump(card, trump)).length >= CALL_SEVEN_TRUMPS ? 1 : 0;
    return marriages + pointCards + lastTrick;
}

// The caller chooses the Game or the 100, and calls the 7 of trump too when it holds it
export function chooseAnnouncement(hand: string[], trump: string): AnnouncementChoice {
    const noTrump = chooseNoTrumpContract(hand, trump);
    if (noTrump) {
        return { callSeven: false, callHundred: false, contract: noTrump.contract, reason: 'called ' + noTrump.reason };
    }
    const trumps = hand.filter(card => isTrump(card, trump)).length;
    const holdsSeven = hand.includes(sevenOfTrump(trump));
    const seven = cardName(sevenOfTrump(trump));
    const callSeven = holdsSeven && trumps >= CALL_SEVEN_TRUMPS;
    const estimate = expectedPoints(hand, trump);
    const callHundred = estimate >= CALL_HUNDRED_ESTIMATE;

    // the Game is always played, so it's only named when the PC bets nothing more; otherwise the extra bets get the reason
    const hundredReason = 'called the 100: its marriages and point cards already add up to about ' + estimate + ' points';
    const sevenReason = callSeven
        ? 'called the ' + seven + ': with ' + trumps + ' trumps it expects to keep the ' + seven + ' for the last trick'
        : 'kept the ' + seven + ' silent: with only ' + trumps + ' trumps, it could be beaten on the last trick';
    let reason: string;
    if (callHundred) {
        reason = hundredReason + (holdsSeven ? '. It ' + sevenReason : '');
    } else if (holdsSeven) {
        reason = sevenReason;
    } else {
        reason = 'is playing the Game: its marriages and point cards add up to about ' + estimate + ' points, short of the 100';
    }
    return { callSeven, callHundred, reason };
}

// What the PC is asked when it may raise the stakes: each bet it can raise now, and how many raises it already has
export interface RaiseQuestion {
    hand: string[];
    trump: string;
    isCaller: boolean;
    hundredCalled: boolean;
    bets: { bet: RaiseBet; level: number }[];
    // the Game unless it says otherwise
    contract?: Contract;
    // the caller's cards, when the contract is played open and everyone can see them
    callerHand?: string[];
}

export interface RaiseChoice {
    raise: RaiseBet[];
    reason: string;
}

// The PC raises a bet only when its hand says that side usually wins it, and asks for a little more with each round of
// raising, since every raise doubles what a wrong guess costs. Measured over 20,000 PC rounds (see "Raising the stakes"
// in PC-STRATEGY.md):
// - the caller wins the Game about 87% of the time when it expects 8 points or more, and almost always makes a called 100
//   it expects 10 for; a called 7 with 6 trumps wins about 83% of the time
// - the defenders win the Game about two thirds of the time when one of them holds 5 points itself
// - a called 7 or 100 depends on how the caller called it, so the defender judges its own hand against a caller who calls
//   without the hand for it, as a person might: with 4 trumps a defender beats a called 7 about 90% of the time, and with
//   7 points of its own it comes out ahead against a called 100. The PC's own calls rarely meet either: it calls the 7
//   with 5 trumps, leaving a defender 3 at most.
const RAISE_GAME_CALLER_ESTIMATE = 8;
const RAISE_HUNDRED_CALLER_ESTIMATE = 10;
const RAISE_SEVEN_CALLER_TRUMPS = 6;
const RAISE_GAME_DEFENDER_POINTS = 5;
const RAISE_HUNDRED_DEFENDER_POINTS = 7;
const RAISE_SEVEN_DEFENDER_TRUMPS = 4;

// "1 point", "6 points"
const countPoints = (points: number) => points + (points === 1 ? ' point' : ' points');

export function chooseRaises(question: RaiseQuestion): RaiseChoice {
    const { hand, trump, isCaller, hundredCalled } = question;
    const trumps = hand.filter(card => isTrump(card, trump)).length;
    const seven = cardName(sevenOfTrump(trump));
    const estimate = expectedPoints(hand, trump);
    // a defender's own marriages and aces and 10s, without the last trick
    const ownPoints = hand.filter(card => rankOf(card) === 'K' && hand.includes('Q' + suitOf(card)))
        .reduce((total, king) => total + marriagePoints(king, trump), 0) + hand.filter(isPointCard).length;

    const decisions = question.bets.map(({ bet, level }) => {
        const name = RAISE_NAMES[level];
        const extra = Math.floor(level / 2);
        const noTrump = question.contract && question.contract !== 'game';
        const contract = bet === 'seven' ? 'the ' + seven : noTrump ? contractName(question.contract) : hundredCalled ? 'the 100' : 'the Game';
        let raise: boolean;
        let why: string;
        if (noTrump && isCaller) {
            // the caller raises only a contract it all but can't lose
            const sure = isAllTricks(question.contract) ? isSureAllTricks(hand) : noTricksDanger(hand) <= RAISE_NO_TRICKS_DANGER;
            raise = sure;
            why = sure ? 'it all but can\'t lose it' : 'it isn\'t sure enough of it';
        } else if (noTrump) {
            ({ raise, why } = judgeNoTrumpAsDefender(hand, question.contract, question.callerHand));
        } else if (bet === 'seven' && !isCaller) {
            // a caller who answered with Re is sure of the 7, so a defender's next raise needs a much stronger hand
            raise = trumps >= RAISE_SEVEN_DEFENDER_TRUMPS + extra * 2;
            why = raise ? 'with ' + trumps + ' trumps it expects to beat it on the last trick'
                : 'with only ' + trumps + ' trumps it can\'t count on beating it';
        } else if (bet === 'seven') {
            raise = trumps >= RAISE_SEVEN_CALLER_TRUMPS + extra;
            why = raise ? 'with ' + trumps + ' trumps it expects to keep it for the last trick'
                : 'with ' + trumps + ' trumps it isn\'t sure enough';
        } else if (isCaller) {
            raise = estimate >= (hundredCalled ? RAISE_HUNDRED_CALLER_ESTIMATE : RAISE_GAME_CALLER_ESTIMATE) + extra;
            why = 'it expects about ' + countPoints(estimate) + (raise ? '' : ', not enough to raise');
        } else {
            // a caller who answered with Re usually has the bet, so a defender's next raise needs a much stronger hand
            raise = ownPoints >= (hundredCalled ? RAISE_HUNDRED_DEFENDER_POINTS : RAISE_GAME_DEFENDER_POINTS) + extra * 2;
            why = (raise ? 'it holds about ' : 'it holds only about ') + countPoints(ownPoints) + ' itself'
                + (raise && hundredCalled ? ', so the caller will struggle to reach 100' : '');
        }
        return { bet, raise, text: (raise ? 'said ' + name + ' on ' : 'passed on ') + contract + ': ' + why };
    });
    return {
        raise: decisions.filter(decision => decision.raise).map(decision => decision.bet),
        reason: decisions.map(decision => decision.text).join('. It ')
    };
}

export function chooseTrump(hand: string[]): BrainChoice {
    const score = (option: string) => {
        const inSuit = hand.filter(card => suitOf(card) === option);
        const has = (rank: string) => inSuit.includes(rank + option);
        return inSuit.length * 3 + (has('A') ? 4 : 0) + (has('0') ? 3 : 0) + (has('K') ? 2 : 0) + (has('Q') ? 1 : 0)
            + (has('K') && has('Q') ? 3 : 0);
    };
    const suits = SUITS.split('').filter(option => hand.some(card => suitOf(card) === option));
    const best = (options: string[]) => bestOf(options, option => -score(option));
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
    // a hand that can't lose No Tricks or All Tricks once 2 cards are gone buries those, and calls it
    const plan = noTrumpBuryPlan(hand, false, trump);
    if (plan?.bury.length) {
        return { card: plan.bury[0], reason: 'buried the ' + cardName(plan.bury[0]) + ' to set up ' + contractName(plan.contract) };
    }
    const allowed = hand.filter(card => validateBury(card) === '');
    const keepsTrumpAndMarriages = allowed.filter(card => !isTrump(card, trump) && !completesMarriage(card, hand));
    const notTrump = allowed.filter(card => !isTrump(card, trump));
    const options = keepsTrumpAndMarriages.length ? keepsTrumpAndMarriages : notTrump.length ? notTrump : allowed;

    const suitCount = (option: string) => hand.filter(other => suitOf(other) === suitOf(option)).length;
    // the shortest suit first, so burying can leave the PC out of it; then the lowest card
    const pick = bestOf(options, option => suitCount(option) * 10 + rankStrength(option));

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
    if (view.trump === NO_TRUMP) {
        return playNoTrump(view, legal);
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
        const point = pointAtRisk(legal, view, knowledge);
        const card = point || cheapest(legal, view);
        return { card, reason: goingOverPartner(view, winner, view.trick[winnerIndex], card, legal, !!point)
            + ', and the trick stays with the team' };
    }

    if (winners.length) {
        const point = pointAtRisk(winners, view, knowledge);
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

// Why it beat its own partner's card, in the words a player would use. Out of the suit that was led, the rules make it
// trump (and go over a partner's trump if it can); otherwise it had to follow suit and go over.
function goingOverPartner(view: BrainView, partner: number, partnerCard: string, card: string, legal: string[],
                          banksPoint: boolean): string {
    const ledSuit = suitOf(view.trick[0]);
    const trumping = isTrump(card, view.trump) && !isTrump(view.trick[0], view.trump);
    // any trump beats a card of another suit, so "that does" is only needed when following suit
    const kind = trumping ? 'trump' : ONE_OF_SUIT[suitOf(card)] + ' that does';
    const choice = banksPoint ? 'the ' + cardName(card) + ' to bank its point'
        : (legal.length === 1 ? 'its only ' : 'its lowest ') + kind + ', the ' + cardName(card);
    if (trumping) {
        const over = isTrump(partnerCard, view.trump) ? 'trump higher than' : 'trump';
        return 'had no ' + suitName(ledSuit).toLowerCase() + ', so it had to ' + over + ' partner Player ' + partner + '\'s '
            + cardName(partnerCard) + ', and used ' + choice;
    }
    return 'had to go over partner Player ' + partner + '\'s ' + cardName(partnerCard) + ', so it played ' + choice;
}

// Playing 2nd: nothing still out can beat this card, as far as it can tell. A trump is certain; a suit card also needs
// the last player not to have shown they can trump the suit.
function winsForSure(card: string, view: BrainView, knowledge: Knowledge, last: number): boolean {
    return isTrump(card, view.trump)
        ? !knowledge.unseen.some(other => isTrump(other, view.trump) && rankStrength(other) > rankStrength(card))
        : knowledge.isMaster(card) && !knowledge.mayTrump(last, suitOf(card));
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
        // Partner's card could still be beaten by the last player. Taking over with the highest card left banks its point
        // now: the last player has to follow suit and can't go over it, unless they're secretly out of the suit and trump.
        if (!leadHolds) {
            const point = pointAtRisk(winners.filter(option => winsForSure(option, view, knowledge, last)), view, knowledge);
            if (point) {
                return { card: point, reason: 'took over partner Player ' + leader + '\'s ' + cardName(leadCard)
                    + ' with the ' + cardName(point) + ': it\'s the highest ' + ONE_OF_SUIT[suitOf(point)] + ' left, so it banks its point now, while Player ' + last
                    + ' most likely still has to follow suit' };
            }
        }
        if (!underPartner.length) {
            const low = cheapest(legal, view);
            return { card: low, reason: goingOverPartner(view, leader, leadCard, low, legal, false) };
        }
        const card = cheapest(underPartner, view);
        return { card, reason: 'played low with the ' + cardName(card) + ' under partner Player ' + leader + '\'s lead' };
    }

    if (isTeammate(view, last)) {
        // only its partner plays after, so a winning card here is safe
        const point = pointAtRisk(winners, view, knowledge);
        if (point) {
            return { card: point, reason: 'won with the ' + cardName(point) + ': only partner Player ' + last + ' plays after, so the point is safe' };
        }
        // partner has run out of the suit that was led, so it will most likely trump: give it a point to take
        if (!isTrump(leadCard, view.trump) && knowledge.mayTrump(last, suitOf(leadCard))) {
            const gift = weakestPoint(legal.filter(option => !isTrump(option, view.trump)));
            if (gift) {
                return { card: gift, reason: 'gave the ' + cardName(gift) + ' to partner Player ' + last + ', who has shown they have no '
                    + suitName(suitOf(leadCard)).toLowerCase() + ' and can most likely trump the trick' };
            }
        }
        const cheapWinner = winners.length ? cheapest(winners, view) : undefined;
        if (cheapWinner && (trickPoints(view) || cost(cheapWinner, view) < 30)) {
            return { card: cheapWinner, reason: 'took the lead with the ' + cardName(cheapWinner) + ', with partner Player ' + last + ' still to play' };
        }
        const card = cheapest(legal, view);
        return { card, reason: 'played low with the ' + cardName(card) + ' and leaves the trick to partner Player ' + last };
    }

    // it's the caller: both other players are against it, and one still plays after
    const safe = winners.filter(card => winsForSure(card, view, knowledge, last));
    if (safe.length) {
        const point = strongestPoint(safe);
        const card = point || cheapest(safe, view);
        // a trump nothing can beat is certain; a suit card only wins if Player last isn't secretly out of the suit
        const reason = isTrump(card, view.trump)
            ? ': no trump still out can beat it' + (point ? ', so its point is safe' : '')
            : ': it\'s the highest ' + ONE_OF_SUIT[suitOf(card)] + ' left and Player ' + last
                + ' hasn\'t shown they can trump it' + (point ? ', so its point should be safe' : '');
        return { card, reason: 'won with the ' + cardName(card) + reason };
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

    const others = [1, 2, 3].filter(player => player !== view.seat);
    const out = (card: string) => knowledge.outInSuit(suitOf(card));
    const safeSuit = (card: string) => !opponents.some(player => knowledge.mayTrump(player, suitOf(card)));
    // with no cards of the suit still out, the other players can only trump it, unless the trumps are gone
    const nobodyElseHasIt = (card: string) => out(card) === 0 && unseenTrumps > 0;
    const masters = legal.filter(card => !isTrump(card, view.trump) && knowledge.isMaster(card) && safeSuit(card)
        && !nobodyElseHasIt(card));
    const pointMasters = masters.filter(isPointCard);

    if (pointMasters.length) {
        const top = trumps.length ? bestOf(trumps, option => -rankStrength(option)) : undefined;
        const allShort = pointMasters.every(option => out(option) <= SHORT_SUIT);
        // the caller with as many trumps as are out pulls them first, so a short suit's point card can't be trumped
        if (allShort && view.seat === view.caller && top && knowledge.isMaster(top) && unseenTrumps > 0 && trumps.length >= unseenTrumps) {
            const risky = pointMasters[0];
            return { card: top, reason: 'led the ' + cardName(top) + ' to draw out trumps first: only ' + out(risky) + ' '
                + suitName(suitOf(risky)).toLowerCase() + ' are still out, so its ' + cardName(risky) + ' could be trumped' };
        }
        // the suit with the fewest cards out first: it's the next one someone will run out of and trump
        const card = bestOf(pointMasters, option => out(option) * 10 - rankStrength(option));
        // It only knows how many are out, not who holds them: one player may hold them all and the other none,
        // so its point is only certain once nobody has trumps left
        const highest = ': it\'s the highest ' + ONE_OF_SUIT[suitOf(card)] + ' left';
        const stillOut = out(card) === 1 ? '1 ' + ONE_OF_SUIT[suitOf(card)] : out(card) + ' ' + suitName(suitOf(card)).toLowerCase();
        const reason = unseenTrumps === 0
            ? highest + ' and nobody has trumps left, so its point is safe'
            : out(card) <= SHORT_SUIT + 1
                ? highest + '. With only ' + stillOut + ' still out, someone may already have none and trump it, '
                    + 'so it plays it now while it most likely still wins'
                : highest + ' and nobody has shown they can trump it, so it should win';
        return { card, reason: 'led the ' + cardName(card) + reason };
    }

    // A defender leads a suit its partner has run out of, so the partner can trump it. The partner being out of it also
    // tells it the rest of that suit is with the caller (or buried), so the caller has to follow suit and can't trump.
    const partner = view.seat === view.caller ? undefined : others.find(player => player !== view.caller);
    const partnerTrumps = legal.filter(card => partner && !isTrump(card, view.trump) && knowledge.mayTrump(partner, suitOf(card))
        && !knowledge.isVoid(view.caller, suitOf(card)) && out(card) > 0);
    if (partnerTrumps.length) {
        const pointsWithCaller = (ofSuit: string) => knowledge.unseen.filter(other => suitOf(other) === ofSuit && isPointCard(other)
            && knowledge.holder(other) === view.caller);
        // the suit where the caller holds the most points to lose, then its lowest card
        const card = bestOf(partnerTrumps, option => cost(option, view) - pointsWithCaller(suitOf(option)).length * 1000);
        const suit = suitOf(card);
        const caught = pointsWithCaller(suit);
        return { card, reason: 'led the ' + cardName(card) + ' so partner Player ' + partner + ' can trump it: Player ' + partner
            + ' has shown they have no ' + suitName(suit).toLowerCase() + ', so any ' + suitName(suit).toLowerCase()
            + ' still out that weren\'t buried are with Player ' + view.caller
            + (caught.length ? ', including the ' + caught.map(cardName).join(' and ') : '') };
    }

    // Holding the 10 but not the A: lead the card just under the A to force it out. Whoever holds the A and still has
    // the suit must go over, and the A is the only card that can, so afterwards the 10 is the highest left.
    // It can't know who holds the A, only that nobody has shown they're out of the suit, and that enough are still out.
    const forcesTheAce = legal.filter(card => {
        const suit = suitOf(card);
        const higher = knowledge.higherOut(card);
        return !isTrump(card, view.trump) && !isPointCard(card) && view.hand.includes('0' + suit)
            && higher.length === 1 && higher[0] === 'A' + suit
            && !others.some(player => knowledge.mayTrump(player, suit))
            && (unseenTrumps === 0 || out(card) >= 3);
    });
    if (forcesTheAce.length) {
        const card = cheapest(forcesTheAce, view);
        const suit = suitOf(card);
        return { card, reason: 'led the ' + cardName(card) + ' to force out the ' + cardName('A' + suit) + ': whoever holds it has to go over, '
            + 'and then its ' + cardName('0' + suit) + ' is the highest ' + ONE_OF_SUIT[suit] + ' left' };
    }

    // Any of its lowest cards will do, so it varies which one, avoiding a suit someone has probably run out of
    const lowLeads = legal.filter(card => !isTrump(card, view.trump) && !isPointCard(card) && safeSuit(card));
    if (lowLeads.length) {
        const lowestCost = Math.min(...lowLeads.map(option => cost(option, view)));
        const lowest = lowLeads.filter(option => cost(option, view) === lowestCost);
        const roomy = lowest.filter(option => out(option) > SHORT_SUIT);
        const card = bestOf(roomy.length ? roomy : lowest, () => 0);
        return { card, reason: 'led the ' + cardName(card) + ' to keep its high cards for later' };
    }
    if (masters.length) {
        const card = cheapest(masters, view);
        return { card, reason: 'led the ' + cardName(card) + ', the highest ' + ONE_OF_SUIT[suitOf(card)] + ' left' };
    }
    const spare = cheapest(legal, view);
    return { card: spare, reason: 'led the ' + cardName(spare) + ', the card it could best spare' };
}

// ---- No Tricks and All Tricks ----

const noTrumpStrength = (card: string) => rankStrength(card, NO_TRUMP);

// Every suit it holds runs unbroken down from the A. The caller leads the first trick, and each of those cards is the
// highest of its suit still out, so it wins every trick and leads the next: All Tricks can't fail, even played open.
export function isSureAllTricks(hand: string[]): boolean {
    return SUITS.split('').every(suit => hand.filter(card => suitOf(card) === suit).map(noTrumpStrength)
        .sort((a, b) => b - a).every((strength, index) => strength === 7 - index));
}

// The cards that could make the caller take a trick in No Tricks. A player who can go higher than the card to beat must,
// so a card is only safe when the caller also holds every lower card of its suit: then any card a defender plays in that
// suit is higher than all of the caller's. A gap lets a defender lead a card in it and force the caller over.
export function noTricksDanger(hand: string[]): number {
    return SUITS.split('').reduce((danger, suit) => danger + hand.filter(card => suitOf(card) === suit).map(noTrumpStrength)
        .sort((a, b) => a - b).filter((strength, index) => strength > index).length, 0);
}

// Measured over 200,000 deals, played out by the PC on both sides: No Tricks is won about 93% of the time with 1 dangerous
// card, 90% with 2, 77% with 3, 66% with 4, 59% with 5 and 48% with 6. It pays 6 cents either way, so anything over half
// beats playing a weak hand in the Game; the PC calls it with up to 3, leaving room for defenders who play better than it
// does, and raises it with up to 1. It never plays it open, which hasn't been measured.
export const NO_TRICKS_DANGER = 3;
const RAISE_NO_TRICKS_DANGER = 1;
// and with 6 or more it's lost more often than won, so a defender who can see that in an open No Tricks says Kontra
const KONTRA_OPEN_NO_TRICKS_DANGER = 6;

// Whether a defender should say Kontra on No Tricks or All Tricks, judged from its own hand, and from the caller's too
// when it's played open
function judgeNoTrumpAsDefender(hand: string[], contract: Contract, callerHand?: string[]): { raise: boolean; why: string } {
    if (isAllTricks(contract)) {
        if (callerHand) {
            const beater = beatsOpenAllTricks(hand, callerHand);
            return beater ? { raise: true, why: 'its ' + cardName(beater.card) + ' will beat the caller\'s ' + cardName(beater.callerCard) }
                : { raise: false, why: 'none of its cards can beat the caller\'s' };
        }
        // a defender's A wins a trick in any suit the caller holds, so the caller can only be safe in suits where it holds the
        // A. With 3 aces here, the one suit left has 8 cards, and the caller holds 10: one of the 3 aces must beat it. With 2,
        // the two suits left have 16 cards, so it's only sure when it holds 7 of those itself, leaving the caller 9 at most.
        const aces = hand.filter(card => rankOf(card) === 'A');
        if (aces.length >= 3) {
            return { raise: true, why: 'it holds ' + aces.length + ' aces, so the caller must hold a suit where one of them beats it' };
        }
        if (aces.length === 2) {
            const aceSuits = aces.map(suitOf);
            const others = hand.filter(card => !aceSuits.includes(suitOf(card))).length;
            if (16 - others < 10) {
                return { raise: true, why: 'it holds the ' + aces.map(cardName).join(' and ') + ' and ' + others
                    + ' of the other cards, so the caller must hold a ' + aceSuits.map(suit => ONE_OF_SUIT[suit]).join(' or ') };
            }
        }
        const aceCount = aces.length;
        return { raise: false, why: (aceCount ? 'with only ' + aceCount + (aceCount === 1 ? ' ace' : ' aces') : 'without an ace')
            + ' it can\'t be sure the caller holds a suit it can beat' };
    }
    if (callerHand) {
        const danger = noTricksDanger(callerHand);
        const raise = danger >= KONTRA_OPEN_NO_TRICKS_DANGER;
        return { raise, why: danger + ' of the caller\'s cards could be forced to take a trick' + (raise ? '' : ', not enough to count on it') };
    }
    return { raise: false, why: 'it can\'t see the caller\'s cards, and its own hand doesn\'t tell it whether the caller will have to take a trick' };
}

// With the caller's cards face up: a suit where this defender holds a card higher than one of the caller's, and enough
// other cards of the suit to follow the caller's higher ones first without giving it up. When the caller then leads the
// lower card, the defender has to go higher, and wins the trick.
function beatsOpenAllTricks(hand: string[], callerHand: string[]): { card: string; callerCard: string } | undefined {
    for (const suit of SUITS.split('')) {
        const inSuit = (cards: string[]) => cards.filter(card => suitOf(card) === suit)
            .sort((a, b) => noTrumpStrength(b) - noTrumpStrength(a));
        const mine = inSuit(hand);
        const theirs = inSuit(callerHand);
        if (!mine.length) {
            continue;
        }
        const top = mine[0];
        const above = theirs.filter(card => noTrumpStrength(card) > noTrumpStrength(top)).length;
        const below = theirs.filter(card => noTrumpStrength(card) < noTrumpStrength(top));
        if (below.length && mine.length > above) {
            return { card: top, callerCard: below[0] };
        }
    }
    return undefined;
}

// Which cards to bury so the 10 left can't lose No Tricks or All Tricks, if any can. Burying an A or 10 is only
// allowed after taking over, since points still count in the Game the caller might have to play.
function noTrumpBuryPlan(hand: string[], allowPoints: boolean, gameTrump?: string)
    : { contract: Contract; bury: string[] } | undefined {
    const choices = hand.filter(card => allowPoints || !isPointCard(card));
    const extra = hand.length - 10;
    const pairs = choices.reduce((all, card, index) => all.concat(choices.slice(index + 1).map(other => [card, other])), [] as string[][]);
    const sets: string[][] = extra === 2 ? pairs : extra === 1 ? choices.map(card => [card]) : [[]];
    for (const contract of ['all-tricks-open', 'no-tricks'] as Contract[]) {
        const bury = sets.find(set => chooseNoTrumpContract(hand.filter(card => !set.includes(card)), gameTrump)?.contract === contract);
        if (bury) {
            return { contract, bury };
        }
    }
    return undefined;
}

// A caller expecting more than this many points in the Game plays the Game rather than No Tricks: up to here, the Game
// loses money on average (see "Raising the stakes" in PC-STRATEGY.md)
const NO_TRICKS_MAX_GAME_ESTIMATE = 5;

// The No Tricks or All Tricks contract this hand should play, if any, finishing "Player 2 (PC) called ...".
// gameTrump is the trump the caller picked: given, No Tricks only replaces a weak hand for the Game.
function chooseNoTrumpContract(hand: string[], gameTrump?: string): { contract: Contract; reason: string } | undefined {
    if (isSureAllTricks(hand)) {
        return {
            contract: 'all-tricks-open', reason: 'All Tricks Show: every suit it holds runs down from the A, so it wins every trick it leads'
        };
    }
    const danger = noTricksDanger(hand);
    const weakGame = !gameTrump || expectedPoints(hand, gameTrump) <= NO_TRICKS_MAX_GAME_ESTIMATE;
    if (danger <= NO_TRICKS_DANGER && weakGame) {
        const why = danger === 0 ? 'its cards are low enough in every suit to stay under the defenders'
            : 'only ' + danger + ' of its cards could be forced to take a trick';
        return { contract: 'no-tricks', reason: 'No Tricks: ' + why };
    }
    return undefined;
}

export interface TakeOverChoice {
    contract?: Contract;
    reason: string;
}

// A defender may take over with a higher contract; it judges its own 10 cards, since it can bury the 2 it picks up
export function chooseTakeOver(hand: string[], current: Contract): TakeOverChoice {
    const option = chooseNoTrumpContract(hand);
    if (option && higherContracts(current).includes(option.contract)) {
        return { contract: option.contract, reason: 'took over with ' + option.reason };
    }
    const why = option ? 'worth more than ' + contractName(current) : 'right for No Tricks or All Tricks';
    return { reason: 'passed: its hand isn\'t ' + why };
}

// After taking over, it buries what hurts the contract most: its highest card for No Tricks, its lowest for All Tricks
export function chooseNoTrumpBury(hand: string[], contract: Contract): BrainChoice {
    const plan = noTrumpBuryPlan(hand, true);
    if (plan?.contract === contract && plan.bury.length) {
        const card = plan.bury[0];
        return { card, reason: 'buried the ' + cardName(card) + ', which it doesn\'t need for ' + contractName(contract) };
    }
    const allTricks = isAllTricks(contract);
    // bestOf picks the lowest score: the weakest card for All Tricks, the strongest for No Tricks
    const pick = bestOf(hand, card => allTricks ? noTrumpStrength(card) : -noTrumpStrength(card));
    return { card: pick, reason: 'buried the ' + cardName(pick) + (allTricks ? ', its weakest card' : ', its most dangerous card') };
}

// No trump, and only the tricks count. In No Tricks the caller ducks and the defenders try to make it take a trick;
// in All Tricks the caller leads its strongest cards and the defenders try to beat one.
function playNoTrump(view: BrainView, legal: string[]): BrainChoice {
    const allTricks = isAllTricks(view.contract || 'no-tricks');
    const isCaller = view.seat === view.caller;
    // bestOf picks the lowest score
    const highest = (cards: string[]) => bestOf(cards, option => -noTrumpStrength(option));
    const lowest = (cards: string[]) => bestOf(cards, noTrumpStrength);
    const choice = (pick: string, why: string) => ({ card: pick, reason: why.replace('#', 'the ' + cardName(pick)) });
    if (!view.trick.length) {
        if (isCaller && !allTricks) {
            // the shortest suit leaves the defenders the most cards to play over it
            const length = (option: string) => view.hand.filter(other => suitOf(other) === suitOf(option)).length;
            return choice(bestOf(legal, option => length(option) * 10 + noTrumpStrength(option)),
                'led # from its shortest suit, so the defenders have to go over it');
        }
        // the All Tricks caller leads its strongest card; a defender leads its lowest
        return isCaller === allTricks ? choice(highest(legal), 'led #, its strongest card')
            : choice(lowest(legal), 'led #, its lowest card');
    }
    const best = view.trick[trickWinnerIndex(view.trick, NO_TRUMP)];
    const beats = (option: string) => suitOf(option) === suitOf(best) && noTrumpStrength(option) > noTrumpStrength(best);
    const callerPlayed = whoPlayed(view).indexOf(view.caller);
    const callerWinning = callerPlayed >= 0 && view.trick[callerPlayed] === best;
    const under = legal.filter(option => !beats(option));
    const over = legal.filter(beats);
    if (isCaller) {
        // No Tricks: get rid of its highest card that still stays under the trick; All Tricks never follows unless lost
        return under.length ? choice(highest(under), 'stayed under the trick with #') : choice(lowest(legal), 'had to go over with #');
    }
    if (allTricks) {
        return over.length && callerWinning ? choice(lowest(over), 'beat the caller with #') : choice(lowest(legal), 'played its lowest card, #');
    }
    // No Tricks defender: keep the trick low, so the caller has to go over it or win it
    return callerWinning && under.length ? choice(highest(under), 'left the trick to the caller, playing #')
        : choice(lowest(legal), 'played low with #, so the caller has to go over it');
}

// Who played each card of the trick on the table, in order
function whoPlayed(view: BrainView): number[] {
    const leader = seatAfter(view.seat, 3 - view.trick.length);
    return view.trick.map((card, index) => seatAfter(leader, index));
}
