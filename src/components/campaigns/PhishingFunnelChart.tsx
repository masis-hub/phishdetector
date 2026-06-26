import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PhishingFunnelChartProps {
  totalTargets: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  reportedCount: number;
}

export function PhishingFunnelChart({
  totalTargets,
  sentCount,
  openedCount,
  clickedCount,
  reportedCount,
}: PhishingFunnelChartProps) {
  const { t } = useTranslation();
  const data = useMemo(() => {
    const pct = (v: number) => (totalTargets > 0 ? Math.round((v / totalTargets) * 100) : 0);
    return [
      { name: t("campaignCharts.fSent"), value: sentCount, pct: pct(sentCount), color: "hsl(217, 91%, 60%)" },
      { name: t("campaignCharts.fOpened"), value: openedCount, pct: pct(openedCount), color: "hsl(199, 89%, 48%)" },
      { name: t("campaignCharts.fClicks"), value: clickedCount, pct: pct(clickedCount), color: "hsl(0, 84%, 60%)" },
      { name: t("campaignCharts.fReported"), value: reportedCount, pct: pct(reportedCount), color: "hsl(142, 76%, 36%)" },
    ];
  }, [totalTargets, sentCount, openedCount, clickedCount, reportedCount, t]);

  return (
    <Card className="p-6 rounded-2xl shadow-card border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Filter className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold tracking-tight">{t("campaignCharts.funnelTitle")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("campaignCharts.funnelSubtitle")}</p>
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)", fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="pct"
                position="right"
                formatter={(v: number) => `${v}%`}
                style={{ fontSize: 12, fontWeight: 600, fill: "hsl(215, 16%, 47%)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion rates */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
        <div className="text-center">
          <p className="text-lg font-bold text-primary">
            {sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground">{t("campaignCharts.openRate")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-destructive">
            {openedCount > 0 ? Math.round((clickedCount / openedCount) * 100) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground">{t("campaignCharts.clickOverOpen")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[hsl(var(--success))]">
            {clickedCount > 0 ? Math.round((reportedCount / clickedCount) * 100) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground">{t("campaignCharts.reportOverClick")}</p>
        </div>
      </div>
    </Card>
  );
}
