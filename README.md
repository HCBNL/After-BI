# AfterBI v4

Multi-tenant distribution management for FMCG in Nigeria: orders with approvals, stock across depots, sell-out, invoices, payments, returns and targets. One Firebase project, any number of organisations.

**Start with [SETUP.md](SETUP.md).** Setup is done entirely in the browser.

## What changed in v4

- **The GetSchool interface.** A coloured panel on every screen, a Tiles or Cards home screen, the laptop rail, the phone bottom bar and menu. AfterBI keeps its green and its four-bar mark.
- **No in-app communication.** Notices, enquiries, contacts and distributor invite codes are gone.
- **Accounts are made in the app.** The owner creates organisations and their first administrator; administrators add everyone else. No server, no terminal, nothing emailed.
- **7 composite indexes instead of 16.** Lists that are always read in full are now sorted in the browser.
- **Suspension is enforced by the rules.** A suspended organisation is closed at the database, not only at sign-in.

## Portals

| Role | Portal |
|---|---|
| owner | `/portal/platform` |
| super_admin, admin, staff | `/portal/office` |
| sales_rep | `/portal/sales` |
| distributor | `/portal/partner` |
| warehouse_manager, operations_manager | `/portal/operations` |
| finance_manager | `/portal/finance` |

## Where things are

| Path | What it is |
|---|---|
| `src/App.tsx` | Routes for the six portals |
| `src/components/layout/` | The shell: `Chrome`, `NavRail`, `BottomBar`, `MenuSheet`, `PagePanel` |
| `src/components/home/` | Home screen pieces |
| `src/context/AuthContext.tsx` | Who is signed in, their organisation, and what is wrong if they cannot get in |
| `src/lib/tenant.ts` | The `orgs/{orgId}/…` paths |
| `src/lib/db.ts` | Every Firestore read and write |
| `src/lib/accounts.ts` | Creating sign-ins from the browser |
| `src/lib/platform.ts` | Creating organisations |
| `src/lib/tiles.ts` | Every screen, who may open it, the rail and the bottom bar |
| `firestore.rules` | Paste into the Firebase console |
| `firestore.indexes.json` | The seven indexes, for reference |

For developers only (not needed for setup): `npm install`, then `npm run dev`.
