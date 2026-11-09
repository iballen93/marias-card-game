# How the PC Plays

This explains how the PC (Players 2 and 3 in Learning Mode vs PC) makes every choice. The code is in `src/app/pc-brain.ts`, and each rule has a test in `src/app/pc-brain.spec.ts`.

After each PC move, the game shows one line explaining it, such as *"Player 3 (PC) gave the 10♦ to partner Player 2, whose A♦ is the highest diamond left"*. The **Explanation** columns below show those lines.

There are two speeds. In **Fast**, the PC moves on its own after a short pause. In **Slow**, the game stops after every PC move, including picking trump and each buried card, and waits for you to click **Next** so you can read the explanation first. If it's your turn next, playing your card also counts as Next.

---

## What the PC knows

The PC plays fair. It only uses what a real player at the table would know:

- its own hand
- its own buried cards, if it is the caller
- every card played so far this round, and who played it
- who has **shown** they are out of a suit. A player who doesn't follow the suit that was led has none of it left. If they also didn't play a trump, they have no trumps left either.

From this it works out two things:

- **Cards still out:** cards it hasn't seen, which are in the other hands or in the other caller's bury. It counts these per suit. If it holds 5 diamonds, it knows only 3 are out.
- **Highest card left:** a card is the highest left in its suit when no card still out in that suit can beat it.

A count is not a split. If 2 clubs are still out, one player may hold both while the other has none and can trump. So the PC only says a point is **safe** when that's certain, for example when nobody has trumps left or only its partner plays after it. Otherwise its explanation says the card *should* win or *most likely* wins.

It does **not** look at the other hands, even though they're face up in Learning Mode. The game only hands it its own cards, and a test checks this. So it doesn't start out knowing **who** holds a missing card, such as the A of a suit. It only knows the card hasn't appeared yet, and it learns more as players fail to follow suit or play trumps.

**Working out who holds a card.** There are only two other players. Once one of them shows they're out of a suit, the rest of that suit must be with the other one, or in the caller's bury. An A or 10 can never be buried, so for those it knows exactly who has them. For example, if Player 3 trumped a heart, the A♥ and 10♥ still out are with Player 1.

## Variety

When several cards are equally good for its reason, it chooses among them at random. For example, with three 7s in different suits that are all safe to lead, it doesn't always lead the same one. This doesn't make it stronger, it just makes it less predictable. It only ever chooses between cards that are equally good. It never picks a worse card for variety.

## Keeping the highest trump

When a trick is already won, or any trump would win it, the PC doesn't spend a trump that no card still out can beat, such as the A of trump. That card will win a trick of its own later and bank its point then. It only cashes in point cards that could still be lost, such as a 10 of trump while the A of trump is still out, or a 10 or A of another suit that someone could trump later.

## How it ranks its own cards

When it needs to throw away its "lowest" card, it gives up cards in this order, keeping the most useful ones:

| Given up first ... | ... to last |
|---|---|
| 7, 8, 9, J, Q, K that aren't trump | marriage cards (a K or Q while it still holds the other one) → trumps → point cards (10, then A) |

So it holds on to trumps for later tricks, including the last trick (+1 point), and gives away points only on purpose.

---

## Picking trump

The caller sees its first 7 cards and scores each suit:

| In the suit | Score |
|---|---|
| each card | +3 |
| A | +4 |
| 10 | +3 |
| K | +2 |
| Q | +1 |
| both K and Q (a 4 point trump marriage) | +3 more |

It picks the highest score. **Spades** doubles what is won or lost, so it only picks Spades when Spades scores at least 2 more than the best other suit.

| Explanation | Example |
|---|---|
| picked *Suit* as trump: it holds *N* of them | including the A, and/or the K and Q for a 4 point marriage. Adds "Spades doubles the stakes" for Spades |

## Burying 2 cards

The caller buries one card at a time, choosing in this order:

1. Never an A or 10 (the rules forbid it).
2. Avoid trumps and half of a marriage, unless nothing else is left.
3. Prefer the card from its **shortest** suit, so it can run out of that suit and trump it later. Next, the lowest card. Remaining ties are chosen at random.

| Explanation | When |
|---|---|
| buried the *card* to run out of *Suit*, so it can trump them later | it was the last card of that suit |
| buried the *card*, a low card it can spare | otherwise |

---

## Playing a card

It always chooses from the legal cards. If only one is legal:

| Explanation |
|---|
| played the *card*, its only legal card |

