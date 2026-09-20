# Setting up AfterBI on a fresh Firebase project

Written for project **`after-bi`**, a brand-new GitHub repo, and the existing
Vercel project. Follow it in order — steps 4 and 6 depend on 3 having finished.

---

## 1. The five environment variables

Vercel → your project → **Settings → Environment Variables**. Add each one with
**Production** and **Preview** both ticked.

```
VITE_FIREBASE_API_KEY               AIzaSyB6g4cjsYaZOW5VH7tEAffn2nBaIzqpdcM
VITE_FIREBASE_AUTH_DOMAIN           after-bi.firebaseapp.com
VITE_FIREBASE_PROJECT_ID            after-bi
VITE_FIREBASE_MESSAGING_SENDER_ID   573250669121
VITE_FIREBASE_APP_ID                1:573250669121:web:f04512eb1db2fdc88dd4c0
```

That is the whole list. There is nothing else to set.

**`storageBucket` is not used** and is not in the list. Nothing in this app
imports `firebase/storage`, because nothing in it uploads a file.

**Cloudinary is not used either.** The app you ported from used it for uploads;
this one has no upload anywhere. The only image it has is the company logo on
printed documents, and that is a URL you paste into Settings. Two
`VITE_CLOUDINARY_*` declarations had survived the port in `vite-env.d.ts` with
no code behind them — they have been removed, because config that describes a
feature that does not exist is worse than no config. If you want real upload
later (a logo, a signed delivery note, a photo of damaged stock) that is a
feature to build, not a variable to fill in.

**These are not secrets.** A Firebase web key identifies the project; it does
not grant access. `firestore.rules` is what guards the data.

**Adding them is not enough — redeploy.** Vite writes these values into the
JavaScript bundle at build time, so an existing build cannot see them however
correctly they are set. Deployments → ⋯ → **Redeploy**.

If you skip this step the site builds fine and then shows a page naming the
variable you missed, rather than going white. That page is a guard in
`index.html`, not a feature — see the README.

---

## 2. Turn on Email/Password sign-in

Firebase console → **Authentication** → **Get started** → **Sign-in method** →
**Email/Password** → enable the first toggle → **Save**.

Leave "Email link (passwordless sign-in)" off. The app signs in with a password.

---

## 3. Create the Firestore database

Firebase console → **Firestore Database** → **Create database**.

- **Location**: pick once and never again — it cannot be changed without
  exporting and re-importing everything. `europe-west1` or `eur3` is the usual
  choice for Nigerian traffic; `nam5` adds noticeable latency on every read.
- **Mode**: start in **production mode** (locked). Step 4 replaces the rules
  immediately, and test mode is a world-writable database in the meantime.

---

## 4. Deploy the rules and indexes

From the repo, with the Firebase CLI (`npm i -g firebase-tools`, then
`firebase login`):

```bash
firebase use after-bi
firebase deploy --only firestore:rules,firestore:indexes
```

Then **wait for the indexes**. Firebase console → Firestore → **Indexes** →
they must all read **Enabled**, not **Building**. A query against an index that
is still building fails exactly like one against an index that does not exist.
On an empty database this takes under a minute.

Do this **before** anybody signs in. The rules are deny-by-default, so the app
is inert without them.

---

## 5. Add the domain to Firebase

Firebase console → **Authentication → Settings → Authorized domains** → **Add
domain**, for both:

- `afterbi-git-main-edgedmss-projects.vercel.app`
- your production domain, when you attach one

`localhost` is already there, which is why it works locally and not deployed.
Until this is done, sign-in fails with `auth/unauthorized-domain` while
everything else looks fine.

---

## 6. Create the first organisation and the first account

This is the step a fresh project cannot do from the browser, and it is not an
oversight: `orgs/{orgId}` is writable only by a platform owner, a platform owner
is decided by reading `users/{uid}`, and `users/{uid}` cannot be created from the
browser because creating a Firebase Auth user client-side signs the *current*
user out and into the new account. Three correct rules that together make a
locked door with the key inside. `scripts/bootstrap-org.mjs` is the key — it
uses the Admin SDK, which bypasses rules.

**Get a service-account key**: Firebase console → ⚙ **Project settings** →
**Service accounts** → **Generate new private key** → a `.json` file downloads.

**This one IS a secret.** It bypasses every rule in the database — it is not
like the five above. Save it into the repo folder as **`service-account.json`**,
which `.gitignore` covers by name, and delete it once you are done. If you name
it something else, check `git status` before you commit.

```bash
npm install

# Look before you leap.
FIREBASE_SERVICE_ACCOUNT=./service-account.json \
node scripts/bootstrap-org.mjs \
  --org bella --name "Bella Group Nigeria" \
  --email you@yourcompany.com --password "a-long-password-here" \
  --first Oluwaseun --last Adeyemi \
  --depot "Ikeja main warehouse" \
  --dry

# Then for real, without --dry.
```

`--org` becomes a path segment (`orgs/bella/orders`), so it is lower case,
hyphens allowed, and permanent. Pick the short trading name.

It writes four things: the tenant record, the company settings, a first depot
set as the default, and your profile as **super_admin** of that organisation.
Running it twice changes nothing.

### Optionally, a platform account

The `/portal/platform` console — every organisation, subscriptions, the notice
bar — needs an account with role `owner` and no organisation:

```bash
FIREBASE_SERVICE_ACCOUNT=./service-account.json \
node scripts/bootstrap-org.mjs --owner \
  --email platform@yourcompany.com --password "another-long-one" \
  --first Platform --last Admin
```

Use a different email from your admin account. One account is one role.

---

## 7. Sign in and finish in the app

Open the deployed site → sign in with the email and password from step 6 →
you land on the admin home with a setup checklist.

Work down it: **Company → Setup**. Products, price tiers, distributors, then
your bank accounts under **Company → Settings** (those print on every invoice
under a line saying money paid anywhere else is not recognised).

Leave the **approval threshold at ₦0** until more than one person is raising
orders. Zero means every order is approved as it is raised. A threshold above
zero with nobody yet set up to approve is how the previous build produced orders
that could never move at all.

---

## Checklist

- [ ] Five `VITE_FIREBASE_*` variables set, Production **and** Preview
- [ ] Redeployed after setting them
- [ ] Email/Password sign-in enabled
- [ ] Firestore created, production mode, location chosen deliberately
- [ ] `firebase deploy --only firestore:rules,firestore:indexes`
- [ ] Indexes read **Enabled**, not Building
- [ ] Vercel domain added to Firebase authorized domains
- [ ] `bootstrap-org.mjs` run — with `--dry` first
- [ ] Service-account key deleted from your machine, never committed
- [ ] Signed in, setup checklist visible

---

## If something is wrong

| What you see | What it is |
|---|---|
| White page | Should not happen — the guard in `index.html` catches it. If it does, the bundle itself failed to load; check the browser console. |
| "This deployment is missing its configuration" | Step 1, and you have to redeploy after setting them. |
| `auth/unauthorized-domain` | Step 5. |
| `auth/invalid-api-key` | A typo in `VITE_FIREBASE_API_KEY`, or it was set without a redeploy. |
| Signed in, then "no organisation is selected" | The profile has no `orgId`. Step 6 did not complete — re-run it. |
| "The query requires an index" | Step 4, or the indexes are still building. |
| `permission-denied` on every screen | Rules not deployed, or the profile's `orgId` does not match the org the data is under. |
