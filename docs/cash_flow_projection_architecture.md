# Cash Flow Projection Architecture

```text
Lunch Money v2
      |
      v
API Adapter
      |
      v
Normalized Accounts + CashFlowEvents
      |
      v
Projection Engine
      |
      +----> Chart
      |
      +----> Key Events
```

## API Adapter

`src/lunchmoney.js` is the Lunch Money v2 boundary. It calls:

- `GET /v2/manual_accounts`
- `GET /v2/plaid_accounts`
- `GET /v2/recurring`, with a fallback to `GET /v2/recurring_items` when the live API returns 404
- `GET /v2/transactions` with `include_pending=true`

The adapter normalizes API responses before the projection engine receives them.

## Account Identity

Lunch Money manual account IDs and Plaid account IDs are treated as separate namespaces. The app uses compound keys:

- `manual:<id>`
- `plaid:<id>`

Every normalized cash-flow event carries the same compound account key. Single-account projection filtering compares this key, not just a numeric ID.

## Sign Convention

Lunch Money v2 uses positive amounts for debits and negative amounts for credits. The adapter inverts this once:

- internal positive amount = money entering the selected account
- internal negative amount = money leaving the selected account

Projection, charting, Key Events, and local transactions all use the internal convention.

## Transactions

Transactions are loaded for the projection range with pending transactions included. Posted future-dated transactions and pending transactions can affect the projection when they belong to the selected account.

The app uses the default v2 transaction list behavior for split and grouped transactions. By default, v2 excludes split parents and grouped children from the list, which avoids double-counting parent/child transaction structures in this single-account projection.

## Recurring Reconciliation

Recurring items are loaded from the v2 recurring endpoint using the projection date range. Projected recurring events are created only from `matches.missing_transaction_dates`.

When Lunch Money has already matched an occurrence to an actual or pending transaction, the transaction is used and no projected recurring duplicate is created. The projection engine also removes any recurring projection that shares the same `recurringId`, date, and account key as a real transaction event.

## Local Transactions

Local transactions remain in browser `localStorage` and are not synced to Lunch Money. They are normalized as `local` cash-flow events and filtered to the selected account before projection.

## Tests

Run:

```bash
npm test
```

The projection tests cover deterministic daily balances, recurring deduplication, account isolation, and Lunch Money v2 sign normalization.
