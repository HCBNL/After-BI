# AfterBI v4 — setup with no terminal

Everything here is done in a browser: Firebase console, GitHub and Vercel. Nothing to install, no commands, no service-account key.

## 1. Firebase

1. **Project.** [console.firebase.google.com](https://console.firebase.google.com) → Add project, or open your existing AfterBI project.
2. **Sign-in.** Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.
3. **Database.** Build → Firestore Database → Create database → **Production mode** → choose a location → Enable. The location can never be changed; `europe-west2` (London) or `eur3` (Europe) suit Nigeria.
4. **Rules.** Firestore → Rules → delete what is there → paste all of `firestore.rules` from this folder → Publish.
5. **Indexes.** Firestore → Indexes → Composite → Create index, seven times. Query scope is always **Collection**.

   | # | Collection ID | Field 1 | Field 2 | Field 3 |
   |---|---|---|---|---|
   | 1 | `orders` | `distributorId` Ascending | `createdAt` Descending | |
   | 2 | `orders` | `status` Ascending | `createdAt` Descending | |
   | 3 | `orders` | `status` Ascending | `distributorId` Ascending | `createdAt` Descending |
   | 4 | `invoices` | `distributorId` Ascending | `issuedOn` Descending | |
   | 5 | `sales` | `distributorId` Ascending | `saleDate` Descending | |
   | 6 | `payments` | `distributorId` Ascending | `paidOn` Descending | |
   | 7 | `stockMovements` | `warehouseId` Ascending | `createdAt` Descending | |

   Each takes a few minutes to build. If a screen ever reports a missing index, the error message contains a link that creates it in one click.
6. **Web app keys.** ⚙ Project settings → General → Your apps → `</>` → register the app → copy `apiKey`, `authDomain`, `projectId`, `messagingSenderId` and `appId`.

## 2. GitHub and Vercel

1. **A new GitHub repository** (see *Reusing the v3 repository* below if you must reuse it). Add file → Upload files. GitHub takes at most 100 files per upload, so do it twice: drag in the `src` folder and commit, then drag in everything else in this folder and commit.
2. **Vercel** → Add New → Project → import the repository. Framework: Vite (detected automatically). Add these Environment Variables, then Deploy:

   | Name | Value |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |

   Already have the Vercel project? Settings → Git → connect the new repository instead. The variables stay.
3. **Authorised domain.** Firebase → Authentication → Settings → Authorized domains → Add domain → your Vercel address (for example `afterbi.vercel.app`) and any custom domain.

## 3. Your owner account

1. Firebase → Authentication → Users → **Add user** → your email and a password.
2. Copy its **User UID** from the list.
3. Firestore → Data → **Start collection** → Collection ID `users` → Document ID: paste the UID → add:

   | Field | Type | Value |
   |---|---|---|
   | `email` | string | your email |
   | `firstName` | string | your first name |
   | `lastName` | string | your last name |
   | `role` | string | `owner` |
   | `active` | boolean | `true` |

4. Open the app and sign in. You land on the platform console.

Signed in before step 3? The sign-in screen shows your UID with a copy button, and lets you in by itself the moment the document exists.

## 4. Everyone else, in the app

- **An organisation:** Organisations → New organisation → name, ID, status, monthly fee and its first administrator → Create. Copy the sign-in details and hand them over.
- **Its people:** that administrator signs in and uses **Add person** for reps, depot managers, finance and distributors.

The app emails nobody. Anyone can change their own password with *Forgot password?* on the sign-in screen (that email comes from Firebase).

To close an organisation that has not paid: Organisations → open it → Status → Suspended → Save. Everyone in it is locked out; their data is kept.

## Collections

You create one document by hand: `users/{your UID}`. Firestore has no empty collections — each one appears the first time the app writes to it.

| Where | Collection | Holds |
|---|---|---|
| root | `users` | One profile per sign-in: role, `orgId`, active |
| root | `orgs` | One document per organisation: name, status, fee |
| `orgs/{orgId}/` | `settings` | The organisation's own details (document `org`) |
| `orgs/{orgId}/` | `products`, `distributors`, `warehouses` | Catalogue, trading partners, depots |
| `orgs/{orgId}/` | `stock`, `stockMovements` | Stock on hand, and the ledger of every movement |
| `orgs/{orgId}/` | `orders`, `sales`, `leads`, `targets` | Selling |
| `orgs/{orgId}/` | `invoices`, `payments`, `returns` | Money and credits |
| `orgs/{orgId}/` | `counters` | Document numbers such as PO-2026-0001 |

**Making an organisation by hand instead (optional).** `orgs/{id}` with `name` (string), `slug` (string, same as the id), `status` (string, `active` or `trial`), `createdAt` (string, e.g. `2026-09-20`) and `subscriptionFee` (number). Then `orgs/{id}/settings/org` with `name` (string), `currency` (string `NGN`), `approvalThreshold` (number `0`) and `setupComplete` (boolean `false`). Its administrator: Authentication → Add user, then `users/{uid}` with `email`, `firstName`, `lastName`, `role` (`super_admin`), `orgId` (the id) and `active` (`true`).

## Reusing the v3 repository

Uploading over an old repository adds and replaces files but never deletes any, and some v3 files no longer build. Delete these first:

`scripts/`, `tests/`, `preview/`, `vite.preview.config.ts`, `sweep.mjs`, `flows.mjs`, `firebase.json`, `src/pages/shared/NoticePage.tsx`, `src/pages/platform/NoticesAdminPage.tsx`, `src/pages/platform/EnquiriesPage.tsx`, `src/pages/partners/ContactsPage.tsx`, `src/components/home/Shortcuts.tsx`, `src/components/home/MoreSheet.tsx`.

The old `notices` and `enquiries` collections in Firestore can be deleted too; nothing reads them now.

## Updating later

Upload the changed files to GitHub and Vercel redeploys by itself. If `firestore.rules` changed, paste it again and Publish.
