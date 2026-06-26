import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, TrendingUp, TrendingDown, ArrowRight, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/asyncTimeout";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  draft: "border-muted-foreground/30 text-muted-foreground bg-muted",
  active: "border-primary/30 text-primary bg-primary/10",
  completed: "border-success/30 text-success bg-success/10",
  scheduled: "border-warning/30 text-warning bg-warning/10",
};

interface CampaignData {
  id: string;
  name: string;
  status: string;
  created_at: string;
  started_at: string | null;
  campaign_results: { total_targets: number; click_rate: number | null; report_rate: number | null } | { total_targets: number; click_rate: number | null; report_rate: number | null }[] | null;
  campaign_targets: { id: string }[];
}

export function RecentCampaigns() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("en") ? enUS : es;
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("campaigns")
          .select("id, name, status, created_at, started_at, campaign_results(total_targets, click_rate, report_rate), campaign_targets(id)")
          .order("created_at", { ascending: false })
          .limit(5),
        7000,
        "recent-campaigns-timeout",
      );

      if (!error && data) {
        setCampaigns(data as unknown as CampaignData[]);
      }
    } catch (error) {
      console.warn("[RecentCampaigns] load skipped", error);
    } finally {
      setLoading(false);
    }
  };

  const getResult = (c: CampaignData) => {
    if (!c.campaign_results) return null;
    if (Array.isArray(c.campaign_results)) return c.campaign_results[0] || null;
    return c.campaign_results;
  };

  return (
    <Card className="p-6 rounded-2xl shadow-card border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">{t("dashboard.recent.title")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("dashboard.recent.subtitle")}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
          onClick={() => navigate("/campaigns")}
        >
          {t("dashboard.recent.viewAll")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
            <Inbox className="h-7 w-7 opacity-50" />
          </div>
          <p className="text-sm font-medium">{t("dashboard.recent.empty")}</p>
          <p className="text-xs mt-1">{t("dashboard.recent.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign, index) => {
            const result = getResult(campaign);
            const targetCount = campaign.campaign_targets?.length || result?.total_targets || 0;
            const clickRate = result?.click_rate != null ? Math.round(Number(result.click_rate)) : null;
            const reportRate = result?.report_rate != null ? Math.round(Number(result.report_rate)) : null;

            return (
              <div
                key={campaign.id}
                className="group flex items-center gap-4 p-3.5 rounded-xl border border-border/40 hover:border-primary/25 hover:bg-muted/40 transition-all duration-200 cursor-pointer hover:shadow-sm"
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
              >
                {/* Number indicator */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-semibold text-sm truncate">{campaign.name}</h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-semibold px-1.5 py-0 rounded-md border shrink-0",
                        statusStyles[campaign.status] || ""
                      )}
                    >
                      {t(`campaigns.status.${campaign.status}`, campaign.status)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t("dashboard.recent.targets", { count: targetCount })} • {format(new Date(campaign.started_at || campaign.created_at), "d MMM yyyy", { locale: dateLocale })}
                  </p>
                </div>

                {campaign.status !== "draft" && clickRate !== null && (
                  <div className="flex gap-3 shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-destructive font-bold text-xs">
                        <TrendingUp className="h-3 w-3" />
                        {clickRate}%
                      </div>
                      <div className="text-[9px] text-muted-foreground font-medium">{t("dashboard.recent.click")}</div>
                    </div>
                    {reportRate !== null && (
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-success font-bold text-xs">
                          <TrendingDown className="h-3 w-3" />
                          {reportRate}%
                        </div>
                        <div className="text-[9px] text-muted-foreground font-medium">{t("dashboard.recent.report")}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
