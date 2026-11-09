# Regression Testing

Run the game regression test **before and after every change**. It shows whether a new feature or a refactor changed how the game plays.

## What it does

`src/app/regression/game-regression.spec.ts` plays seeded games of 3 rounds each through the real game code. Each round covers picking trump, burying, every trick and the final scoring. It takes about 20 seconds.

- **Learning Mode Solo** (the **Practice** option in the menu): 1,000 games (3,000 rounds). Every seat plays a random legal card.
- **Learning Mode vs PC:** 500 games (1,500 rounds). Your seat plays a random legal card, and Players 2 and 3 make the PC's own moves.

- **Seeded:** the random numbers used to shuffle and choose cards come from a fixed seed, so every run deals and plays exactly the same games.
- **Fingerprinted:** each game becomes one short fingerprint. That fingerprint covers trump, the caller, the buried cards, every card played and by whom, the win and marriage piles, points, money and the end-of-round message.
- **Compared:** the fingerprints are checked against `src/app/regression/regression-baseline.ts`, which has one list per mode. If any differ, the test fails, names the seeds that changed, and prints the first changed game.
- **Rule checks:** whatever the baseline says, every round must also have 30 cards won, exactly 2 buried cards, no buried A or 10, and the same total money as at the start.

## Running it

Set up the shell the same way as for `ng s`:

```
$env:NODE_OPTIONS="--openssl-legacy-provider"
$env:CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

| Command | What it does |
|---|---|
| `npm run regression` | Runs only the regression test. |
| `npm test` | Runs every unit test, including the regression test. |
| `npm run regression:baseline` | Saves the current results as the new baseline. Use this only when a change is **meant** to change how games play. |

All three need Node 20, as in the README.

## Workflow for every change

1. **Before:** run `npm run regression` on the code as it is. It should pass. If it doesn't, sort that out first, so later failures can't be blamed on your change.
2. Make the change.
3. **After:** run `npm run regression` again.
   - **It passes:** the change didn't affect how games play. This is the result to expect from refactors, layout and menu work.
   - **Only one mode changed:** expected when a change is meant for that mode alone. For example, making the PC smarter must change vs PC games and leave every Solo game the same.
   - **It fails and the change wasn't meant to change play:** that's a bug. Use the printed seed and its round details to find it.
   - **It fails and the change was meant to change play** (a rule fix or new scoring, for example): check that the first changed game shows the difference you expected. Then run `npm run regression:baseline` and commit the new baseline **in the same commit** as the change, with the reason in the commit message.

## Comparing with an older commit

To check a refactor against the code from before it, which is how step 2 of the vs PC plan was checked, record the baseline from the older commit in a separate copy of the repo:

```
git worktree add --detach ..\before <older-commit>
cmd /c mklink /J ..\before\node_modules node_modules
# copy src\app\regression\ and scripts\regression-baseline.js into ..\before if that commit doesn't have them
cd ..\before; npm run regression:baseline; cd ..\marias-card-game
copy ..\before\src\app\regression\regression-baseline.ts src\app\regression\
npm run regression
git worktree remove --force ..\before
```

If `npm run regression` passes, the newer code plays every round exactly as the older code did.

## Things to know

- The test replaces `Math.random` while it runs. Adding a new random step anywhere in a round (such as a PC choice) changes the results on purpose, so update the baseline when that's intended.
- The vs PC games use whatever the PC currently does. When the PC's choices change, those fingerprints are meant to change, while Solo's must not.
- This test doesn't check the screen layout. Layout changes are checked separately by playing rounds in a browser at several screen sizes.
