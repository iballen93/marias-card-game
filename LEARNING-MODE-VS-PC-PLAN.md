# Plan: Learning Mode vs PC

Goal: the user is always Player 1, and Players 2 and 3 are played by the computer (the "PC"). Every card stays face up because it's still Learning Mode. The current game becomes **Learning Mode Solo**, and **Standard** comes later.

---

## 1. Where things stand today

Some of the groundwork already exists, but most of the game logic sits inside `GameComponent`.

| What exists | Where | Useful for the PC? |
|---|---|---|
| Legal cards for any hand and trick | `ComputerPlayerService.getLegalCards()` | Yes. The PC only ever chooses from this list. |
| Move rules (follow suit, go over, trump, over-trump, bury limits) | `ValidationService` | Yes, but it's a shared object that is loaded with state and then asked questions (`loadCards()` then `validateMove()`), so it can't be used safely for "what if" simulations. |
| Trick winner | `GameComponent.determineRoundWinningCard()` | Yes, once it's moved into a plain function. |
| Points (A and 10 = 1, last trick = 1, marriage = 2, trump marriage = 4) | `PointsService` | Yes. The PC uses it to score options. |
| Random legal card picker | `GameComponent.getFastPlayCard()` | This is already a working "Easy" PC. |
| `versusComputer = false` | `GameComponent` | It's an unused flag. It will be replaced by a game mode (see section 3). |

These facts about how the game plays change what the PC has to do:

- **Rotating caller.** The caller rotates every round (`setToNextDealer`), and this stays the same in every mode (decided). In vs PC mode, the PC will be the caller two rounds out of three. That means the PC must be able to **pick trump** and **bury 2 cards**, not only play cards.
- **Changing teams.** Teams are the caller vs the other two, so they change each round. When Player 2 is the caller, Player 3 (PC) is **your partner** and should help you. That alone is most of what "intelligent" means here.
- **Marriages are scored automatically.** Playing a K or Q while still holding the other one scores the marriage, whichever is played first. The only way to lose a marriage is to **bury** half of it. So the PC must never bury a marriage card, and it never needs to "remember" to claim one.
- **Only trick cards score.** A and 10 can't be buried, so all 8 point cards always get played. Buried cards don't count for anyone.
- **No trick history.** The game doesn't record who played which card. Win piles are just stacks of cards. The PC needs that history to know when a player has run out of a suit (see 5.3).

---

## 2. Menu: New Game becomes a dropdown

Clicking **New Game** opens a small menu under it:

- **New Game (Learning Mode Solo)**: today's game, unchanged.
- **New Game (Learning Mode vs PC)**: the new mode.
- **New Game (Standard)**: shown greyed out with "Coming soon" until it's built (decided). It can't be clicked.

How it works:

- Each option goes to its own route: `/game/learning-solo`, `/game/learning-pc` and `/game/standard`. The current `/game` and `''` routes redirect to `/game/learning-solo`, so old links and the app's first screen still work.
- `NewGameRouteReuseStrategy` currently checks `path === 'game'`. It needs to match the three new paths so that choosing any New Game option always starts fresh.
- The menu closes when you pick an option, tap outside it, or press Escape. On phones in landscape, the nav is only about 20px tall, so the menu has to open as an overlay above the board and must not push the board down.
- Files: `app.component.html/.less/.ts`, `app-routing.module.ts`.

---

## 3. New toggles and settings

**Required:**

| Setting | Values | Default | Notes |
|---|---|---|---|
| `gameMode` | `learning-solo`, `learning-pc`, `standard` | from the route | Replaces `versusComputer`. Everything below comes from it. |
| `humanSeats` | the set of seats you control | Solo: `{1,2,3}`; vs PC: `{1}` | Not shown to the user. It's how the code asks "is this seat a person?" Keeping it a set allows "you play any seat" later. |
| `cardsFaceUp` | true or false | true in both Learning modes | Already true everywhere. Standard will turn it off for the piles you choose later. |

**New in vs PC mode** (I recommend shipping these as fixed defaults first and adding a settings screen later):

| Setting | Values | Suggested default | Why |
|---|---|---|---|
| `pcLevel` | Easy (random legal card), Normal (rules and card memory), Hard (simulation, later) | Normal | Easy is nearly free (Fast Play already does it), and it's useful as a test opponent. |
| `pcSpeed` | Fast (~400ms), Normal (~900ms) | Normal | Timed moves only. A Step mode (waiting for a tap on Next) was decided against. |
| `pcPlaysFair` | true: the PC only uses what a real player would know. false: the PC reads every face-up hand. | **true** (decided) | The cards are face up so *you* can learn, not so the PC can cheat. The all-seeing PC stays an option, as a "perfect play" teacher or for checking Hard. |
| `explainPcMoves` | on or off | on (in the first version, decided) | Shows one line under the trick, such as "Player 3 threw the 10♥ because partner Player 1 is winning the trick." This is the biggest learning benefit of the mode. |
| `showPcLegalCards` | on or off | off | Today, "Legal Cards" is shown on every turn. In vs PC mode, showing it only on your turn makes the board less cluttered. |

