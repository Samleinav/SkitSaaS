'use client';

import * as React from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import type { AdminDashboardActivityPoint } from './types';

type ActivityVolumeChartLabels = {
  salesHint: string;
  rangeFrom: string;
  rangeTo: string;
  last7Days: string;
  last30Days: string;
  last90Days: string;
  resetRange: string;
};

type ActivityVolumeChartProps = {
  data: AdminDashboardActivityPoint[];
  dateLocale: string;
  config: ChartConfig;
  labels: ActivityVolumeChartLabels;
};

function parseChartDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatAxisDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric'
  }).format(parseChartDate(value));
}

function formatInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function createDefaultRange(points: AdminDashboardActivityPoint[]) {
  const maxDate = points[points.length - 1]?.date;
  if (!maxDate) {
    return { from: '', to: '' };
  }

  const toDate = parseChartDate(maxDate);
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 29);

  return {
    from: formatInputDate(fromDate),
    to: maxDate
  };
}

function getSeriesTotals(points: AdminDashboardActivityPoint[]) {
  return points.reduce(
    (totals, point) => {
      totals.users += point.users;
      totals.subscriptions += point.subscriptions;
      totals.sales += point.sales;
      return totals;
    },
    { users: 0, subscriptions: 0, sales: 0 }
  );
}

export function ActivityVolumeChart({
  data,
  dateLocale,
  config,
  labels
}: ActivityVolumeChartProps) {
  const dataMinDate = data[0]?.date ?? '';
  const dataMaxDate = data[data.length - 1]?.date ?? '';
  const initialRange = React.useMemo(() => createDefaultRange(data), [data]);
  const [fromDate, setFromDate] = React.useState(initialRange.from);
  const [toDate, setToDate] = React.useState(initialRange.to);

  React.useEffect(() => {
    setFromDate(initialRange.from);
    setToDate(initialRange.to);
  }, [initialRange.from, initialRange.to]);

  const visibleData = React.useMemo(
    () =>
      data.filter(
        (point) =>
          (!fromDate || point.date >= fromDate) && (!toDate || point.date <= toDate)
      ),
    [data, fromDate, toDate]
  );

  const totals = getSeriesTotals(visibleData);

  function applyQuickRange(days: number) {
    if (!dataMaxDate) {
      return;
    }

    const to = parseChartDate(dataMaxDate);
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));

    const nextFrom = formatInputDate(from);

    setFromDate(nextFrom < dataMinDate ? dataMinDate : nextFrom);
    setToDate(dataMaxDate);
  }

  function resetRange() {
    setFromDate(initialRange.from);
    setToDate(initialRange.to);
  }

  const usersStroke = 'hsl(var(--chart-1))';
  const subscriptionsStroke = 'hsl(var(--chart-2))';
  const salesStroke = 'hsl(var(--chart-5))';

  return (
    <div className="space-y-4">
      <div className="grid gap-2 px-6 pt-1 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{config.users?.label}</p>
          <p className="text-lg font-semibold text-foreground">
            {totals.users.toLocaleString(dateLocale)}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{config.subscriptions?.label}</p>
          <p className="text-lg font-semibold text-foreground">
            {totals.subscriptions.toLocaleString(dateLocale)}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{config.sales?.label}</p>
          <p className="text-lg font-semibold text-foreground">
            {totals.sales.toLocaleString(dateLocale)}
          </p>
          <p className="text-[10px] text-muted-foreground">{labels.salesHint}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2 px-6">
        <div className="flex flex-wrap gap-2">
          <label className="grid gap-1 text-[11px] text-muted-foreground">
            <span>{labels.rangeFrom}</span>
            <input
              type="date"
              min={dataMinDate}
              max={dataMaxDate}
              value={fromDate}
              onChange={(event) => {
                const next = event.target.value;
                setFromDate(next);
                if (toDate && next > toDate) {
                  setToDate(next);
                }
              }}
              className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
            />
          </label>
          <label className="grid gap-1 text-[11px] text-muted-foreground">
            <span>{labels.rangeTo}</span>
            <input
              type="date"
              min={dataMinDate}
              max={dataMaxDate}
              value={toDate}
              onChange={(event) => {
                const next = event.target.value;
                setToDate(next);
                if (fromDate && next < fromDate) {
                  setFromDate(next);
                }
              }}
              className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
            />
          </label>
        </div>

        <div className="inline-flex rounded-lg border border-border/70 bg-background p-1">
          {[
            { days: 7, label: labels.last7Days },
            { days: 30, label: labels.last30Days },
            { days: 90, label: labels.last90Days }
          ].map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => applyQuickRange(option.days)}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={resetRange}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {labels.resetRange}
          </button>
        </div>
      </div>

      <ChartContainer
        config={config}
        className="h-[260px] w-full rounded-b-xl border-t border-border/60 bg-muted/20 px-2 pb-2 pt-3"
      >
        <LineChart accessibilityLayer data={visibleData} margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={26}
            tickMargin={8}
            tickFormatter={(value) => formatAxisDate(String(value), dateLocale)}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={26} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(value) => formatAxisDate(String(value), dateLocale)}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            dataKey="users"
            type="monotone"
            stroke={usersStroke}
            strokeWidth={2.4}
            dot={{ r: 2, fill: usersStroke, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: usersStroke, strokeWidth: 0 }}
          />
          <Line
            dataKey="subscriptions"
            type="monotone"
            stroke={subscriptionsStroke}
            strokeWidth={2.4}
            dot={{ r: 2, fill: subscriptionsStroke, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: subscriptionsStroke, strokeWidth: 0 }}
          />
          <Line
            dataKey="sales"
            type="monotone"
            stroke={salesStroke}
            strokeWidth={2.4}
            dot={{ r: 2, fill: salesStroke, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: salesStroke, strokeWidth: 0 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
