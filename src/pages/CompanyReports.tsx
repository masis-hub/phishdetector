import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, Plus, FileText, Loader2, Sparkles } from "lucide-react";
import { InviteClientDialog } from "@/components/organizations/InviteClientDialog";
import { InviteOrgMemberDialog } from "@/components/organizations/InviteOrgMemberDialog";

interface Organization {
  id: string;
  name: string;
  contact_email: string | null;
}

interface CampaignResult {
  total_targets: number;
  emails_sent: number;
  emails_clicked: number;
  emails_reported: number;
  click_rate: number | null;
  report_rate: number | null;
}

interface CampaignWithResults {
  id: string;
  name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  campaign_results: CampaignResult | CampaignResult[] | null;
}

function getMitigationPlan(avgClickRate: number, avgReportRate: number) {
  const plan: { priority: string; title: string; description: string; level: "critical" | "high" | "medium" | "low" }[] = [];

  if (avgClickRate > 50) {
    plan.push({
      priority: "1",
      title: "Capacitación inmediata obligatoria",
      description: "Más del 50% de los empleados hicieron click. Se requiere capacitación urgente en identificación de phishing para toda la organización.",
      level: "critical",
    });
  } else if (avgClickRate > 30) {
    plan.push({
      priority: "1",
      title: "Programa de concientización reforzado",
      description: "Entre 30-50% de tasa de click. Implementar sesiones de capacitación mensuales con ejemplos prácticos.",
      level: "high",
    });
  } else if (avgClickRate > 10) {
    plan.push({
      priority: "1",
      title: "Capacitación de refuerzo trimestral",
      description: "Tasa de click moderada. Mantener programa de concientización con simulaciones periódicas.",
      level: "medium",
    });
  } else {
    plan.push({
      priority: "1",
      title: "Mantenimiento del programa actual",
      description: "Excelente desempeño. Continuar con simulaciones periódicas para mantener la vigilancia.",
      level: "low",
    });
  }

  if (avgReportRate < 20) {
    plan.push({
      priority: "2",
      title: "Implementar canal de reporte fácil",
      description: "Menos del 20% reportó el phishing. Instalar botón de reporte en el cliente de correo y capacitar en su uso.",
      level: "high",
    });
  } else if (avgReportRate < 50) {
    plan.push({
      priority: "2",
      title: "Incentivar cultura de reporte",
      description: "Tasa de reporte mejorable. Crear programa de reconocimiento para empleados que reporten intentos de phishing.",
      level: "medium",
    });
  }

  plan.push({
    priority: String(plan.length + 1),
    title: "Políticas de seguridad de correo",
    description: "Revisar y actualizar filtros SPF, DKIM y DMARC. Implementar sandboxing de enlaces sospechosos.",
    level: "medium",
  });

  plan.push({
    priority: String(plan.length + 1),
    title: "Simulaciones recurrentes",
    description: "Programar simulaciones mensuales con diferentes niveles de dificultad para medir progreso continuo.",
    level: "medium",
  });

  return plan;
}

const levelColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-success text-white",
};

