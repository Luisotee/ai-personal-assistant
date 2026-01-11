"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingDown,
  Receipt,
  CreditCard,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from "recharts";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getAccounts,
  getCards,
  getTransactions,
  getSpendingByCategory,
  getMonthlySpending,
} from "@/lib/api";
import type { BankAccount, Card as CardType, Transaction, SpendingSummary, MonthlySummary } from "@/lib/types";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spending, setSpending] = useState<SpendingSummary[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsData, cardsData, transactionsData, spendingData, monthlyData] =
          await Promise.all([
            getAccounts(),
            getCards(),
            getTransactions({ limit: 5 }),
            getSpendingByCategory(),
            getMonthlySpending(6),
          ]);

        setAccounts(accountsData);
        setCards(cardsData);
        setTransactions(transactionsData);
        setSpending(spendingData);
        setMonthly(monthlyData.reverse());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
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
          action={
            <Button onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  // Calculate totals
  const totalBalance = accounts.reduce((sum, account) => {
    const eurBalance = account.balances.find((b) => b.currency === "EUR");
    return sum + (eurBalance?.balance || 0);
  }, 0);

  const currentMonthSpending = monthly.length > 0 ? monthly[monthly.length - 1]?.total || 0 : 0;
  const previousMonthSpending = monthly.length > 1 ? monthly[monthly.length - 2]?.total || 0 : 0;
  const spendingTrend = previousMonthSpending > 0
    ? ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100
    : 0;

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
      label: "Spending",
      color: "var(--chart-1)",
    },
  };

  const formatCurrency = (value: number, currency = "EUR") =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your financial accounts and spending
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Balance"
          value={formatCurrency(totalBalance)}
          description={`Across ${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
          icon={Wallet}
        />
        <StatsCard
          title="Monthly Spending"
          value={formatCurrency(currentMonthSpending)}
          icon={TrendingDown}
          variant="destructive"
          trend={
            previousMonthSpending > 0
              ? {
                  value: Math.round(spendingTrend),
                  label: "vs last month",
                }
              : undefined
          }
        />
        <StatsCard
          title="Transactions"
          value={transactions.length.toString()}
          description="Recent transactions"
          icon={Receipt}
        />
        <StatsCard
          title="Active Cards"
          value={activeCards.toString()}
          description={`of ${cards.length} total cards`}
          icon={CreditCard}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {spending.length > 0 ? (
              <ChartContainer config={spendingChartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={spending}
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
                    {spending.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatCurrency(value as number)}
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
            {monthly.length > 0 ? (
              <ChartContainer config={monthlyChartConfig} className="h-[300px]">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      const [year, month] = value.split("-");
                      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
                        "en-US",
                        { month: "short" }
                      );
                    }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Bar
                    dataKey="total"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
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
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium leading-none">
                      {tx.merchant || tx.description || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.transaction_date).toLocaleDateString()} &middot;{" "}
                      {tx.category || "Uncategorized"}
                    </p>
                  </div>
                  <div
                    className={
                      tx.transaction_type === "credit"
                        ? "font-semibold text-success"
                        : "font-semibold text-destructive"
                    }
                  >
                    {tx.transaction_type === "credit" ? "+" : "-"}
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
