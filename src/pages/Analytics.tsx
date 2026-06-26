import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, TrendingUp, AlertCircle, Shield, Users, MousePointerClick, Mail, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface DepartmentRisk {
  department: string;
  total: number;
  clicked: number;
  clickRate: number;
}

interface CampaignOption {
  id: string;
  name: string;
}

interface TemplateOption {
  id: string;
  name: string;
}

export default function Analytics() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    overallClickRate: 0,
    overallReportRate: 0,
    totalCampaigns: 0,
    totalTargets: 0,
    totalSent: 0,
    totalClicked: 0,
    totalReported: 0,
  });
  const [departmentRisks, setDepartmentRisks] = useState<DepartmentRisk[]>([]);
  const [highRiskUsers, setHighRiskUsers] = useState<{ email: string; clicks: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [campaignTrend, setCampaignTrend] = useState<{ name: string; clickRate: number; reportRate: number }[]>([]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCampaign, selectedTemplate]);

  const fetchFilters = async () => {
    const [{ data: campaignsData }, { data: templatesData }] = await Promise.all([
      supabase.from("campaigns").select("id, name").order("created_at", { ascending: false }),
      supabase.from("phishing_templates").select("id, name").order("name"),
    ]);
    if (campaignsData) setCampaigns(campaignsData);
    if (templatesData) setTemplates(templatesData);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
    // Build campaign query with filters
    let campaignQuery = supabase.from("campaigns").select("id, name, template_id");
    if (selectedTemplate !== "all") {
      campaignQuery = campaignQuery.eq("template_id", selectedTemplate);
    }
    if (selectedCampaign !== "all") {
      campaignQuery = campaignQuery.eq("id", selectedCampaign);
    }
    const { data: filteredCampaigns } = await campaignQuery;
    const campaignIds = filteredCampaigns?.map(c => c.id) || [];

    if (campaignIds.length === 0) {
      setStats({ overallClickRate: 0, overallReportRate: 0, totalCampaigns: 0, totalTargets: 0, totalSent: 0, totalClicked: 0, totalReported: 0 });
      setDepartmentRisks([]);
      setHighRiskUsers([]);
      setCampaignTrend([]);
      return;
    }

    // Fetch results for filtered campaigns
    const { data: results } = await supabase
      .from("campaign_results")
      .select("*, campaigns(name)")
      .in("campaign_id", campaignIds);

    const totalCampaigns = results?.length || 0;
    const totalTargets = results?.reduce((s, r) => s + (r.total_targets || 0), 0) || 0;
    const totalSent = results?.reduce((s, r) => s + (r.emails_sent || 0), 0) || 0;
    const totalClicked = results?.reduce((s, r) => s + (r.emails_clicked || 0), 0) || 0;
    const totalReported = results?.reduce((s, r) => s + (r.emails_reported || 0), 0) || 0;
    const overallClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const overallReportRate = totalSent > 0 ? (totalReported / totalSent) * 100 : 0;

    setStats({ overallClickRate, overallReportRate, totalCampaigns, totalTargets, totalSent, totalClicked, totalReported });

    // Campaign trend data
    const trend = (results || []).map((r: any) => ({
      name: r.campaigns?.name || t("analytics.campaigns"),
      clickRate: r.click_rate ? Number(r.click_rate) : 0,
      reportRate: r.report_rate ? Number(r.report_rate) : 0,
    }));
    setCampaignTrend(trend);

    // Fetch targets for department analysis
    const { data: targets } = await supabase
      .from("campaign_targets")
      .select("email, department, clicked_at, sent_at")
      .in("campaign_id", campaignIds);

    if (targets) {
      const deptMap: Record<string, { total: number; clicked: number }> = {};
      targets.forEach(t => {
        const dept = t.department || "—";
        if (!deptMap[dept]) deptMap[dept] = { total: 0, clicked: 0 };
        if (t.sent_at) deptMap[dept].total++;
        if (t.clicked_at) deptMap[dept].clicked++;
      });
      const deptRisks = Object.entries(deptMap)
        .map(([department, { total, clicked }]) => ({
          department,
          total,
          clicked,
          clickRate: total > 0 ? (clicked / total) * 100 : 0,
        }))
        .sort((a, b) => b.clickRate - a.clickRate);
      setDepartmentRisks(deptRisks);

      const userClicks: Record<string, number> = {};
      targets.forEach(t => {
        if (t.clicked_at) {
          userClicks[t.email] = (userClicks[t.email] || 0) + 1;
        }
      });
      const hrUsers = Object.entries(userClicks)
        .map(([email, clicks]) => ({ email, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);
      setHighRiskUsers(hrUsers);
    }
    } catch (e) {
      console.error("[Analytics] fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const CHART_COLORS = ["hsl(var(--destructive))", "hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))"];
  const pieData = [
    { name: t("analytics.clicks"), value: stats.totalClicked },
    { name: t("analytics.reported"), value: stats.totalReported },
    { name: t("analytics.noAction"), value: Math.max(0, stats.totalSent - stats.totalClicked - stats.totalReported) },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("analytics.title")}</h1>
          <p className="text-muted-foreground text-sm md:text-base">{t("analytics.subtitle")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("analytics.filterCampaign")}</label>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t("analytics.allCampaigns")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("analytics.allCampaigns")}</SelectItem>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("analytics.filterTemplate")}</label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t("analytics.allTemplates")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("analytics.allTemplates")}</SelectItem>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Card 1 — Click Rate */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0B0F1E] to-[#080C18] p-6 shadow-lg ring-1 ring-white/[0.06] transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-white/[0.12]">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-destructive to-destructive/40" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">{t("analytics.overallClick")}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/20">
              {stats.overallClickRate < 20 ? (
                <TrendingDown className="h-4 w-4 text-success" />
              ) : (
                <TrendingUp className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          <div className="mb-4">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">{stats.overallClickRate.toFixed(1)}%</span>
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {stats.totalClicked}/{stats.totalSent} {t("analytics.clicks")}
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-destructive to-destructive/70 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(stats.overallClickRate, 100)}%` }}
            />
          </div>
        </Card>

        {/* Card 2 — Report Rate */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0B0F1E] to-[#080C18] p-6 shadow-lg ring-1 ring-white/[0.06] transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-white/[0.12]">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-400 to-emerald-400/40" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">{t("analytics.reportRate")}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-400/20">
              {stats.overallReportRate > 50 ? (
                <Shield className="h-4 w-4 text-emerald-400" />
              ) : (
                <Flag className="h-4 w-4 text-warning" />
              )}
            </div>
          </div>
          <div className="mb-4">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">{stats.overallReportRate.toFixed(1)}%</span>
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {stats.totalReported}/{stats.totalSent} {t("analytics.reported")}
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-400/70 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(stats.overallReportRate, 100)}%` }}
            />
          </div>
        </Card>

        {/* Card 3 — High Risk Users */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0B0F1E] to-[#080C18] p-6 shadow-lg ring-1 ring-white/[0.06] transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-white/[0.12]">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-warning to-warning/40" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">{t("analytics.highRiskUsers")}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 ring-1 ring-warning/20">
              <AlertCircle className="h-4 w-4 text-warning" />
            </div>
          </div>
          <div className="mb-4">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">{highRiskUsers.length}</span>
            <span className="ml-2 text-xs font-medium text-muted-foreground">{t("analytics.highRiskUsersHint")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {highRiskUsers.slice(0, 4).map((u, i) => (
                <div
                  key={u.email}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/15 text-[10px] font-bold text-warning ring-2 ring-[#080C18]"
                  title={u.email}
                >
                  {u.email.charAt(0).toUpperCase()}
                </div>
              ))}
              {highRiskUsers.length > 4 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-muted-foreground ring-2 ring-[#080C18]">
                  +{highRiskUsers.length - 4}
                </div>
              )}
            </div>
            {highRiskUsers.length === 0 && <span className="text-xs text-muted-foreground">{t("analytics.noHighRisk")}</span>}
          </div>
        </Card>

        {/* Card 4 — Campaigns */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0B0F1E] to-[#080C18] p-6 shadow-lg ring-1 ring-white/[0.06] transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-white/[0.12]">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/40" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">{t("analytics.completedCampaigns")}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Mail className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mb-4">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">{stats.totalCampaigns}</span>
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {t("analytics.totalEmailsSent", { count: stats.totalSent })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
                style={{ width: `${stats.totalSent > 0 ? (stats.totalClicked / stats.totalSent) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              {stats.totalSent > 0 ? ((stats.totalClicked / stats.totalSent) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Campaign Trend Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">{t("analytics.trendByCampaign")}</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignTrend.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("analytics.noCampaignData")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={campaignTrend} margin={{ top: 8, right: 16, left: 0, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    angle={-35}
                    textAnchor="end"
                    height={90}
                    interval={0}
                    tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="clickRate" name={t("analytics.clickRate")} fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  <Bar dataKey="reportRate" name={t("analytics.reportRatePct")} fill="hsl(var(--success))" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribution Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">{t("analytics.resultDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.totalSent === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("analytics.noDistData")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <PieChart margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="hsl(var(--card))"
                    strokeWidth={3}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [`${value} (${stats.totalSent ? ((value / stats.totalSent) * 100).toFixed(1) : 0}%)`, name]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Department Risk Analysis with chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("analytics.deptRisk")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departmentRisks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t("analytics.noDeptData")}</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={departmentRisks} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <YAxis type="category" dataKey="department" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="clickRate" name={t("analytics.clickRate")} fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-3 mt-4">
                  {departmentRisks.map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{dept.department}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{dept.clicked}/{dept.total} clicks</span>
                        <Badge variant={dept.clickRate > 30 ? "destructive" : dept.clickRate > 10 ? "secondary" : "default"}>
                          {dept.clickRate.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* High Risk Users */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MousePointerClick className="h-5 w-5" />
              {t("analytics.highRiskUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {highRiskUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t("analytics.noHighRisk")}</p>
            ) : (
              <div className="space-y-3">
                {highRiskUsers.map((user, i) => (
                  <div key={user.email} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium">{user.email}</span>
                    </div>
                    <Badge variant="destructive">{user.clicks} click{user.clicks > 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overall Summary */}
      <Card className="p-6 shadow-card">
        <h3 className="text-lg font-semibold mb-4">{t("analytics.summary")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.totalCampaigns}</p>
            <p className="text-sm text-muted-foreground">{t("analytics.campaigns")}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.totalTargets}</p>
            <p className="text-sm text-muted-foreground">{t("analytics.targets")}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.totalSent}</p>
            <p className="text-sm text-muted-foreground">{t("analytics.emailsSent")}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-destructive">{stats.totalClicked}</p>
            <p className="text-sm text-muted-foreground">{t("analytics.clicks")}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-success">{stats.totalReported}</p>
            <p className="text-sm text-muted-foreground">{t("analytics.reported")}</p>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
