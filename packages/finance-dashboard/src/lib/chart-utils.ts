import type { BankAccount, Transaction } from './types';

// Type definitions for chart data
export interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface DayOfWeekData {
  day: string;
  avgSpending: number;
  count: number;
  totalSpending: number;
}

export interface AccountDistributionData {
  accountName: string;
  totalBalance: number;
  percentage: number;
  color: string;
}

/**
 * Aggregate transactions by month and type (credit vs debit)
 * Returns array of monthly cash flow data for the last N months
 */
export function aggregateCashFlowByMonth(
  transactions: Transaction[],
  months: number = 6
): CashFlowData[] {
  // Calculate cutoff date (N months ago)
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  // Filter transactions within the date range
  const recentTransactions = transactions.filter((t) => {
    const txDate = new Date(t.transaction_date);
    return txDate >= cutoffDate;
  });

  // Group transactions by YYYY-MM
  const monthlyData = new Map<string, { income: number; expenses: number }>();

  recentTransactions.forEach((transaction) => {
    const txDate = new Date(transaction.transaction_date);
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { income: 0, expenses: 0 });
    }

    const monthData = monthlyData.get(monthKey)!;
    const amount = Number(transaction.amount);

    if (transaction.transaction_type === 'credit') {
      monthData.income += amount;
    } else if (transaction.transaction_type === 'debit') {
      monthData.expenses += amount;
    }
  });

  // Convert to array and calculate net
  const result: CashFlowData[] = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month)); // Sort chronologically

  // Ensure we always have the last N months (fill in missing months with zeros)
  const allMonths: CashFlowData[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const existingData = result.find((d) => d.month === monthKey);
    allMonths.push(
      existingData || {
        month: monthKey,
        income: 0,
        expenses: 0,
        net: 0,
      }
    );
  }

  return allMonths;
}

/**
 * Aggregate spending by day of week
 * Returns array with average spending per day (Mon-Sun)
 */
export function aggregateSpendingByDayOfWeek(transactions: Transaction[]): DayOfWeekData[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter only debit transactions
  const debitTransactions = transactions.filter((t) => t.transaction_type === 'debit');

  // Group by day of week (0-6)
  const dayData = new Map<number, { totalSpending: number; count: number }>();

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    dayData.set(i, { totalSpending: 0, count: 0 });
  }

  debitTransactions.forEach((transaction) => {
    const txDate = new Date(transaction.transaction_date);
    const dayOfWeek = txDate.getDay(); // 0-6 (Sun-Sat)

    const data = dayData.get(dayOfWeek)!;
    data.totalSpending += Number(transaction.amount);
    data.count += 1;
  });

  // Convert to array with proper day order (Mon-Sun)
  const result: DayOfWeekData[] = [];

  // Start from Monday (1) and wrap around
  for (let i = 1; i < 7; i++) {
    const data = dayData.get(i)!;
    result.push({
      day: dayNames[i],
      totalSpending: data.totalSpending,
      count: data.count,
      avgSpending: data.count > 0 ? data.totalSpending / data.count : 0,
    });
  }

  // Add Sunday at the end
  const sundayData = dayData.get(0)!;
  result.push({
    day: dayNames[0],
    totalSpending: sundayData.totalSpending,
    count: sundayData.count,
    avgSpending: sundayData.count > 0 ? sundayData.totalSpending / sundayData.count : 0,
  });

  return result;
}

/**
 * Calculate total balance per account and percentage distribution
 * Converts multi-currency balances to primary currency
 */
export function calculateAccountDistribution(
  accounts: BankAccount[],
  convertToPrimary: (amount: number, currency: string) => number
): AccountDistributionData[] {
  const CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  // Calculate total balance per account (sum all currencies, convert to primary)
  const accountData = accounts
    .map((account) => {
      const totalBalance = account.balances.reduce((sum, balance) => {
        const converted = convertToPrimary(Number(balance.balance), balance.currency);
        return sum + converted;
      }, 0);

      return {
        accountName: account.account_alias || `${account.bank_name} (${account.account_type})`,
        totalBalance,
      };
    })
    .filter((account) => account.totalBalance > 0); // Filter out zero-balance accounts

  // Calculate total across all accounts
  const grandTotal = accountData.reduce((sum, acc) => sum + acc.totalBalance, 0);

  // Calculate percentages and assign colors
  const result: AccountDistributionData[] = accountData.map((account, index) => ({
    ...account,
    percentage: grandTotal > 0 ? account.totalBalance / grandTotal : 0,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return result;
}