Otherwise it depends on its position in the trick and who its partner is. The caller plays alone. The other two are partners, which changes every round as the caller rotates.

### Playing last (3rd)

Nobody plays after it, so it knows exactly what will happen.

| Situation | What it does | Explanation |
|---|---|---|
| partner is winning | gives them a 10 (or A) without taking the trick | gave the *card* to partner Player *N*, who is winning the trick |
| partner is winning, no point card to give | throws its lowest card | threw the *card*: partner Player *N* is already winning the trick |
| partner is winning, but the rules force it to go over | banks a point card that could be lost later. Otherwise it plays its lowest card that goes over, so it never spends the highest trump where any trump would do | had to go over partner Player *N*, so it played the *card* to bank its point, and the trick stays with the team. Or: … so it played its lowest card that does, the *card*, and the trick stays with the team |
| an opponent is winning and it can win with a point card that could be lost later | wins with it, so the point is banked | won the trick with the *card*, so its point is safe |
| an opponent is winning and it can win | wins with the cheapest card that does it | won the trick with the *card*, the cheapest card that wins, taking *N* points |
| the trick has no points and only a K, 10 or A of trump would win | keeps the high trump and lets the trick go | let the trick go with the *card*: it has no points, so it isn't worth the *trump* |
| it can't win | throws its lowest card | can't win the trick, so it threw its lowest card, the *card* |

### Playing 2nd

One player still plays after it.

