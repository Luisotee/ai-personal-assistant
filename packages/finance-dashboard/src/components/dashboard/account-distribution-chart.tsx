'use client';

import { useMemo } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { calculateAccountDistribution } from '@/lib/chart-utils';
import type { BankAccount } from '@/lib/types';

interface AccountDistributionChartProps {
  accounts: BankAccount[];
  convertToPrimary: (amount: number, currency: string) => number;
  currency: string;
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function AccountDistributionChart({
  accounts,
  convertToPrimary,
}: AccountDistributionChartProps) {
  const data = useMemo(
    () => calculateAccountDistribution(accounts, convertToPrimary),
    [accounts, convertToPrimary]
  );

  const chartConfig = data.reduce(
    (acc, item, index) => {
      acc[item.accountName] = {
        label: item.accountName,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No account data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Pie
              data={data}
              dataKey="totalBalance"
              nameKey="accountName"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              label={({ percentage }) => `${(percentage * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