export default function CompanyReports() {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [campaigns, setCampaigns] = useState<CampaignWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [seedDemo, setSeedDemo] = useState(true);
  const [creating, setCreating] = useState(false);
  const [runningDemo, setRunningDemo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) fetchCampaigns(selectedOrg);
  }, [selectedOrg]);

  async function fetchOrganizations() {
    try {
      const { data, error } = await supabase.from("organizations").select("*").order("name");
      if (error) {
        console.error("organizations load error", error);
      } else {
        setOrganizations(data || []);
        if (data && data.length > 0 && !selectedOrg) setSelectedOrg(data[0].id);
      }
    } catch (e) {
      console.error("[CompanyReports] fetchOrganizations error", e);
    } finally {
      setLoading(false);
    }
  }

  async function createDemoOrgAndRunSimulation() {
    if (runningDemo) return;
    setRunningDemo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const stamp = new Date().toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      const orgName = `Demo Empresa ${stamp}`;

      // 1) Org
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name: orgName, contact_email: `demo+${Date.now()}@phishdetector.app`, created_by: user?.id })
        .select("id, name")
        .single();
      if (orgErr || !org) throw new Error(orgErr?.message || "org");

      // 2) Campaign (completed simulation)
      const startedAt = new Date(Date.now() - 3 * 86400000).toISOString();
      const completedAt = new Date().toISOString();
      const { data: campaign, error: cErr } = await supabase
        .from("campaigns")
        .insert({
          name: `Simulación: Aviso urgente RRHH`,
          description: "Campaña demo generada automáticamente para presentación.",
          status: "completed",
          organization_id: org.id,
          created_by: user?.id,
          started_at: startedAt,
          completed_at: completedAt,
        })
        .select("id")
        .single();
      if (cErr || !campaign) throw new Error(cErr?.message || "campaign");

      // 3) Demo targets (20) with realistic click/report distribution
      const departments = ["Finanzas", "RRHH", "TI", "Ventas", "Operaciones"];
      const firstNames = ["Ana", "Carlos", "María", "José", "Lucía", "Pedro", "Sofía", "Luis", "Elena", "Diego",
        "Camila", "Andrés", "Paula", "Jorge", "Valeria", "Tomás", "Isabel", "Mateo", "Daniela", "Sebastián"];
      const lastNames = ["García", "Rodríguez", "Martínez", "López", "Hernández"];
      const TOTAL = 20;
      const targets = Array.from({ length: TOTAL }, (_, i) => {
        const fn = firstNames[i % firstNames.length];
        const ln = lastNames[i % lastNames.length];
        const clicked = i % 3 === 0; // ~33%
        const reported = !clicked && i % 4 === 0; // de los que no hicieron click
        const sentTs = Date.now() - 3 * 86400000 + i * 60000;
        return {
          campaign_id: campaign.id,
          organization_id: org.id,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@${org.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.demo`,
          full_name: `${fn} ${ln}`,
          department: departments[i % departments.length],
          unique_token: `demo-${campaign.id.slice(0, 8)}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          sent_at: new Date(sentTs).toISOString(),
          opened_at: i % 2 === 0 ? new Date(sentTs + 5 * 60000).toISOString() : null,
          clicked_at: clicked ? new Date(sentTs + 10 * 60000).toISOString() : null,
          reported_at: reported ? new Date(sentTs + 15 * 60000).toISOString() : null,
        };
      });
      const { error: tErr } = await supabase.from("campaign_targets").insert(targets);
      if (tErr) throw new Error(tErr.message);

      // 4) Aggregated results (upsert via unique constraint)
      const clicks = targets.filter((t) => t.clicked_at).length;
      const reports = targets.filter((t) => t.reported_at).length;
      const { error: rErr } = await supabase.from("campaign_results").upsert({
        campaign_id: campaign.id,
        organization_id: org.id,
        total_targets: TOTAL,
        emails_sent: TOTAL,
        emails_clicked: clicks,
        emails_reported: reports,
        click_rate: Number(((clicks / TOTAL) * 100).toFixed(2)),
        report_rate: Number(((reports / TOTAL) * 100).toFixed(2)),
      }, { onConflict: "campaign_id" });
      if (rErr) throw new Error(rErr.message);

      toast({
        title: t("reports.demoReadyTitle"),
        description: t("reports.demoReadyDesc", { org: org.name, clicks, reports, total: TOTAL }),
      });
      await fetchOrganizations();
      setSelectedOrg(org.id);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e?.message || t("reports.orgErr"), variant: "destructive" });
    } finally {
      setRunningDemo(false);
    }
  }

  async function fetchCampaigns(orgId: string) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, status, started_at, completed_at, campaign_results(*)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("campaigns load error", error);
    } else {
      setCampaigns((data as unknown as CampaignWithResults[]) || []);
    }
  }

  async function createOrganization() {
    if (!newOrgName.trim() || creating) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({
          name: newOrgName.trim(),
          contact_email: newOrgEmail.trim() || null,
          created_by: user?.id,
        })
        .select("id, name, contact_email")
        .single();
      if (error || !org) {
        toast({ title: t("common.error"), description: error?.message || t("reports.orgErr"), variant: "destructive" });
        return;
      }

      if (seedDemo) {
        // Fire-and-forget seed: a single completed campaign with results so the org isn't empty for the demo.
        const { data: campaign } = await supabase
          .from("campaigns")
          .insert({
            name: `Simulación demo - ${org.name}`,
            status: "completed",
            organization_id: org.id,
            created_by: user?.id,
            started_at: new Date(Date.now() - 7 * 86400000).toISOString(),
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (campaign?.id) {
          await supabase.from("campaign_results").insert({
            campaign_id: campaign.id,
            total_targets: 25,
            emails_sent: 25,
            emails_clicked: 7,
            emails_reported: 12,
            click_rate: 28,
            report_rate: 48,
          });
        }
      }

      toast({ title: t("common.success"), description: t("reports.orgOk") });
      setNewOrgName("");
      setNewOrgEmail("");
      setDialogOpen(false);
      // Refresh list and immediately select the new org (no waiting on the user)
      await fetchOrganizations();
      setSelectedOrg(org.id);
    } finally {
      setCreating(false);
    }
  }

  // Helper to get result from campaign (handles object or array)
  function getResult(c: CampaignWithResults): CampaignResult | null {
    if (!c.campaign_results) return null;
    if (Array.isArray(c.campaign_results)) return c.campaign_results[0] || null;
    return c.campaign_results;
  }

  // Aggregate stats
  const completedCampaigns = campaigns.filter((c) => getResult(c) !== null);
  const totalTargets = completedCampaigns.reduce((s, c) => s + (getResult(c)?.total_targets || 0), 0);
  const totalClicked = completedCampaigns.reduce((s, c) => s + (getResult(c)?.emails_clicked || 0), 0);
  const totalReported = completedCampaigns.reduce((s, c) => s + (getResult(c)?.emails_reported || 0), 0);
  const totalSent = completedCampaigns.reduce((s, c) => s + (getResult(c)?.emails_sent || 0), 0);
  const avgClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
  const avgReportRate = totalSent > 0 ? (totalReported / totalSent) * 100 : 0;

  const mitigationPlan = getMitigationPlan(avgClickRate, avgReportRate);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("reports.title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">{t("reports.subtitle")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-primary/40 text-primary hover:bg-primary/10"
              onClick={createDemoOrgAndRunSimulation}
              disabled={runningDemo}
            >
              {runningDemo ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("reports.runningDemo")}</>) : (<><Sparkles className="h-4 w-4 mr-2" /> {t("reports.oneClickDemo")}</>)}
            </Button>
            <InviteClientDialog onCreated={async (id) => { await fetchOrganizations(); setSelectedOrg(id); }} />
            {selectedOrg && (
              <InviteOrgMemberDialog
                organizationId={selectedOrg}
                organizationName={organizations.find((o) => o.id === selectedOrg)?.name}
              />
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> {t("reports.newOrg")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("reports.createOrg")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t("reports.orgName")}</Label>
                  <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder={t("reports.orgNamePh")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("reports.contactEmail")}</Label>
                  <Input value={newOrgEmail} onChange={(e) => setNewOrgEmail(e.target.value)} placeholder={t("reports.contactEmailPh")} />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                  <Checkbox checked={seedDemo} onCheckedChange={(v) => setSeedDemo(v === true)} />
                  {t("reports.seedDemo")}
                </label>
                <Button onClick={createOrganization} disabled={creating || !newOrgName.trim()} className="w-full">
                  {creating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("common.loading")}</>) : t("reports.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Org Selector */}
        {organizations.length > 0 ? (
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder={t("reports.selectOrgPh")} />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : !loading ? (
          <Card className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("reports.noOrgs")}</h3>
            <p className="text-muted-foreground mb-4">{t("reports.noOrgsDesc")}</p>
          </Card>
        ) : null}

        {selectedOrg && (
          <>
            {/* Summary Stats */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">{t("reports.campaigns")}</p>
                <p className="text-3xl font-bold mt-1">{campaigns.length}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">{t("reports.evaluated")}</p>
                <p className="text-3xl font-bold mt-1">{totalTargets}</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{t("reports.clickRate")}</p>
                  {avgClickRate > 30 ? <TrendingUp className="h-4 w-4 text-destructive" /> : <TrendingDown className="h-4 w-4 text-success" />}
                </div>
                <p className="text-3xl font-bold mt-1">{avgClickRate.toFixed(1)}%</p>
                <Progress value={avgClickRate} className="mt-2 h-2" />
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{t("reports.reportRate")}</p>
                  {avgReportRate > 50 ? <ShieldCheck className="h-4 w-4 text-success" /> : <ShieldAlert className="h-4 w-4 text-warning" />}
                </div>
                <p className="text-3xl font-bold mt-1">{avgReportRate.toFixed(1)}%</p>
                <Progress value={avgReportRate} className="mt-2 h-2" />
              </Card>
            </div>

            {/* Campaign Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("reports.detail")}</CardTitle>
                <CardDescription>{t("reports.detailDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{t("reports.noLinked")}</p>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((c) => {
                      const r = getResult(c);
                      return (
                        <div key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.started_at ? new Date(c.started_at).toLocaleDateString() : t("reports.notStarted")}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">{t("reports.sent")}</p>
                              <p className="font-semibold">{r?.emails_sent ?? "-"}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">{t("reports.clicks")}</p>
                              <p className="font-semibold text-destructive">{r?.emails_clicked ?? "-"}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">{t("reports.reported")}</p>
                              <p className="font-semibold text-success">{r?.emails_reported ?? "-"}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground text-xs">{t("reports.clickRateCol")}</p>
                              <p className="font-semibold">{r?.click_rate != null ? `${Number(r.click_rate).toFixed(1)}%` : "-"}</p>
                            </div>
                            <Badge variant={c.status === "completed" ? "default" : "secondary"}>{t(`campaigns.status.${c.status}`, c.status)}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mitigation Plan */}
            {completedCampaigns.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{t("reports.plan")}</CardTitle>
                  </div>
                  <CardDescription>{t("reports.planDesc", { click: avgClickRate.toFixed(1), report: avgReportRate.toFixed(1) })}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mitigationPlan.map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-lg border">
                        <Badge className={`${levelColors[item.level]} h-fit`}>{item.level.toUpperCase()}</Badge>
                        <div>
                          <p className="font-semibold">{item.priority}. {item.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
