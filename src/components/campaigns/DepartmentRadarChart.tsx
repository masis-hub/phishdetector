import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Crosshair } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Target {
  department: string | null;
  clicked_at: string | null;
  sent_at: string | null;
}

interface DepartmentRadarChartProps {
  targets: Target[];
}

export function DepartmentRadarChart({ targets }: DepartmentRadarChartProps) {
  const { t } = useTranslation();
  const chartData = useMemo(() => {
    const deptMap = new Map<string, { total: number; clicked: number }>();

    targets.forEach((t) => {
      const dept = t.department || "__noDept__";
      if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, clicked: 0 });
      const d = deptMap.get(dept)!;
      d.total++;
      if (t.clicked_at) d.clicked++;
    });

    return Array.from(deptMap.entries())
      .map(([dept, { total, clicked }]) => ({
        department: dept === "__noDept__" ? t("campaignCharts.noDept") : dept,
        clickRate: total > 0 ? Math.round((clicked / total) * 100) : 0,
        clicks: clicked,
        total,
      }))
      .sort((a, b) => b.clickRate - a.clickRate);
  }, [targets, t]);

  if (chartData.length === 0) return null;

  return (
    <Card className="p-6 rounded-2xl shadow-card border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
          <Crosshair className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h3 className="text-base font-bold tracking-tight">{t("campaignCharts.deptTitle")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("campaignCharts.deptSubtitle")}</p>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="hsl(214, 32%, 91%)" />
            <PolarAngleAxis
              dataKey="department"
              tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "hsl(215, 16%, 47%)" }}
              tickFormatter={(v) => `${v}%`}
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
              formatter={(value: number, _name: string, entry: any) => {
                return [`${value}% (${entry.payload.clicks}/${entry.payload.total})`, t("campaignCharts.clickRate")];
              }}
            />
            <Radar
              name="Click Rate"
              dataKey="clickRate"
              stroke="hsl(0, 84%, 60%)"
              fill="hsl(0, 84%, 60%)"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