| Situation | What it does | Explanation |
|---|---|---|
| partner led the highest card left, and the player after hasn't shown they can trump it | gives partner a 10 or A | gave the *card* to partner Player *N*, whose *card* is the highest *suit* left |
| partner led a card the last player could still beat, and it holds a point card that is the highest left in that suit (and the last player hasn't shown they can trump it) | **takes over** with it, banking the point now. It doesn't know who holds the cards still out: if its partner has the 10, the partner can bank it in a later trick, and if the opponent has it, the opponent may lose it to a trump | took over partner Player *N*'s *card* with the *card*: it's the highest *suit* left, so it banks its point now, while Player *N* most likely still has to follow suit |
| partner led, and every legal card goes over it | plays its lowest card that does | had to go over partner Player *N*'s *card*, so it played its lowest card that does, the *card* |
| partner led, otherwise | plays low under partner | played low with the *card* under partner Player *N*'s lead |
| an opponent led and its partner plays last, and partner has shown they're out of the led suit (and may still have trumps) | gives partner a 10 or A that doesn't win on its own, since partner will most likely trump | gave the *card* to partner Player *N*, who has shown they have no *suit* and can most likely trump the trick |
| an opponent led and its partner plays last, and it can win with a point card that could be lost later | wins with it. Only its partner plays after, so the point is safe | won with the *card*: only partner Player *N* plays after, so the point is safe |
| same, and the trick has points or it can win cheaply | takes the lead | took the lead with the *card*, with partner Player *N* still to play |
| same, otherwise | plays low and leaves it to partner | played low with the *card* and leaves the trick to partner Player *N* |
| it is the caller, and a card would win that no card still out can beat | wins with it, using a point card if it can | won with the *card*: no trump still out can beat it, or: it's the highest *suit* left and Player *N* hasn't shown they can trump it, so its point should be safe |
| it is the caller and the trick has points, but no winning card is safe | goes for the points anyway | went for the *N* points on the table with the *card* |
| it is the caller, otherwise | plays low | played low with the *card*: Player *N* could still beat a higher card |

### Leading (1st)

| Order | Situation | What it does | Explanation |
|---|---|---|---|
| 1 | it is the caller, holds 2 or more trumps, and holds **more trumps than are still out** | leads its top trump, if it's the highest left, to draw out the others' trumps | led the *card* to draw out the other players' trumps |
| 2 | it holds a 10 or A that is the highest left in its suit, but **2 or fewer** cards of that suit are still out, so someone has probably run out. It is the caller and holds at least as many trumps as are still out | draws trumps first, so the point card can't be trumped | led the *card* to draw out trumps first: only *N* *suit* are still out, so its *card* could be trumped |
| 3 | it holds a 10 or A that is the highest left in its suit, and no opponent has shown they can trump that suit | leads it to bank the point, from the suit with the **fewest cards still out** first, since that's the next one someone will run out of | led the *card*: it's the highest *suit* left and nobody has shown they can trump it, so it should win. When 3 or fewer are out: … With only *N* *suit* still out, someone may already have none and trump it, so it plays it now while it most likely still wins. When nobody has trumps left: … so its point is safe |
| 3b | it's a defender, and its partner has shown they're out of a suit (and may still have trumps) while the caller hasn't | leads its lowest card in that suit, so partner can trump it. The caller still has that suit, so has to follow instead of trumping. It prefers the suit where it knows the caller holds the A or 10 | led the *card* so partner Player *N* can trump it: Player *N* has shown they have no *suit*, so any *suit* still out that weren't buried are with Player *N*, including the *A and 10* |
| 4 | it holds a 10 but not the A, and the only card still out above one of its cards is the A. Nobody has shown they're out of that suit, and enough of the suit is still out | leads that card, usually the K, to **force out the A** (see below) | led the *card* to force out the A: whoever holds it has to go over, and then its 10 is the highest *suit* left |
| 5 | it has a low card (not trump, not a point card) in a suit no opponent has shown they can trump | leads one of its lowest, avoiding a suit with 2 or fewer cards out. Ties are chosen at random | led the *card* to keep its high cards for later |
| 6 | it holds a non-point card that is the highest left in its suit | leads it | led the *card*, the highest *suit* left |
| 7 | anything else | leads the card it can best spare | led the *card*, the card it could best spare |

- **A 10 is never led while the A is still out,** because rule 3 needs the 10 to be the highest card left.
- **A suit nobody else has:** if no cards of a suit are still out and the other players still have trumps, it doesn't lead its high card there. The others would simply trump it.

### Forcing out the A to free a 10

With the 10 but not the A of a suit, the PC leads the card just under the A, which is usually the K. The rules say a player who follows suit **must go over** the card led if they can. Here the only card that can go over is the A, because the PC holds the 10. So whoever holds the A has to play it, as long as they still have that suit. After that, the PC's 10 is the highest card left, and its point can be banked safely. If the A was buried by the caller, the K just wins.

The PC doesn't know who holds the A. It only does this when:
- the A hasn't appeared yet
- nobody has shown they're out of that suit and able to trump it, which it learns when a player fails to follow suit and plays a trump
- at least 3 cards of the suit are still out, so the A holder very likely still has the suit

---

## What it does not know yet

These are the known gaps, roughly from most to least important.

1. **Lone 10s still get trumped.** Over 20,000 simulated rounds, about 66% of 10s held without their A end up with their holder's team. About 70% of the rest are lost to **trumps**, not to the A, often when the 10 is the last card of its suit and the holder has to follow with it. Forcing out the A (above) only fixes the smaller part. Keeping a low card of the suit to follow with, or getting rid of the 10 before the suit runs short, would help more.
2. **No odds.** It treats a card as either safe (the highest left, and nobody has shown they can trump it) or not. It never weighs how likely it is that a player is out of a suit.
3. **Planning the last trick.** It keeps trumps by giving them up late, which usually leaves one for the last trick (+1 point), but it doesn't plan for it on purpose.
4. **Following its partner's signals.** It doesn't read anything into which low cards its partner throws.
5. **Rules not in the game yet.** The 7 of trump on the last trick bonus and bidding (no tricks, all tricks, and so on) aren't built, so the PC has no rules for them.

## Measured strength

Over 6,000 rounds for each pairing, simulated with the same rules as the game:

| Caller | Defenders | Caller wins | Caller's average points |
|---|---|---|---|
| random | random | 26.5% | 4.4 |
| **PC** | random | **62.5%** | 6.8 |
| random | **PC** | **16.4%** | 3.8 |
| PC | PC | 52.0% | 6.2 |

Working out who holds a card, and using it to set up partner's trumps, made the defenders a little stronger. Over the same 20,000 deals, the caller wins 52.8% against the new defenders against 53.5% before.

Adding the long-suit and lone-10 lead rules, plus variety, barely changed the totals. Over 20,000 rounds, the new rules keep slightly more lone 10s (65.9% against 65.7%), and the caller's win rate stays within a few tenths of a percent of the earlier PC. That's expected: these situations only come up now and then, and it's how a real player would play them.

## Changing how the PC plays

Change `src/app/pc-brain.ts`, add or update a test in `src/app/pc-brain.spec.ts`, and run the regression test (see `REGRESSION-TESTING.md`). Every Solo game must stay the same, and the vs PC games are expected to change. Save the new vs PC baseline in the same commit, and update this document to match.
