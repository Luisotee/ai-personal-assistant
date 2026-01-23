'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { aggregateCashFlowByMonth } from '@/lib/chart-utils';
import type { Transaction } from '@/lib/types';

interface CashFlowChartProps {
  transactions: Transaction[];
  months?: number;
  currency: string;
}

export function CashFlowChart({ transactions, months = 6 }: CashFlowChartProps) {
  const data = useMemo(
    () => aggregateCashFlowByMonth(transactions, months),
    [transactions, months]
  );

  const chartConfig = {
    income: {
      label: 'Income',
      color: 'var(--chart-2)', // Green
    },
    expenses: {
      label: 'Expenses',
      color: 'var(--chart-1)', // Blue
    },
    net: {
      label: 'Net',
      color: 'var(--chart-5)', // Cyan
    },
  };

  // Check if there's any data
  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No transaction data available for the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                // Format YYYY-MM to "Jan", "Feb", etc.
                const date = new Date(value + '-01');
                return date.toLocaleDateString('en-US', { month: 'short' });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                // Format as "1k", "2k", etc.
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value.toString();
              }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="var(--color-income)"
              fill="var(--color-income)"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="var(--color-expenses)"
              fill="var(--color-expenses)"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="net"
              stroke="var(--color-net)"
              fill="none"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
