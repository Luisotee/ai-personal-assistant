import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "destructive";
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  const isPositiveTrend = trend && trend.value > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "size-4",
            variant === "success" && "text-success",
            variant === "destructive" && "text-destructive",
            variant === "default" && "text-muted-foreground"
          )}
        />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold",
            variant === "success" && "text-success",
            variant === "destructive" && "text-destructive"
          )}
        >
          {value}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                isPositiveTrend ? "text-success" : "text-destructive"
              )}
            >
              {isPositiveTrend ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
          {description || trend?.label}
        </div>
      </CardContent>
    </Card>
  );
}
