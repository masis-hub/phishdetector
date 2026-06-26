import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, eachDayOfInterval, startOfDay } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Target {
  clicked_at: string | null;
  reported_at: string | null;
  sent_at: string | null;
}

interface CampaignTimelineChartProps {
  targets: Target[];
  startedAt: string | null;
  completedAt: string | null;
}

export function CampaignTimelineChart({ targets, startedAt, completedAt }: CampaignTimelineChartProps) {
  const { t, i18n } = useTranslation();
  const dfLocale = i18n.language?.startsWith("es") ? es : enUS;
  const chartData = useMemo(() => {
    if (!startedAt) return [];

    const start = startOfDay(new Date(startedAt));
    const end = completedAt ? startOfDay(new Date(completedAt)) : startOfDay(new Date());
    
    const days = eachDayOfInterval({ start, end });

    let cumulativeClicks = 0;
    let cumulativeReports = 0;

    return days.map((day) => {
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const dayClicks = targets.filter(
        (t) => t.clicked_at && new Date(t.clicked_at) >= day && new Date(t.clicked_at) <= dayEnd
      ).length;
      const dayReports = targets.filter(
        (t) => t.reported_at && new Date(t.reported_at) >= day && new Date(t.reported_at) <= dayEnd
      ).length;

      cumulativeClicks += dayClicks;
      cumulativeReports += dayReports;

      return {
        date: format(day, "d MMM", { locale: dfLocale }),
        clicks: cumulativeClicks,
        reportes: cumulativeReports,
        clicksDia: dayClicks,
        reportesDia: dayReports,
      };
    });
  }, [targets, startedAt, completedAt, dfLocale]);

  if (chartData.length === 0) return null;

  return (
    <Card className="p-6 rounded-2xl shadow-card border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold tracking-tight">{t("campaignCharts.timelineTitle")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("campaignCharts.timelineSubtitle")}</p>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reportsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 32%, 91%)",
                borderRadius: "12px",
                boxShadow: "0 4px 16px -2px rgba(0,0,0,0.1)",
                fontSize: "12px",
                padding: "10px 14px",
              }}
              formatter={(value: number, name: string) => {
                const label = name === "clicks" ? t("campaignCharts.clicksCum") : t("campaignCharts.reportsCum");
                return [value, label];
              }}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2.5}
              fill="url(#clicksGradient)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(0, 0%, 100%)" }}
            />
            <Area
              type="monotone"
              dataKey="reportes"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2.5}
              fill="url(#reportsGradient)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(0, 0%, 100%)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground font-medium">{t("campaignCharts.clicksLegend")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground font-medium">{t("campaignCharts.reportsLegend")}</span>
        </div>
      </div>
    </Card>
  );
}
