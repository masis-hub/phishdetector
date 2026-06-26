import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, ShieldCheck, TrendingDown, Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Target {
  department: string | null;
  clicked_at: string | null;
  opened_at: string | null;
  reported_at: string | null;
  sent_at: string | null;
}

interface RiskAssessmentPanelProps {
  targets: Target[];
  campaignName: string;
}

function getRiskLevel(clickRate: number): { key: "critical"|"high"|"medium"|"low"; color: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (clickRate >= 50) return { key: "critical", color: "text-destructive", variant: "destructive" };
  if (clickRate >= 30) return { key: "high", color: "text-[hsl(var(--warning))]", variant: "default" };
  if (clickRate >= 15) return { key: "medium", color: "text-primary", variant: "secondary" };
  return { key: "low", color: "text-[hsl(var(--success))]", variant: "outline" };
}

export function RiskAssessmentPanel({ targets, campaignName }: RiskAssessmentPanelProps) {
  const { t } = useTranslation();
  const analysis = useMemo(() => {
    const sent = targets.filter((t) => t.sent_at).length;
    const opened = targets.filter((t) => t.opened_at).length;
    const clicked = targets.filter((t) => t.clicked_at).length;
    const reported = targets.filter((t) => t.reported_at).length;

    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const reportRate = sent > 0 ? (reported / sent) * 100 : 0;

    // Department analysis
    const deptMap = new Map<string, { total: number; clicked: number; reported: number }>();
    targets.forEach((t) => {
      const dept = t.department || "__noDept__";
      if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, clicked: 0, reported: 0 });
      const d = deptMap.get(dept)!;
      d.total++;
      if (t.clicked_at) d.clicked++;
      if (t.reported_at) d.reported++;
    });

    const departments = Array.from(deptMap.entries())
      .map(([name, stats]) => ({
        name: name === "__noDept__" ? t("riskPanel.noDept") : name,
        clickRate: stats.total > 0 ? (stats.clicked / stats.total) * 100 : 0,
        reportRate: stats.total > 0 ? (stats.reported / stats.total) * 100 : 0,
        total: stats.total,
        clicked: stats.clicked,
      }))
      .sort((a, b) => b.clickRate - a.clickRate);

    const riskiest = departments[0];
    const safest = [...departments].sort((a, b) => a.clickRate - b.clickRate)[0];

    // Generate recommendations
    const recommendations: string[] = [];
    if (clickRate >= 30) recommendations.push(t("riskPanel.recs.training"));
    if (riskiest && riskiest.clickRate >= 40) recommendations.push(t("riskPanel.recs.deptIntensive", { name: riskiest.name, rate: Math.round(riskiest.clickRate) }));
    if (reportRate < 20) recommendations.push(t("riskPanel.recs.reportCulture"));
    if (openRate > 80) recommendations.push(t("riskPanel.recs.credible"));
    if (clickRate < 15) recommendations.push(t("riskPanel.recs.good"));
    if (recommendations.length === 0) recommendations.push(t("riskPanel.recs.continue"));

    return { clickRate, openRate, reportRate, riskiest, safest, departments, recommendations, sent, clicked, reported };
  }, [targets, t]);

  const risk = getRiskLevel(analysis.clickRate);

  return (
    <Card className="p-6 rounded-2xl shadow-card border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${analysis.clickRate >= 30 ? "bg-destructive/10" : "bg-[hsl(var(--success))]/10"}`}>
            {analysis.clickRate >= 30 ? (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-[hsl(var(--success))]" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">{t("riskPanel.title")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("riskPanel.subtitle")}</p>
          </div>
        </div>
        <Badge variant={risk.variant} className="text-xs font-semibold px-3 py-1">
          {t("riskPanel.risk")} {t(`riskPanel.levels.${risk.key}`)}
        </Badge>
      </div>

      {/* Overall Score */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <p className="text-2xl font-bold text-primary">{Math.round(analysis.openRate)}%</p>
          <p className="text-[10px] text-muted-foreground font-medium">{t("riskPanel.openRate")}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <p className={`text-2xl font-bold ${risk.color}`}>{Math.round(analysis.clickRate)}%</p>
          <p className="text-[10px] text-muted-foreground font-medium">{t("riskPanel.clickRate")}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-muted/50">
          <p className="text-2xl font-bold text-[hsl(var(--success))]">{Math.round(analysis.reportRate)}%</p>
          <p className="text-[10px] text-muted-foreground font-medium">{t("riskPanel.reportRate")}</p>
        </div>
      </div>

      {/* Department Risk Bars */}
      <div className="space-y-3 mb-6">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("riskPanel.deptRisk")}</h4>
        {analysis.departments.slice(0, 5).map((dept) => {
          const deptRisk = getRiskLevel(dept.clickRate);
          return (
            <div key={dept.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{dept.name}</span>
                <span className={`font-semibold ${deptRisk.color}`}>{Math.round(dept.clickRate)}%</span>
              </div>
              <Progress value={dept.clickRate} className="h-2" />
            </div>
          );
        })}
      </div>

      {/* Key Insights */}
      <div className="space-y-3 mb-6">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <TrendingDown className="h-3.5 w-3.5" /> {t("riskPanel.insights")}
        </h4>
        <div className="space-y-2">
          {analysis.riskiest && (
            <div className="flex items-start gap-2 text-xs">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
              <span>
                <strong>{analysis.riskiest.name}</strong>{" "}
                {t("riskPanel.insightRiskiest", { name: "", rate: Math.round(analysis.riskiest.clickRate), clicked: analysis.riskiest.clicked, total: analysis.riskiest.total }).replace(/<\/?0>/g, "").replace(/^\s+/, "")}
              </span>
            </div>
          )}
          {analysis.safest && analysis.safest.name !== analysis.riskiest?.name && (
            <div className="flex items-start gap-2 text-xs">
              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))] mt-1.5 shrink-0" />
              <span>
                <strong>{analysis.safest.name}</strong>{" "}
                {t("riskPanel.insightSafest", { name: "", rate: Math.round(analysis.safest.clickRate) }).replace(/<\/?0>/g, "").replace(/^\s+/, "")}
              </span>
            </div>
          )}
          <div className="flex items-start gap-2 text-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <span>
              {t("riskPanel.insightReport", { reported: analysis.reported, clicked: analysis.clicked, pct: analysis.clicked > 0 ? Math.round((analysis.reported / analysis.clicked) * 100) : 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5" /> {t("riskPanel.recommendations")}
        </h4>
        <div className="space-y-2">
          {analysis.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 text-xs bg-muted/30 p-2.5 rounded-lg">
              <span className="font-bold text-primary shrink-0">{i + 1}.</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
