# GetSchool Entrepreneurship Academy

Experience is the education. Learners walk a living 2.5D town and run a shop in real time: walk or take a keke to the market, haggle with traders, carry goods back (or hire a truck pusher), order deliveries from the distributor or factory, hire a nwa boi to mind the shop and call customers, run sampling, borrow from the bank and set prices while customers walk from their homes to the shop they prefer. They earn a certificate based on five competence scores.

## What is inside

* Public page (`/`), Sign in, Create account
* App (`/app`): Home, Entrepreneur journey (4 levels, 3 premium challenges), Leaderboard, Certificates, Premium
* Game (`/app/play/...`): split screen. Toolkit on the left (Map and here, Shop and prices, Nwa boi and sampling, Money, Day reports, Coach, How to play, Leave game), the living town in the middle, and on the right what you can do where you stand (buy at a supplier, borrow at the bank, ride a keke, see a rival's prices). A day lasts about 3 minutes (speed 1x, 2x, 4x or pause). The only pop up is the "Leave the game?" confirmation.
* Public certificate check: `/verify/<code>` (print or save as PDF)
* English and French (globe icon)
* Town map and paths: `src/world/map.js`; live simulation: `src/world/sim.js`; drawing: `src/world/render.js`; levels and costs: `src/world/levels.js`; products and suppliers: `src/game/data.js`
* Server: `api/academy.js`, a Vercel function that deploys with the site

## Farmer journey (`/app/farm`)

* A farm that lives on real time. The sky follows the learner's own clock (sun, dusk, moon and stars); farm days pass at the pace chosen when the season starts (Fast: 1 day = 1 minute, Normal: 15 minutes, Relaxed: 1 hour) and keep passing while the learner is away.
* Maize first. Rain and sun are free; dry soil weakens the plants, cloudy days slow them, hungry soil stunts them. In the dry season water must be bought. A farm hand can follow standing orders (water, manure) for a daily wage.
* After harvest: keep seed for next season, then sell at the same price three ways: restaurants (cost to win, but they keep buying), the market (fee and transport), or a buyer who booked the harvest early (almost free).
* Monopoly money cycle: rent plots (more plots, more rent, bigger harvest), wallet and seed carry from season to season, seasons follow the real farming calendar (early rains, late rains, harmattan dry season). Passing a season moves the farmer up the road: Seed, Sprout, Grower, Farmer, Big farmer, Agribusiness.
* Code: `src/farm/data.js` (crops, costs, climate, stages), `src/farm/sim.js` (daily simulation), `src/farm/FarmScene.jsx` (the animated farm), `src/pages/Farm.jsx` (screens).
* The server replays each season and also checks it took at least its real time, so a season cannot be rushed by changing the device clock.

## How scoring is protected

1. When a learner starts a level, the server checks it is unlocked (and Premium where needed) and hands out the random seed.
2. Every move is recorded during the game with its day and minute.
3. At the end, the server replays every move from that seed with the same engine and scores the game itself. The browser never writes to the database: profiles, progress, leaderboard and certificates are read and written only by the server with the Firebase Admin key. Each game can be scored once.
4. Game records older than 7 days are deleted every night (Vercel cron).

Data lives in its own collections (`academy_users`, `academy_scores`, `academy_certificates`, `academy_runs`), so it never touches the old GetSchool data. No Firestore rules, indexes or Cloud Functions need deploying.

## Local mode

With no Firebase settings, the app runs in Local mode: everything is saved in the browser only and every account gets Premium so you can test all levels.

## Setup, step by step

The Academy needs only two things in Vercel, from the SAME Firebase project:

* `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (sign in)
* `FIREBASE_SERVICE_ACCOUNT` (the server)

If this replaces the old GetSchool in the same Vercel project, all seven already exist and nothing needs changing. Otherwise:

1. Firebase console, gear icon, **Project settings**, **Service accounts** tab, **Generate new private key**, **Generate key**. A JSON file downloads.
2. Vercel project, **Settings**, **Environment Variables**, **Add New**. Key: `FIREBASE_SERVICE_ACCOUNT`. Value: paste the whole JSON file. **Save**.
3. Same page, add the six `VITE_FIREBASE_*` values from Firebase **Project settings**, **Your apps**, Web app.
4. Firebase: **Authentication**, **Sign-in method**, make sure **Email/Password** is on.
5. Vercel, **Deployments**, latest, **Redeploy**.

If something is wrong, the app shows a red "Server problem" line saying exactly what (for example a missing key, or keys from two different projects).

## Give a learner Premium

Firestore Database, `academy_users`, open the learner's document, click `premium`, change `false` to `true`, **Update**. (Payment gateway to come.)

## Change prices and plan contact

`src/config/plans.js`: Premium price label, WhatsApp number, email.
