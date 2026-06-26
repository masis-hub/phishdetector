import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays, addDays, startOfDay, isWithinInterval } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

export interface GanttPlan {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  responsible: string | null;
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number;
}

const categoryColors: Record<string, string> = {
  mitigation: "bg-primary",
  training: "bg-[hsl(199,89%,48%)]",
  policy: "bg-[hsl(var(--success))]",
  simulation: "bg-orange-500",
};

const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-[hsl(var(--success))] text-white",
};

const categoryKeys = ["mitigation", "training", "policy", "simulation"] as const;

interface GanttChartProps {
  plans: GanttPlan[];
}

export function GanttChart({ plans }: GanttChartProps) {
  const { t, i18n } = useTranslation();
  const dfLocale = i18n.language?.startsWith("es") ? es : enUS;
  const { timelineStart, timelineEnd, totalDays, months } = useMemo(() => {
    const validPlans = plans.filter((p) => p.start_date && p.end_date);
    if (validPlans.length === 0) {
      const now = startOfDay(new Date());
      return {
        timelineStart: now,
        timelineEnd: addDays(now, 90),
        totalDays: 90,
        months: [] as { label: string; startPct: number; widthPct: number }[],
      };
    }

    const starts = validPlans.map((p) => new Date(p.start_date!));
    const ends = validPlans.map((p) => new Date(p.end_date!));
    const minDate = startOfDay(new Date(Math.min(...starts.map((d) => d.getTime()))));
    const maxDate = startOfDay(new Date(Math.max(...ends.map((d) => d.getTime()))));

    // Add padding
    const paddedStart = addDays(minDate, -7);
    const paddedEnd = addDays(maxDate, 14);
    const days = Math.max(differenceInDays(paddedEnd, paddedStart), 30);

    // Calculate month markers
    const monthMarkers: { label: string; startPct: number; widthPct: number }[] = [];
    let cursor = new Date(paddedStart.getFullYear(), paddedStart.getMonth(), 1);
    while (cursor <= paddedEnd) {
      const monthStart = cursor < paddedStart ? paddedStart : cursor;
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const monthEnd = nextMonth > paddedEnd ? paddedEnd : addDays(nextMonth, -1);
      const startPct = (differenceInDays(monthStart, paddedStart) / days) * 100;
      const widthPct = (differenceInDays(monthEnd, monthStart) / days) * 100;
      monthMarkers.push({
        label: format(cursor, "MMM yyyy", { locale: dfLocale }),
        startPct,
        widthPct,
      });
      cursor = nextMonth;
    }

    return {
      timelineStart: paddedStart,
      timelineEnd: paddedEnd,
      totalDays: days,
      months: monthMarkers,
    };
  }, [plans, dfLocale]);

  // Today marker
  const today = startOfDay(new Date());
  const todayPct = isWithinInterval(today, { start: timelineStart, end: timelineEnd })
    ? (differenceInDays(today, timelineStart) / totalDays) * 100
    : null;

  const getBarPosition = (start: string, end: string) => {
    const s = startOfDay(new Date(start));
    const e = startOfDay(new Date(end));
    const left = Math.max(0, (differenceInDays(s, timelineStart) / totalDays) * 100);
    const width = Math.max(1, (differenceInDays(e, s) / totalDays) * 100);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("gantt.noPlans")}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Month headers */}
      <div className="relative h-8 border-b border-border/50 mb-1">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex items-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-l border-border/30 pl-2"
            style={{ left: `${m.startPct}%`, width: `${m.widthPct}%` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {plans.map((plan) => {
          const hasBar = plan.start_date && plan.end_date;
          const bar = hasBar ? getBarPosition(plan.start_date!, plan.end_date!) : null;

          return (
            <div key={plan.id} className="flex items-center gap-0 group">
              {/* Left label */}
              <div className="w-[280px] shrink-0 flex items-center gap-2 pr-3 py-2">
                <Badge className={`${priorityColors[plan.priority]} text-[9px] px-1.5 py-0 h-5 shrink-0`}>
                  {plan.priority.toUpperCase()}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{plan.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {plan.responsible || t("gantt.unassigned")} · {t(`plans.categories.${plan.category}`, { defaultValue: plan.category })}
                  </p>
                </div>
              </div>

              {/* Bar area */}
              <div className="flex-1 relative h-10 bg-muted/20 rounded-md overflow-hidden border border-border/20">
                {/* Today line */}
                {todayPct !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-destructive/50 z-10"
                    style={{ left: `${todayPct}%` }}
                  />
                )}

                {hasBar && bar && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded-md cursor-pointer transition-opacity group-hover:opacity-90"
                        style={{ left: bar.left, width: bar.width }}
                      >
                        {/* Background bar */}
                        <div className={`absolute inset-0 rounded-md ${categoryColors[plan.category] || "bg-primary"} opacity-25`} />
                        {/* Progress fill */}
                        <div
                          className={`absolute inset-y-0 left-0 rounded-md ${categoryColors[plan.category] || "bg-primary"} opacity-70`}
                          style={{ width: `${plan.completion_percentage}%` }}
                        />
                        {/* Label */}
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                          {plan.completion_percentage}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-semibold text-sm">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(plan.start_date!), "d MMM", { locale: dfLocale })} — {format(new Date(plan.end_date!), "d MMM yyyy", { locale: dfLocale })}
                      </p>
                      <p className="text-xs mt-1">
                        {t("gantt.status")}: <span className="font-medium">{t(`plans.statuses.${plan.status}`)}</span> · {plan.completion_percentage}% {t("gantt.completed")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {!hasBar && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
                    {t("gantt.noDates")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 flex-wrap">
        {categoryKeys.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-sm ${categoryColors[key]}`} />
            <span className="text-[10px] text-muted-foreground">{t(`plans.categories.${key}`)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-px bg-destructive/50" />
          <span className="text-[10px] text-muted-foreground">{t("gantt.today")}</span>
        </div>
      </div>
    </div>
  );
}
