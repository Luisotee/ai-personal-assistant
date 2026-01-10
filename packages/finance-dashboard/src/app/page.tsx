"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import {
  getAccounts,
  getTransactions,
  getSpendingByCategory,
  getMonthlySpending,
} from "@/lib/api";
import type { BankAccount, Transaction, SpendingSummary, MonthlySummary } from "@/lib/types";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#c026d3",
  "#ea580c",
];

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spending, setSpending] = useState<SpendingSummary[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsData, transactionsData, spendingData, monthlyData] =
          await Promise.all([
            getAccounts(),
            getTransactions({ limit: 10 }),
            getSpendingByCategory(),
            getMonthlySpending(6),
          ]);

        setAccounts(accountsData);
        setTransactions(transactionsData);
        setSpending(spendingData);
        setMonthly(monthlyData.reverse()); // Show oldest to newest
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate totals
  const totalBalance = accounts.reduce((sum, account) => {
    const eurBalance = account.balances.find((b) => b.currency === "EUR");
    return sum + (eurBalance?.balance || 0);
  }, 0);

  const monthlySpending = monthly.length > 0 ? monthly[monthly.length - 1]?.total || 0 : 0;
  const transactionCount = transactions.length;

  // Chart configs
  const spendingChartConfig: ChartConfig = spending.reduce((config, item, index) => {
    config[item.category] = {
      label: item.category.charAt(0).toUpperCase() + item.category.slice(1),
      color: COLORS[index % COLORS.length],
    };
    return config;
  }, {} as ChartConfig);

  const monthlyChartConfig: ChartConfig = {
    total: {
      label: "Spending",
      color: "#2563eb",
    },
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
              }).format(totalBalance)}
            </div>
            <p className="text-xs text-slate-500">
              Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
              }).format(monthlySpending)}
            </div>
            <p className="text-xs text-slate-500">Total spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactionCount}</div>
            <p className="text-xs text-slate-500">Recent transactions</p>
          </CardContent>
        </Card>
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
                  >
                    {spending.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-slate-500">
                No spending data available
              </div>
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => {
                      const [year, month] = value.split("-");
                      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
                        "en-US",
                        { month: "short" }
                      );
                    }}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-slate-500">
                No monthly data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {tx.merchant || tx.description || "Unknown"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(tx.transaction_date).toLocaleDateString()} &middot;{" "}
                      {tx.category || "Uncategorized"}
                    </p>
                  </div>
                  <div
                    className={`font-semibold ${
                      tx.transaction_type === "credit"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {tx.transaction_type === "credit" ? "+" : "-"}
                    {new Intl.NumberFormat("de-DE", {
                      style: "currency",
                      currency: tx.currency,
                    }).format(Math.abs(tx.amount))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              No transactions yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
