"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

export interface CostsChartProps {
  chartData: Record<string, string | number>[];
  chartConfig: Record<string, { label: string; color: string }>;
  categories: readonly string[];
  categoryTotals: Record<string, number>;
  categoryIcons: Record<string, LucideIcon>;
}

export default function CostsChart({
  chartData,
  chartConfig,
  categories,
  categoryTotals,
  categoryIcons,
}: CostsChartProps) {
  const lastCategoryWithData = [...categories].reverse().find((c) => (categoryTotals[c] || 0) > 0);

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[300px]">
      <BarChart accessibilityLayer data={chartData} margin={{ left: -20, right: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  const itemPayload = payload[0].payload as Record<string, unknown> | undefined;
                  const total = categories.reduce(
                    (sum, cat) => sum + ((itemPayload?.[cat] as number) || 0),
                    0
                  );
                  return (
                    <div className="flex flex-col gap-2">
                      <span className="font-bold">{itemPayload?.month as string}</span>
                      <span className="text-sm font-semibold text-primary">
                        Total: {total.toFixed(2)} €
                      </span>
                    </div>
                  );
                }
                return null;
              }}
              formatter={(value, name) => {
                const Icon = categoryIcons[name as string];
                const displayValue =
                  typeof value === "number" ? value.toFixed(2) : String(value ?? "");
                return (
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="text-muted-foreground">
                        {chartConfig[name as string]?.label || name}
                      </span>
                    </div>
                    <span className="font-mono font-medium">{displayValue} €</span>
                  </div>
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {categories.map((cat) => {
          if ((categoryTotals[cat] || 0) === 0) {
            return null;
          }
          return (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="a"
              fill={`var(--color-${cat})`}
              radius={cat === lastCategoryWithData ? [4, 4, 0, 0] : 0}
            />
          );
        })}
      </BarChart>
    </ChartContainer>
  );
}
