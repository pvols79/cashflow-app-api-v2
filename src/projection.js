import { format, lastDayOfMonth } from 'date-fns';



function getUTCDateString(date) {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const dateFromInput = (date) => {
  if (date instanceof Date) return date;
  return new Date(`${date}T00:00:00Z`);
};

const eventAffectsSelectedAccount = (event, selectedAccount) => {
  if (event.accountKey) return event.accountKey === selectedAccount.key;

  // Legacy browser-local records stored numeric account_id before Phase I account keys.
  return event.account_id != null && (
    String(event.account_id) === selectedAccount.key ||
    String(event.account_id) === String(selectedAccount.id)
  );
};

const normalizeLocalTransaction = (transaction, selectedAccount) => ({
  id: `local:${transaction.id}`,
  accountId: selectedAccount.id,
  accountSource: selectedAccount.source,
  accountKey: selectedAccount.key,
  date: getUTCDateString(dateFromInput(transaction.date)),
  description: transaction.description || 'Local Transaction',
  amount: parseFloat(transaction.amount),
  type: 'local',
  is_local: true,
});

const removeSatisfiedRecurringProjections = (events) => {
  const satisfiedRecurringOccurrences = new Set(
    events
      .filter(event => event.type !== 'recurring-projected' && event.recurringId != null)
      .map(event => `${event.recurringId}:${event.date}:${event.accountKey}`)
  );

  return events.filter(event => {
    if (event.type !== 'recurring-projected' || event.recurringId == null) return true;
    return !satisfiedRecurringOccurrences.has(`${event.recurringId}:${event.date}:${event.accountKey}`);
  });
};

export const projectCashFlow = (accounts, cashFlowEvents, selectedAccountId, projectionHorizonMonths, localTransactions = [], options = {}) => {
  const selectedAccount = accounts.find(acc => acc.key === selectedAccountId);
  if (!selectedAccount) return null;

  const anchorDate = options.anchorDate || getLocalDateString(new Date());
  const projectionStartDate = new Date(`${anchorDate}T00:00:00Z`);
  const projectionEndDate = new Date(projectionStartDate);
  projectionEndDate.setUTCMonth(projectionStartDate.getUTCMonth() + projectionHorizonMonths);

  const selectedApiEvents = cashFlowEvents
    .filter(event => eventAffectsSelectedAccount(event, selectedAccount))
    .filter(event => event.date >= anchorDate && event.date <= getUTCDateString(projectionEndDate))
    .filter(event => event.type !== 'actual' || event.date > anchorDate);

  const selectedLocalEvents = localTransactions
    .filter(t => eventAffectsSelectedAccount(t, selectedAccount))
    .map(t => normalizeLocalTransaction(t, selectedAccount))
    .filter(event => event.date >= anchorDate && event.date <= getUTCDateString(projectionEndDate));

  const projectedTransactions = removeSatisfiedRecurringProjections([
    ...selectedApiEvents,
    ...selectedLocalEvents,
  ]);

  projectedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  const dailyBalances = [];
  const negativeBalanceAlerts = [];
  const keyEvents = [
    {
      date: getUTCDateString(projectionStartDate),
      description: 'Starting Balance',
      amount: 0,
      is_subtotal: false,
      balance: parseFloat(selectedAccount.balance)
    }
  ];
  let currentBalance = parseFloat(selectedAccount.balance);
  let monthlyChange = 0;
  let monthlyCredit = 0;
  let monthlyDebit = 0;
  let currentMonth = projectionStartDate.getUTCMonth();
  let lastDayOfMonthBalance = currentBalance;

  for (let d = new Date(projectionStartDate); d <= projectionEndDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = getUTCDateString(d);
    const dayMonth = d.getUTCMonth();

    // Check for month change
    if (dayMonth !== currentMonth) {
      // Add subtotal for the previous month
      const prevDay = new Date(d);
      prevDay.setUTCDate(d.getUTCDate() - 1);

      keyEvents.push({
        date: getUTCDateString(lastDayOfMonth(prevDay)),
        description: `Monthly Subtotal (${format(prevDay, 'MMMM yyyy')})`,
        amount: monthlyChange,
        monthlyCredit: monthlyCredit,
        monthlyDebit: monthlyDebit,
        is_subtotal: true,
        balance: lastDayOfMonthBalance
      });
      monthlyChange = 0; // Reset for the new month
      monthlyCredit = 0;
      monthlyDebit = 0;
      currentMonth = dayMonth;
    }
    
    const todaysTransactions = projectedTransactions.filter(t => t.date === dateStr);

    todaysTransactions.forEach(t => {
        currentBalance += parseFloat(t.amount);
        monthlyChange += parseFloat(t.amount);
        if (parseFloat(t.amount) > 0) {
          monthlyCredit += parseFloat(t.amount);
        } else {
          monthlyDebit += parseFloat(t.amount);
        }
        keyEvents.push({ ...t, balance: currentBalance, is_local: t.is_local });
    });

    // Check for negative balance after all transactions for the day
    if (currentBalance < 0 && todaysTransactions.length > 0) {
        negativeBalanceAlerts.push({ date: dateStr, balance: currentBalance, transaction: todaysTransactions[todaysTransactions.length - 1] || { description: 'Daily Activity' }});
    }

    dailyBalances.push({ date: dateStr, balance: currentBalance });
    lastDayOfMonthBalance = currentBalance;
  }

  // Add subtotal for the last month in the projection
  keyEvents.push({
    date: getUTCDateString(projectionEndDate),
    description: `Monthly Subtotal (${format(projectionEndDate, 'MMMM yyyy')})`,
    amount: monthlyChange,
    monthlyCredit: monthlyCredit,
    monthlyDebit: monthlyDebit,
    is_subtotal: true,
    balance: currentBalance
  });

  return { dailyBalances, keyEvents, negativeBalanceAlerts };
};
