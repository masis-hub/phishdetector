import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, RefreshCw, Mail, MousePointerClick, AlertTriangle, Users, Eye, MailOpen, Send } from "lucide-react";
import { FileDown } from "lucide-react";
import { exportCampaignReport } from "@/lib/pdfExport";
import { CampaignTimelineChart } from "@/components/campaigns/CampaignTimelineChart";
import { DepartmentRadarChart } from "@/components/campaigns/DepartmentRadarChart";
import { PhishingFunnelChart } from "@/components/campaigns/PhishingFunnelChart";
import { RiskAssessmentPanel } from "@/components/campaigns/RiskAssessmentPanel";
import { AddTargetsDialog } from "@/components/campaigns/AddTargetsDialog";
import { LaunchCampaignButton } from "@/components/campaigns/LaunchCampaignButton";
import { TargetsList } from "@/components/campaigns/TargetsList";
import { TemplatePreviewDialog } from "@/components/campaigns/TemplatePreviewDialog";
import { useToast } from "@/hooks/use-toast";

export default function CampaignDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [addTargetsOpen, setAddTargetsOpen] = useState(false);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();
  const tErr = (code: string, fallback?: string) =>
    t(`errors.${code}`, { defaultValue: fallback || code });

  const fetchCampaign = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("*, phishing_templates(id, name, subject, sender_name, sender_email, html_content), campaign_results(*)")
        .eq("id", id)
        .maybeSingle();
      if (data) setCampaign(data);
    } catch (e) {
      console.error("[CampaignDetail] fetchCampaign error", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTargets = useCallback(async () => {
    if (!id) return;
    setTargetsLoading(true);
    try {
      const { data } = await supabase
        .from("campaign_targets")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: true });
      if (data) setTargets(data);
    } catch (e) {
      console.error("[CampaignDetail] fetchTargets error", e);
    } finally {
      setTargetsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
    fetchTargets();
  }, [fetchCampaign, fetchTargets]);

  const handleRefreshResults = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ campaign_id: id }),
      });
      await fetchCampaign();
      await fetchTargets();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">{t("campaigns.detail.notFound")}</h2>
          <Button variant="link" onClick={() => navigate("/campaigns")}>{t("campaigns.detail.back")}</Button>
        </div>
      </DashboardLayout>
    );
  }

  const template = campaign.phishing_templates;
  const sentCount = targets.filter((t) => t.sent_at).length;
  const openedCount = targets.filter((t) => t.opened_at).length;
  const clickedCount = targets.filter((t) => t.clicked_at).length;
  const reportedCount = targets.filter((t) => t.reported_at).length;
  const isActive = campaign.status !== "draft";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">{campaign.name}</h1>
              <Badge variant={campaign.status === "active" ? "default" : campaign.status === "completed" ? "secondary" : "outline"}>
                {t(`campaigns.status.${campaign.status}`, { defaultValue: campaign.status })}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{campaign.description || t("campaigns.detail.noDescription")}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isActive && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => exportCampaignReport(campaign, targets)}
              >
                <FileDown className="h-4 w-4" /> PDF
              </Button>
            )}
            {isActive && (
              <>
                <Button variant="outline" className="gap-2" onClick={handleRefreshResults}>
                  <RefreshCw className="h-4 w-4" /> {t("campaigns.detail.refreshResults")}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={resending}
                  onClick={async () => {
                    setResending(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;
                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign-emails`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${session.access_token}`,
                          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        },
                        body: JSON.stringify({ campaign_id: id, resend: true, locale: i18n.language?.startsWith("en") ? "en" : "es" }),
                      });
                      const result = await res.json();
                      if (res.ok) {
                        toast({
                          title: t("campaigns.detail.toast.resentTitle"),
                          description: t("campaigns.detail.toast.resentDesc", { sent: result.sent, total: result.total }),
                        });
                        await fetchCampaign();
                        await fetchTargets();
                      } else {
                        toast({
                          title: t("campaigns.detail.toast.resendErrorTitle"),
                          description: result.error ? tErr(result.error, t("campaigns.detail.toast.resendErrorDesc")) : t("campaigns.detail.toast.resendErrorDesc"),
                          variant: "destructive",
                        });
                      }
                    } catch {
                      toast({ title: t("campaigns.detail.toast.resendErrorTitle"), description: t("campaigns.detail.toast.resendErrorDesc"), variant: "destructive" });
                    } finally {
                      setResending(false);
                    }
                  }}
                >
                  <Send className="h-4 w-4" /> {resending ? t("campaigns.detail.resending") : t("campaigns.detail.resend")}
                </Button>
              </>
            )}
            <LaunchCampaignButton
              campaignId={campaign.id}
              hasTemplate={!!campaign.template_id}
              targetCount={targets.length}
              status={campaign.status}
              onLaunched={() => { fetchCampaign(); fetchTargets(); }}
            />
          </div>
        </div>

        {/* Stats - 5 cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{targets.length}</p>
                <p className="text-xs text-muted-foreground">{t("campaigns.detail.stats.targets")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{sentCount}</p>
                <p className="text-xs text-muted-foreground">{t("campaigns.detail.stats.sent")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(199,89%,48%)]/10"><MailOpen className="h-5 w-5 text-[hsl(199,89%,48%)]" /></div>
              <div>
                <p className="text-2xl font-bold text-[hsl(199,89%,48%)]">{openedCount}</p>
                <p className="text-xs text-muted-foreground">{t("campaigns.detail.stats.opened")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><MousePointerClick className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold text-destructive">{clickedCount}</p>
                <p className="text-xs text-muted-foreground">{t("campaigns.detail.stats.clicks")}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--success))]/10"><AlertTriangle className="h-5 w-5 text-[hsl(var(--success))]" /></div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--success))]">{reportedCount}</p>
                <p className="text-xs text-muted-foreground">{t("campaigns.detail.stats.reported")}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Template Info */}
        {template && (
          <Card className="p-4 rounded-2xl shadow-card border-border/50 cursor-pointer hover:border-primary/25 transition-all duration-200" onClick={() => setTemplatePreviewOpen(true)}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{t("campaigns.detail.templateBlock.title")}</h3>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary rounded-lg">
                <Eye className="h-3.5 w-3.5" /> {t("campaigns.detail.templateBlock.preview")}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">{t("campaigns.detail.templateBlock.template")}:</span> {template.name}</div>
              <div><span className="text-muted-foreground">{t("campaigns.detail.templateBlock.subject")}:</span> {template.subject}</div>
              <div><span className="text-muted-foreground">{t("campaigns.detail.templateBlock.senderName")}:</span> {template.sender_name}</div>
              <div><span className="text-muted-foreground">{t("campaigns.detail.templateBlock.from")}:</span> {template.sender_email}</div>
            </div>
          </Card>
        )}

        {/* Charts Row 1: Timeline + Radar */}
        {isActive && targets.length > 0 && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CampaignTimelineChart
                  targets={targets}
                  startedAt={campaign.started_at}
                  completedAt={campaign.completed_at}
                />
              </div>
              <DepartmentRadarChart targets={targets} />
            </div>

            {/* Charts Row 2: Funnel + Risk Assessment */}
            <div className="grid gap-6 lg:grid-cols-3">
              <PhishingFunnelChart
                totalTargets={targets.length}
                sentCount={sentCount}
                openedCount={openedCount}
                clickedCount={clickedCount}
                reportedCount={reportedCount}
              />
              <div className="lg:col-span-2">
                <RiskAssessmentPanel targets={targets} campaignName={campaign.name} />
              </div>
            </div>
          </>
        )}

        {/* Targets */}
        <Card className="p-6 rounded-2xl shadow-card border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t("campaigns.detail.targetsSection")}</h3>
            {campaign.status !== "active" && (
              <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setAddTargetsOpen(true)}>
                <Plus className="h-4 w-4" /> {t("campaigns.detail.addTargets")}
              </Button>
            )}
          </div>
          <TargetsList targets={targets} loading={targetsLoading} campaignId={campaign.id} onResent={() => { fetchCampaign(); fetchTargets(); }} />
        </Card>
      </div>

      <AddTargetsDialog
        open={addTargetsOpen}
        onOpenChange={setAddTargetsOpen}
        campaignId={campaign.id}
        onSuccess={fetchTargets}
      />

      {template && (
        <TemplatePreviewDialog
          open={templatePreviewOpen}
          onOpenChange={setTemplatePreviewOpen}
          template={{ id: campaign.template_id, ...template }}
          onSaved={fetchCampaign}
        />
      )}
    </DashboardLayout>
  );
}
