# How to Install on an iPad (Home Screen Web App)

The game runs on an iPad as a **home screen web app**: a website that, once added to the home screen, opens full screen
like an app and keeps working offline. There's no `.ipa`, no Apple ID, no signing and no 7-day expiry.

It is published at **https://iballen93.github.io/marias-card-game/**. The address is public.

## Installing (once)

1. On the iPad, open **Safari** (it has to be Safari) and go to https://iballen93.github.io/marias-card-game/
2. Tap **Share** (the square with the arrow) → **Add to Home Screen** → **Add**.
3. Open the game from its new **Mariáš** icon. It opens full screen, without Safari's address bar.
4. Leave it open for a few seconds the first time, with internet: it saves all its files on the iPad then. After that it
   starts and plays with no internet at all.

The same address works on an Android phone too: Chrome → ⋮ → **Add to Home screen** (or **Install app**).

## Updating

Every push to `main` publishes the new version through `.github/workflows/pages.yml` (about 2 minutes; watch it under
the repo's **Actions** tab). The next time the iPad opens the game with internet, it fetches the update in the background,
and uses it from the launch after that. To pick it up straight away, close the game (swipe it away in the app switcher)
and open it again, twice.

## How it works

| Piece | What it does |
|---|---|
| `src/manifest.webmanifest` | The name, icon, colours and full-screen mode the home screen uses |
| `src/index.html` | Apple's own home screen tags and icon (`assets/icons/icon-180.png`) |
| `ngsw-config.json` | Angular's service worker: which files to save on the device for offline play (all of them) |
| `src/environments/environment.pages.ts` | Turns the service worker on, only for this build |
| `angular.json` → `pages` configuration | Builds into `dist/pages`, for the `/marias-card-game/` address |
| `.github/workflows/pages.yml` | Builds and publishes on each push to `main`; copies `index.html` to `404.html` so addresses like `/game/standard` load the game |

The Android app (`ng build --prod`, see `EXPORTING-TO-ANDROID.md`) and `ng serve` don't use the service worker, and are
unchanged.

To try the web app build locally: `ng build --configuration pages`, then serve `dist/pages` under `/marias-card-game/`.
The service worker only runs on `localhost` or HTTPS.

## Limits

- **The first visit needs internet**, and so does picking up an update.
- **No screen lock to landscape.** iPads can't lock a web app's orientation. Held upright, the game uses its portrait
  layout; on an iPad mini (narrower than 768px) it asks you to rotate, as phones do.
- **Money and the round in progress aren't saved** between launches, the same as in the browser.
- The icons in `src/assets/icons/` were made from the game's own King and Queen of hearts (MIT licensed, see
  `src/assets/cards/LICENSE.txt`).