**Existing behaviour that changes in vs PC mode:**

- **Card clicks:** clicks on Player 2 or 3 cards are ignored. Because the hands are face up, today any visible card can be clicked on its owner's turn.
- **Seat labels:** "Player 2 (PC)" and "Player 3 (PC)". Player 1 could become "You".
- **Fast Play:** should play *your* cards at random and the PC's cards with the PC logic (or with Easy). It mainly remains a testing tool.
- **Play Again:** keeps the same mode, and money carries over as it does today.

---

## 4. Running the PC's turns

A small **turn loop** in `GameComponent`, without changing how the game already works:

1. Every change to the board runs through `animateCardMoves()`. At the end of it, call `schedulePcTurnIfNeeded()`.
2. If the active seat is a PC, and the game isn't showing a finished hand or waiting for Play Again, start one timer.
3. When the timer fires, ask the PC what to do and send the result through the **same path a click uses** (`handleCardSelected`). Animations, marriages, the rules and messages then all behave exactly as they do for you.
4. When it's your turn, nothing is scheduled, and the game waits for your click.

The PC has three kinds of decision, all of which already exist as card clicks:

| Phase | Today | PC version |
|---|---|---|
| Pick trump | click any card; its suit becomes trump | `chooseTrump(hand)` → a card of the chosen suit |
| Bury 2 | two clicks | `chooseBury(hand, trump)` → two cards, sent one after the other |
| Play | click a legal card | `chooseCard(view)` → one of the legal cards |

Housekeeping:

- Keep the timer handle so it can be cleared on Play Again, New Game and when leaving the page. `isDestroyed` already does this for the end-of-hand timer.
- If the PC ever returns a card that isn't legal, which would be a bug, log it and fall back to a random legal card so the game never freezes.

---

## 5. PC logic

### 5.1 Should we define a card priority?

**Yes, but a single fixed order isn't enough.** A fixed list like "always throw 7s first" plays reasonably, but it makes obvious mistakes. For example, it would throw a 10 onto a trick the opponents are winning, or fail to give points to a partner who is winning. The PC needs three building blocks:

1. **Card strength:** this already exists as `cardPriority` (A > 10 > K > Q > J > 9 > 8 > 7), with trump beating all other suits.
2. **Card value (what it costs to give away):**

   | Card | Value | Reason |
   |---|---|---|
   | A, 10 | high | 1 point each and the main goal of the game |
   | K or Q **with its partner still in hand** | medium | It can still score the marriage when played (2 points, or 4 for trump) |
   | Trump (any rank) | medium-high | It wins tricks later and protects the last trick |
   | K, Q, J, 9, 8, 7 (not trump) | low, in that order | No points |

3. **The situation:** which player is winning the trick, whether that player is a partner, the PC's position in the trick (1st, 2nd or 3rd), which cards are still out, and which players have run out of a suit.

The PC adds these into a score for each legal card and plays the highest. This keeps every decision explainable, which `explainPcMoves` needs.

### 5.2 Normal level: rules by position

**Playing last (3rd).** This position is exact, because only one move is left:
- **Partner is winning:** give them points. Play an A or 10 if one is legal; otherwise play the lowest-value card. (The "must go over" rule sometimes forces you to beat your own partner. The legal list already handles that.)
- **An opponent is winning and the PC can win:** win with the **cheapest** winning card. Use the lowest card in suit before using trump, and the lowest trump before a high trump. If the trick has no points and winning would use a high trump, it may be better to lose, if a losing card is legal.
- **The PC can't win:** play the lowest-value card and keep its A and 10.

**Playing 2nd.** Who plays 3rd matters:
- **The PC is the caller (both other players are opponents):** win if it can play a card that the 3rd player probably can't beat (see 5.3: the highest card left in the suit, or a trump when the 3rd player still has that suit). Otherwise play low.
- **The leader is the caller and the 3rd player is the PC's partner:** win cheaply if it's safe. Otherwise play low, because the partner plays after the caller and can still win.
- **The leader is the partner and the 3rd player is the caller:** if the partner's card will very likely win (it's the highest left in the suit, and the caller can't trump it), give it points. Otherwise play low.

**Leading (1st):**
- **As the caller:** if it holds most of the trumps, lead a high trump to draw the opponents' trumps out, then win with the highest cards left in its other suits. Keep one trump for the **last trick** (+1 point).
- **As a defender:** lead the highest card left in a suit, or lead low from a long suit so the caller has to use trump. Avoid leading a suit the caller has already shown they don't have, because they'll just trump it.
- **Always:** don't lead a 10 while the A of that suit is still out (an opponent would win it).

**Pick trump** (the caller sees 7 cards). Score each suit in hand and pick the best:
`3 × cards in the suit + 4 if it has the A + 3 for the 10 + 2 for the K + 1 for the Q + 3 more if it has both K and Q (trump marriage)`.
Spades doubles the stakes in both directions, so only pick Spades if it's clearly the best suit (for example, at least 2 points ahead).

