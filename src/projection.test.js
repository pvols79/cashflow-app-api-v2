import { describe, expect, it } from 'vitest';
import { projectCashFlow } from './projection';

const checkingAccount = {
  id: 1,
  source: 'plaid',
  key: 'plaid:1',
  name: 'Checking',
  balance: 3000,
};

const savingsAccount = {
  id: 2,
  source: 'manual',
  key: 'manual:2',
  name: 'Savings',
  balance: 500,
};

const balanceOn = (projection, date) =>
  projection.dailyBalances.find(day => day.date === date)?.balance;

describe('projectCashFlow', () => {
  it('projects deterministic daily balances from normalized events', () => {
    const projection = projectCashFlow(
      [checkingAccount],
      [
        {
          id: 'event:spotify',
          accountId: 1,
          accountSource: 'plaid',
          accountKey: 'plaid:1',
          date: '2026-08-12',
          description: 'Spotify',
          amount: -20.79,
          type: 'future',
        },
        {
          id: 'event:cisco-paycheck',
          accountId: 1,
          accountSource: 'plaid',
          accountKey: 'plaid:1',
          date: '2026-08-14',
          description: 'Cisco paycheck',
          amount: 6323.30,
          type: 'future',
        },
        {
          id: 'event:mortgage',
          accountId: 1,
          accountSource: 'plaid',
          accountKey: 'plaid:1',
          date: '2026-08-15',
          description: 'Mortgage',
          amount: -2940,
          type: 'future',
        },
      ],
      'plaid:1',
      1,
      [],
      { anchorDate: '2026-08-11' }
    );

    expect(balanceOn(projection, '2026-08-11')).toBe(3000);
    expect(balanceOn(projection, '2026-08-12')).toBeCloseTo(2979.21);
    expect(balanceOn(projection, '2026-08-14')).toBeCloseTo(9302.51);
    expect(balanceOn(projection, '2026-08-15')).toBeCloseTo(6362.51);
  });

  it('does not duplicate recurring projections that have a matching real transaction', () => {
    const projection = projectCashFlow(
      [checkingAccount],
      [
        {
          id: 'transaction:spotify',
          accountId: 1,
          accountSource: 'plaid',
          accountKey: 'plaid:1',
          date: '2026-08-12',
          description: 'Spotify',
          amount: -20.79,
          type: 'pending',
          transactionId: 20,
          recurringId: 10,
        },
        {
          id: 'recurring:10:2026-08-12',
          accountId: 1,
          accountSource: 'plaid',
          accountKey: 'plaid:1',
          date: '2026-08-12',
          description: 'Spotify',
          amount: -20.79,
          type: 'recurring-projected',
          recurringId: 10,
        },
      ],
      'plaid:1',
      1,
      [],
      { anchorDate: '2026-08-11' }
    );

    expect(balanceOn(projection, '2026-08-12')).toBeCloseTo(2979.21);
  });

  it('ignores events from other accounts', () => {
    const projection = projectCashFlow(
      [checkingAccount, savingsAccount],
      [
        {
          id: 'event:other-account',
          accountId: 2,
          accountSource: 'manual',
          accountKey: 'manual:2',
          date: '2026-08-12',
          description: 'Other account expense',
          amount: -1000,
          type: 'future',
        },
      ],
      'plaid:1',
      1,
      [],
      { anchorDate: '2026-08-11' }
    );

    expect(balanceOn(projection, '2026-08-12')).toBe(3000);
  });

  it('applies local transactions saved with compound account identity', () => {
    const projection = projectCashFlow(
      [checkingAccount],
      [],
      'plaid:1',
      1,
      [
        {
          id: 30,
          account_id: 'plaid:1',
          date: '2026-08-12',
          description: 'Local test expense',
          amount: -125,
          is_local: true,
        },
      ],
      { anchorDate: '2026-08-11' }
    );

    expect(balanceOn(projection, '2026-08-12')).toBe(2875);
    expect(projection.keyEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        date: '2026-08-12',
        description: 'Local test expense',
        amount: -125,
        is_local: true,
      }),
    ]));
  });

});
