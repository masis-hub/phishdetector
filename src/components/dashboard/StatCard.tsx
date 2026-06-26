import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  trend?: "up" | "down";
  onClick?: () => void;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300",
        "hover:shadow-elevated hover:-translate-y-1 hover:border-primary/20",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Decorative gradient blob */}
      <div
        className={cn(
          "absolute -right-4 -top-4 h-32 w-32 rounded-3xl opacity-15 blur-3xl transition-all duration-500 group-hover:opacity-25 group-hover:scale-110",
          changeType === "positive" && "bg-success",
          changeType === "negative" && "bg-destructive",
          changeType === "neutral" && "bg-primary"
        )}
      />
      <div
        className={cn(
          "absolute -right-2 -top-2 h-24 w-24 rounded-2xl opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-20",
          changeType === "positive" && "bg-success",
          changeType === "negative" && "bg-destructive",
          changeType === "neutral" && "bg-primary"
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {title}
          </p>
          <h3 className="text-4xl font-extrabold tracking-tight">{value}</h3>
          {change && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  changeType === "positive" && "bg-success",
                  changeType === "negative" && "bg-destructive",
                  changeType === "neutral" && "bg-primary"
                )}
              />
              <p
                className={cn(
                  "text-xs font-medium",
                  changeType === "positive" && "text-success",
                  changeType === "negative" && "text-destructive",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </p>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110",
            changeType === "positive" && "bg-success/10 text-success",
            changeType === "negative" && "bg-destructive/10 text-destructive",
            changeType === "neutral" && "bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-500 group-hover:w-full",
          changeType === "positive" && "bg-success",
          changeType === "negative" && "bg-destructive",
          changeType === "neutral" && "bg-primary"
        )}
      />
    </div>
  );
}