**Bury 2** (from 12 cards; A and 10 aren't allowed):
- Never bury trump or half of a marriage.
- Prefer cards that **empty a suit that isn't trump**, so the caller can trump that suit later. Bury single or paired low cards from short suits.
- After that, bury the lowest cards.

### 5.3 Card memory (what makes the PC look smart)

Using only what a real player would know (`pcPlaysFair = true`):

- **Cards played:** every card in the win piles plus the cards on the table.
- **Highest card left in each suit:** the strongest card in that suit that hasn't been played and isn't in the PC's own hand.
- **Empty suits:** if a player doesn't follow the lead suit, they have none of it left. If they also don't play trump, they have no trump left. This is what needs **trick history**, so the game needs a new `trickHistory: { leader, cards[] }[]` alongside the win piles. It's cheap to add in `collectCompletedHand`.
- **Trumps still out:** 8, minus the trumps played, minus the trumps in the PC's own hand.

### 5.4 Hard level (optional, later)

When the PC isn't cheating, it guesses the unseen cards hundreds of times. Each guess deals the unseen cards in a way that fits everything known, including the empty suits. It then plays each guess to the end with the Normal rules for every player and picks the card with the best average result. With 30 cards and 10 tricks, this is fast enough in the browser (well under 100ms on a phone). If `pcPlaysFair` is off, the PC can work out the best play exactly near the end of the round.

Hard needs the game rules as **plain functions** that don't touch the page (see 6.2). That refactor is the real cost of Hard; the simulation itself is small.

---

## 6. Build order

Each step leaves the game working.

| # | Step | Size | Done when |
|---|---|---|---|
| 1 | **Menu and routes.** Dropdown, 3 routes, `gameMode`, Standard greyed out. | S | All three menu options work; Solo is unchanged. |
| 2 | **Game rules as plain functions.** Move `getLegalCards` (without the shared `ValidationService` state), the trick winner and the points maths into stateless functions. `GameComponent` and `ValidationService` call them. Add `trickHistory`. | M | The existing 47 tests pass, plus new tests for the moved code. |
| 3 | **Turn loop with the Easy PC.** `humanSeats`, ignoring clicks on PC cards, the PC timer, trump/bury/play using random legal choices, and "(PC)" labels. | M | A full vs PC round plays to the end, with PC callers too. |
| 4 | **Normal PC with explanations.** Card value, card memory, the rules in 5.2, and trump and bury choices. Each choice returns its reason, shown as the `explainPcMoves` line. | L | Unit tests for each rule (e.g. "gives the partner a 10 when the partner wins as 3rd"), every PC move shows its reason, and the Step 6 check passes. |
| 5 | **Finishing touches.** Legal cards shown only on your turn, PC speed, Fast Play rules. | S | |
| 6 | **Tuning check.** A test-only script that plays thousands of rounds of Normal vs Easy without showing them, and reports the win rate and average points as caller and defender. | S | Normal clearly beats Easy. The numbers are a starting point for adjusting the weights. |
| 7 | *(Later)* Hard PC and a settings screen for the toggles. | M–L | |

**Status (November 2026):** steps 1 to 6 are done.

- Step 5 changed along the way. Instead of a speed setting, the menu has **vs PC Slow** (waits for you to click Next after every PC move) and **vs PC Fast**. Instead of hiding the Legal Cards text on PC turns, the legal cards are lifted on every player's turn and the text is gone. Fast Play plays the PC seats with the PC's strategy and only your cards at random.
- Step 6 is `npm run strength` (see "Measuring strength" in `PC-STRATEGY.md`), which compares the PC with random play and with any earlier version of itself.
- Solo is now called **Practice (play all 3 hands)**, and the app opens on vs PC Slow.

---

## 7. Risks and things to watch

- **`GameComponent` does a lot**, and the rules and animations are mixed together. Step 2 exists so the PC can reuse the rules without starting animations or timers.
- **`ValidationService` holds state** (`loadCards`). If the PC uses it while thinking, it could overwrite the state for a move that is in progress. Using plain functions avoids this.
- **Timers vs leaving the page.** A PC timer firing after New Game or Play Again would play a card in the wrong game. Always clear the timer and check `isDestroyed`.
- **The same card object is in two piles.** A marriage card is in both the marriage pile and the trick or win pile. Card memory must count it only once.
- **Phone layout:** a PC explanation line uses the message area at the top centre, so it needs the same size limits as the other messages.

---

## 8. Decisions and open questions

**Decided:**
- The caller keeps rotating every round in every mode, including vs PC.
- Standard appears in the menu greyed out ("Coming soon") until it's built.
- The PC plays fair by default: it only uses what a real player would know. The all-seeing PC stays an option.
- No Step mode. PC moves are timed.
- The "why the PC played that" line is part of the first version.
- The 7 of trump on the last trick bonus and bidding are left out for now. They'll be built later, and the PC will need rules for them then.

No questions are open.
