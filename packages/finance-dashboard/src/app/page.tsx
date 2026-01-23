'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, TrendingDown, Receipt, CreditCard, ArrowRight, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { BalanceDetailsSheet } from '@/components/dashboard/balance-details-sheet';
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart';
import { AccountDistributionChart } from '@/components/dashboard/account-distribution-chart';
import { DayOfWeekChart } from '@/components/dashboard/day-of-week-chart';
import { EmptyState } from '@/components/ui/empty-state';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency, formatConvertedCurrency } from '@/lib/currency';
import {
  getAccounts,
  getCards,
  getTransactions,
  getSpendingByCategory,
  getMonthlySpending,
} from '@/lib/api';
import type {
  BankAccount,
  Card as CardType,
  Transaction,
  SpendingSummary,
  MonthlySummary,
} from '@/lib/types';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [spending, setSpending] = useState<SpendingSummary[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { primaryCurrency, convertToPrimary, exchangeRates } = useSettings();

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsData, cardsData, recentTxData, allTxData, spendingData, monthlyData] =
          await Promise.all([
            getAccounts(),
            getCards(),
            getTransactions({ limit: 5 }), // For recent transactions display
            getTransactions({ limit: 500, days: 180 }), // For charts (6 months)
            getSpendingByCategory(),
            getMonthlySpending(6),
          ]);

        setAccounts(accountsData);
        setCards(cardsData);
        setRecentTransactions(recentTxData);
        setAllTransactions(allTxData);
        setSpending(spendingData);
        setMonthly(monthlyData.reverse());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={BarChart3}
          title="Failed to load dashboard"
          description={error}
          action={<Button onClick={() => window.location.reload()}>Try again</Button>}
        />
      </div>
    );
  }

  // Calculate totals per currency
  const balancesByCurrency = accounts.reduce(
    (acc, account) => {
      account.balances.forEach((b) => {
        acc[b.currency] = (acc[b.currency] || 0) + b.balance;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  // Convert to array and sort by total (highest first)
  const currencyTotals = Object.entries(balancesByCurrency)
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);

  const activeCards = cards.filter((c) => c.is_active).length;

  // Chart configs
  const spendingChartConfig: ChartConfig = spending.reduce((config, item, index) => {
    config[item.category] = {
      label: item.category.charAt(0).toUpperCase() + item.category.slice(1),
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return config;
  }, {} as ChartConfig);

  const monthlyChartConfig: ChartConfig = {
    total: {
      label: 'Spending',
      color: 'var(--chart-1)',
    },
  };

  // Calculate total balance in primary currency
  const totalInPrimary = exchangeRates
    ? currencyTotals.reduce((sum, ct) => sum + convertToPrimary(ct.total, ct.currency), 0)
    : null;

  // Convert and aggregate spending data by category (API returns per-currency rows)
  const convertedSpending = Object.values(
    spending.reduce(
      (acc, item) => {
        const key = item.category;
        if (!acc[key]) {
          acc[key] = { category: item.category, total: 0, count: 0, currency: primaryCurrency };
        }
        acc[key].total += convertToPrimary(Number(item.total), item.currency);
        acc[key].count += item.count;
        return acc;
      },
      {} as Record<string, SpendingSummary>
    )
  );

  // Convert and aggregate monthly data by month (API returns per-currency rows)
  const convertedMonthly = Object.values(
    monthly.reduce(
      (acc, item) => {
        const key = item.month;
        if (!acc[key]) {
          acc[key] = { month: item.month, total: 0, count: 0, currency: primaryCurrency };
        }
        acc[key].total += convertToPrimary(Number(item.total), item.currency);
        acc[key].count += item.count;
        return acc;
      },
      {} as Record<string, MonthlySummary>
    )
  ).sort((a, b) => a.month.localeCompare(b.month));

  // Calculate converted monthly spending for stats
  const currentMonthConverted =
    convertedMonthly.length > 0 ? convertedMonthly[convertedMonthly.length - 1]?.total || 0 : 0;
  const previousMonthConverted =
    convertedMonthly.length > 1 ? convertedMonthly[convertedMonthly.length - 2]?.total || 0 : 0;
  const convertedSpendingTrend =
    previousMonthConverted > 0
      ? ((currentMonthConverted - previousMonthConverted) / previousMonthConverted) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your financial accounts and spending</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BalanceDetailsSheet
          accounts={accounts}
          totalInPrimary={totalInPrimary}
          primaryCurrency={primaryCurrency}
          convertToPrimary={convertToPrimary}
        >
          <StatsCard
            title="Total Balance"
            value={
              currencyTotals.length > 0
                ? currencyTotals.map((ct) => formatCurrency(ct.total, ct.currency)).join(' / ')
                : formatCurrency(0)
            }
            description={
              totalInPrimary !== null && currencyTotals.length > 1
                ? formatConvertedCurrency(totalInPrimary, primaryCurrency)
                : `Across ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`
            }
            icon={Wallet}
            clickable
          />
        </BalanceDetailsSheet>
        <StatsCard
          title="Monthly Spending"
          value={formatCurrency(currentMonthConverted, primaryCurrency)}
          icon={TrendingDown}
          variant="destructive"
          trend={
            previousMonthConverted > 0
              ? {
                  value: Math.round(convertedSpendingTrend),
                  label: 'vs last month',
                }
              : undefined
          }
        />
        <StatsCard
          title="Transactions"
          value={allTransactions.length.toString()}
          description="Last 6 months"
          icon={Receipt}
        />
        <StatsCard
          title="Active Cards"
          value={activeCards.toString()}
          description={`of ${cards.length} total cards`}
          icon={CreditCard}
        />
      </div>

      {/* Cash Flow Chart - Full Width */}
      <CashFlowChart transactions={allTransactions} months={6} currency={primaryCurrency} />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {convertedSpending.length > 0 ? (
              <ChartContainer config={spendingChartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={convertedSpending}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ category, percent }) =>
                      `${category} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {convertedSpending.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatCurrency(value as number, primaryCurrency)}
                  />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No spending data"
                description="Start tracking your expenses to see spending breakdown"
                className="h-[300px]"
              />
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {convertedMonthly.length > 0 ? (
              <ChartContainer config={monthlyChartConfig} className="h-[300px]">
                <BarChart data={convertedMonthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
                        'en-US',
                        { month: 'short' }
                      );
                    }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0)
                    }
                    className="text-muted-foreground"
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatCurrency(value as number, primaryCurrency)}
                  />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No monthly data"
                description="Monthly spending trends will appear here"
                className="h-[300px]"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountDistributionChart
          accounts={accounts}
          convertToPrimary={convertToPrimary}
          currency={primaryCurrency}
        />
        <DayOfWeekChart transactions={allTransactions} currency={primaryCurrency} />
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions">
              View all
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium leading-none">
                      {tx.merchant || tx.description || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.transaction_date).toLocaleDateString()} &middot;{' '}
                      {tx.category || 'Uncategorized'}
                    </p>
                  </div>
                  <div
                    className={
                      tx.transaction_type === 'credit'
                        ? 'font-semibold text-success'
                        : 'font-semibold text-destructive'
                    }
                  >
                    {tx.transaction_type === 'credit' ? '+' : '-'}
                    {formatCurrency(Math.abs(tx.amount), tx.currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Your recent transactions will appear here"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
