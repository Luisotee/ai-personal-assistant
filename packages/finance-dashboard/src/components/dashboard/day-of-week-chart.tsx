'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { aggregateSpendingByDayOfWeek } from '@/lib/chart-utils';
import type { Transaction } from '@/lib/types';

interface DayOfWeekChartProps {
  transactions: Transaction[];
  currency: string;
}

export function DayOfWeekChart({ transactions }: DayOfWeekChartProps) {
  const data = useMemo(() => aggregateSpendingByDayOfWeek(transactions), [transactions]);

  const chartConfig = {
    avgSpending: {
      label: 'Avg. Daily Spending',
      color: 'var(--chart-3)', // Orange
    },
  };

  // Check if there's any spending data
  const hasData = data.some((d) => d.totalSpending > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Day of Week</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No spending data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Day of Week</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value.toString();
              }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="avgSpending" fill="var(--color-avgSpending)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
