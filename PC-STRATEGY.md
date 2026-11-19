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

## Announcing: the Game or the 100, and the 7

After burying, the caller announces. There are three separate bets, and spades doubles each of them:

| Bet | Worth, from each defender | Notes |
|---|---|---|
| **Game** | 2 cents | Whoever has more points wins it. A side reaching 100 (10 points here) without calling it, a **silent 100**, doubles the Game, and it doubles again for every 10 over (11, 12, ... points). Either side can do this, the two defenders' points added together. |
| **100** | 8 cents | Called instead of the Game, which it replaces completely. The caller alone must reach 100. The win doubles for every 10 over 100. A miss loses the 8 cents once, however far short. No marriage is needed to call it. |
| **7 of trump** | 2 cents silent, 4 called | Scores when it wins the last trick, and costs the same when beaten there. A called 7 that isn't played in the last trick counts as lost. Only the caller can call it. A defender's 7 is always silent. |

How the PC announces:

| Explanation | When |
|---|---|
| called the 100: its marriages and point cards already add up to about *N* points | its marriages, A and 10s, plus 1 for the last trick when it holds 5 or more trumps, add up to 9 or more |
| called the *7*: with *N* trumps it expects to keep the *7* for the last trick | it holds the 7 of trump and 5 or more trumps (after the 100's reason when it called that too) |
| kept the *7* silent: with only *N* trumps, it could be beaten on the last trick | it holds the 7 of trump and fewer trumps |
| is playing the Game: its marriages and point cards add up to about *N* points, short of the 100 | it calls nothing extra and doesn't hold the 7 |

The count leaves out points it may win from the defenders, so it is cautious. Measured with `npm run strength`, calling the 100 at 9 paid best: the PC calls it in about 7% of rounds as caller and makes it about 73% of the time against the PC. Calling at 8 or 10 paid less.

**Keeping the 7.** As caller, the PC gives up the 7 of trump last, just before its point cards, so it is still there for the last trick. As a defender it does the opposite and plays the 7 early as its lowest trump: on the last trick the caller's higher trumps would usually beat it, and a beaten 7 costs the defenders. Measured with `npm run strength`, keeping the 7 as caller earns about 1.5 cents a round from the 7, while keeping it as a defender lost money.

## No Tricks and All Tricks

After burying, the caller can play **No Tricks** (take no trick at all) or **All Tricks** (take every trick) instead of the Game, either one open (cards face up from the start) for double. There's no trump, the 10 drops below the J (A K Q J 10 9 8 7), marriages, the 7 and the 100 don't count, and the round ends as soon as it's decided. Players still have to follow suit and go higher if they can. The caller leads.

| Contract | Worth, from each defender |
|---|---|
| No Tricks | 6 cents |
| All Tricks | 10 cents |
| Open No Tricks | 12 cents |
| All Tricks Show | 20 cents |

Spades doesn't double these, since there's no trump. After the caller's bid, each of the others in turn, starting with the one who plays after the caller, may **take over** with a higher contract (Game < No Tricks < All Tricks < Open No Tricks < All Tricks Show). Whoever takes over picks up the caller's 2 buried cards, buries 2 (an A or 10 is allowed, since points don't count), and becomes the caller; then the others may take over from them. Once everyone passes, the stakes can be raised on the contract that stands. The rules are in `src/app/rules.ts`.

How the PC decides (`pc-brain.ts`):

| Contract | When the PC calls it, or takes over with it |
|---|---|
| All Tricks Show | every suit it holds runs unbroken down from the A. It leads every trick, and each card it leads is the highest of its suit still out, so it can't lose, even open. |
| No Tricks | at most 3 **dangerous cards**, and, as the caller, a hand worth 5 points or fewer in the Game |
| All Tricks or Open No Tricks | never: not measured yet |

A card is **dangerous** in No Tricks when the PC doesn't hold every lower card of its suit. Since a player who can go higher than the card to beat must, a gap lets a defender lead a card in it and force the PC over. Measured over 200,000 deals, played out by the PC on both sides, No Tricks is won about:

| Dangerous cards | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Won | 93% | 90% | 77% | 66% | 59% | 48% |

It pays 6 cents either way, so anything over half beats a weak hand in the Game; the PC stops at 3 to leave room for defenders who play better than it does.

The caller and a player taking over hold 12 cards and bury 2, so the PC first looks for 2 cards to bury that would leave such a hand. The caller can't bury an A or 10, since it might still have to play the Game.

The PC raises its own No Tricks only with at most 1 dangerous card, and All Tricks only when it's sure. As a defender it says Kontra when its own hand, or the caller's cards in an open contract, show the caller will fail:

- **All Tricks:** a defender's A wins a trick in any suit the caller holds, since the caller has to lead that suit at some point and the defender has to go over it. So the caller can only be safe in suits where it holds the A. With 3 aces in one defender's hand, the one suit left has 8 cards and the caller holds 10, so the defender is sure to win a trick. With 2 aces the two suits left have 16 cards, so a caller with all 10 of its cards there could still win; the defender only says Kontra when it holds 7 or more of those 16 itself, leaving the caller 9 at most.
- **All Tricks Show:** it checks each suit of the caller's face-up cards: a card higher than one of the caller's, with enough other cards of the suit to follow the caller's higher ones first, wins a trick.
- **Open No Tricks:** it counts the caller's dangerous cards, and says Kontra at 6 or more, where No Tricks is lost more often than won.
- **No Tricks:** it passes. Without seeing the caller's cards, its own hand doesn't tell it whether the caller will have to take a trick.

How it plays them:

- **No Tricks, caller:** leads its lowest card from its shortest suit, so the defenders have to go over it, then gets rid of its highest card that still stays under each trick.
- **No Tricks, defender:** plays low, so the caller has to go over the trick; when the caller is already winning a trick, it stays under with its highest card.
- **All Tricks, caller:** leads its strongest card.
- **All Tricks, defender:** beats the caller's card with its lowest card that can; otherwise plays its lowest card.

## Raising the stakes: Kontra, Re, Supre

After the bid, each announced bet can be raised: the Game (or the called 100, which replaces it) and a called 7. A silent 7 can't be raised. Every raise doubles that bet, up to six raises: **Kontra, Re, Supre, Kontra More, Re More, Supre More**. The defenders make the 1st, 3rd and 5th raises and the caller the 2nd, 4th and 6th. A defender's raise counts for both defenders. On the defenders' turn, the defender who plays after the caller speaks first, and the other one only gets a say on a bet the first one passed. A side that passes a bet ends the raising on it. The rules are in `src/app/raising.ts`.

How the PC raises (`chooseRaises` in `pc-brain.ts`):

| Who | Bet | Raises when |
|---|---|---|
| caller | the Game | it expects 8 or more points (the count used for the 100 above) |
| caller | the 100 | it expects 10 or more points |
| caller | the 7 | it holds 6 or more trumps |
| defender | the Game | it holds 5 or more points of its own: marriages, A and 10s |
| defender | the 100 | it holds 7 or more points of its own |
| defender | the 7 | it holds 4 or more trumps |

Each later raise by the same side asks for 1 more (the caller) or 2 more (a defender), since every raise doubles what a wrong guess costs, and a caller who answered with Re usually has the Game.

Measured over 20,000 PC-against-PC rounds, grouping each hand by these counts and seeing which side won:

- The caller wins the Game about 77% of the time when it expects 7 points, and 87% at 8. A called 100 it expects 10 for wins on average by far. A called 7 with 6 trumps wins about 83% of the time.
- The defenders win the Game about 57% of the time when one of them holds 4 points of its own, and 66% at 5.
- Against a called 7 or 100, what the defender's hand is worth depends on how the caller called it. A person may call without the hand for it, so the PC judges its own hand against a loose caller, one that calls the 7 whenever it holds it and the 100 at 6 expected points. Over 30,000 rounds against that caller, a defender with 4 trumps beats a called 7 about 90% of the time, and a defender with 7 points of its own comes out ahead against a called 100 (6 is about even, and loses clearly against the PC's own calls). Against the PC's own calls these rarely come up: the PC calls the 7 with 5 trumps, leaving a defender 3 at most, and a defender holds 7 points against a PC's called 100 in under 1% of them.

Played out between the PCs on both sides, the defenders say Kontra on the Game in about 37% of rounds, which costs the caller about 4.75 cents a round from each defender in those rounds. The caller answers with Re in about 6% of those, and gains about 10 cents a round from each defender there.

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
| partner is winning, but the rules force it to go over | banks a point card that could be lost later. Otherwise it plays its lowest card that goes over, so it never spends the highest trump where any trump would do | had to go over partner Player *N*'s *card*, so it played its lowest *suit* that does, the *card*, and the trick stays with the team. With none of the suit led: had no *suit*, so it had to trump partner Player *N*'s *card*, and used its lowest trump, the *card*, … When it banks a point: … and used the *card* to bank its point, … |
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
| partner led, and every legal card goes over it | plays its lowest card that does | had to go over partner Player *N*'s *card*, so it played its lowest *suit* that does, the *card*. With none of the suit led: had no *suit*, so it had to trump partner Player *N*'s *card*, and used its lowest trump, the *card* |
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
5. **No Tricks and All Tricks are basic.** It only plays All Tricks when it can't lose, which is very rare, and never plays Open No Tricks. Its No Tricks play doesn't track which cards are still out.
6. **Playing against a called 7 or 100.** The defenders don't yet play differently when the caller has called the 7 or the 100, such as keeping a higher trump for the last trick, or fighting harder for points.
7. **Raising is decided on counts alone.** It doesn't take into account who raised before it, or how the caller bid. A defender facing a Re still only looks at its own points.

## Measured strength

From `npm run strength`, 20,000 rounds for each pairing, with the same deals in every row:

| Caller | Defenders | Caller wins | Caller's average points | Defenders' average points |
|---|---|---|---|---|
| random | random | 27.3% | 4.4 | 7.2 |
| **PC** | random | **63.7%** | 6.9 | 5.4 |
| random | **PC** | **15.2%** | 3.7 | 7.9 |
| PC | PC | 50.2% | 6.1 | 6.1 |

How some changes measured when they were made:

- **Working out who holds a card**, and using it to set up partner's trumps, made the defenders a little stronger: the caller won 52.8% against the new defenders, against 53.5% before.
- **The long-suit and lone-10 lead rules, plus variety**, barely changed the totals. The new rules keep slightly more lone 10s (65.9% against 65.7%). That's expected: these situations only come up now and then, and it's how a real player would play them.

## Measuring strength

`npm run strength` plays thousands of rounds without showing them, and prints how often the caller wins, the average points on each side, the money the caller collected per round (the Game or the 100, and the 7), and how often the caller called and made the 100. It takes about 30 seconds.

- `npm run strength` compares the PC with random play, and with itself.
- `npm run strength -- --against HEAD` also compares the PC as it is now with the PC in a git commit, such as `HEAD` (the last commit), `main~3` or a commit hash. Use it after changing `pc-brain.ts`: if the new PC is stronger, the caller wins more often when the new PC calls, and less often when the new PC defends.
- `npm run strength -- --rounds 5000` gives a quicker, rougher answer.

Scoring follows the game: 1 point for each A and 10 won, 1 for the last trick, and 2 for a marriage (4 in trump). The caller wins with more points than both defenders together. Every row plays the same deals with the same random numbers, so two identical PCs score exactly the same, and any difference between rows comes from how they play. A difference of a few tenths of a percent is about the size of the noise.

The simulation is in `src/app/regression/pc-strength.ts`. A quick version runs with the normal tests and checks that the PC still clearly beats random play.

## Changing how the PC plays

Change `src/app/pc-brain.ts`, add or update a test in `src/app/pc-brain.spec.ts`, run the regression test (see `REGRESSION-TESTING.md`), and run `npm run strength -- --against HEAD` to see whether it plays better. Every Solo game must stay the same, and the vs PC games are expected to change. Save the new vs PC baseline in the same commit, and update this document to match.
