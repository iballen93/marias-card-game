# How the PC Plays

This explains how the PC (Players 2 and 3 in Learning Mode vs PC) makes every choice. The code is in `src/app/pc-brain.ts`, and each rule has a test in `src/app/pc-brain.spec.ts`.

After each PC move, the game shows one line explaining it, such as *"Player 3 (PC) gave the 10♦ to partner Player 2, whose A♦ is the highest diamond left"*. The **Explanation** columns below show those lines.

---

## What the PC knows

The PC plays fair. It only uses what a real player at the table would know:

- its own hand
- its own buried cards, if it is the caller
- every card played so far this round, and who played it
- who has **shown** they are out of a suit. A player who doesn't follow the suit that was led has none of it left. If they also didn't play a trump, they have no trumps left either.

From this it works out two things:

- **Cards still out:** cards it hasn't seen, which are in the other hands or in the other caller's bury.
- **Highest card left:** a card is the highest left in its suit when no card still out in that suit can beat it.

It does **not** look at the other hands, even though they're face up in Learning Mode.

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
3. Prefer the card from its **shortest** suit, so it can run out of that suit and trump it later. Ties go to the lowest card.

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
| partner is winning, but the rules force it to go over | plays a point card if it can, since the trick stays with the team | had to go over partner Player *N*, so it played the *card* and the trick stays with the team |
| an opponent is winning and it can win with a point card | wins with it, so the point is banked | won the trick with the *card*, so its point is safe |
| an opponent is winning and it can win | wins with the cheapest card that does it | won the trick with the *card*, the cheapest card that wins, taking *N* points |
| the trick has no points and only a K, 10 or A of trump would win | keeps the high trump and lets the trick go | let the trick go with the *card*: it has no points, so it isn't worth the *trump* |
| it can't win | throws its lowest card | can't win the trick, so it threw its lowest card, the *card* |

### Playing 2nd

One player still plays after it.

| Situation | What it does | Explanation |
|---|---|---|
| partner led the highest card left, and the player after hasn't shown they can trump it | gives partner a 10 or A | gave the *card* to partner Player *N*, whose *card* is the highest *suit* left |
| partner led, otherwise | plays low under partner | played low with the *card* under partner Player *N*'s lead |
| an opponent led and its partner plays last, and it can win with a point card | wins with it. Only its partner plays after, so the point is safe | won with the *card*: only partner Player *N* plays after, so the point is safe |
| same, and the trick has points or it can win cheaply | takes the lead | took the lead with the *card*, with partner Player *N* still to play |
| same, otherwise | plays low and leaves it to partner | played low with the *card* and leaves the trick to partner Player *N* |
| it is the caller, and a card would win that no card still out can beat | wins with it, using a point card if it can | won with the *card*: no card still out can beat it |
| it is the caller and the trick has points, but no winning card is safe | goes for the points anyway | went for the *N* points on the table with the *card* |
| it is the caller, otherwise | plays low | played low with the *card*: Player *N* could still beat a higher card |

### Leading (1st)

| Order | Situation | What it does | Explanation |
|---|---|---|---|
| 1 | it is the caller, holds 2 or more trumps, and holds **more trumps than are still out** | leads its top trump, if it's the highest left, to draw out the others' trumps | led the *card* to draw out the other players' trumps |
| 2 | it holds a 10 or A that is the highest left in its suit, and no opponent has shown they can trump that suit | leads it to bank the point | led the *card*: it's the highest *suit* left, so its point is safe |
| 3 | it has a low card (not trump, not a point card) in a suit no opponent has shown they can trump | leads its lowest. Ties go to its longest suit | led the *card* to keep its high cards for later |
| 4 | it holds a non-point card that is the highest left in its suit | leads it | led the *card*, the highest *suit* left |
| 5 | anything else | leads the card it can best spare | led the *card*, the card it could best spare |

A 10 is never led while the A of that suit is still out, because rule 2 needs the 10 to be the highest card left.

---

## What it does not know yet

These are the known gaps, roughly from most to least important.

1. **Long suits get trumped.** It doesn't think about how many cards of a suit are still out. If it holds 5 diamonds, only 3 are left between the other two players, so one of them is likely to run out soon and trump the next diamond. The PC only avoids a suit after a player has **shown** they're out of it. As a result:
   - It does lead an A or 10 first when that card is the highest left (rule 2 above), which banks the point early. It does this because the card is safe now, not because the suit is long.
   - It doesn't draw trumps to protect a long side suit. It only draws trumps as caller when it holds more trumps than are still out.
   - When leading low, ties go to its **longest** suit, which leads into the danger instead of away from it.
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

## Changing how the PC plays

Change `src/app/pc-brain.ts`, add or update a test in `src/app/pc-brain.spec.ts`, and run the regression test (see `REGRESSION-TESTING.md`). Every Solo game must stay the same, and the vs PC games are expected to change. Save the new vs PC baseline in the same commit, and update this document to match.
