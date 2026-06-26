import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { ComplianceChecklist } from "@/components/dashboard/ComplianceChecklist";
import { Target, TrendingDown, AlertCircle, Users, Plus, Sparkles, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { exportDashboardReport } from "@/lib/pdfExport";

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    avgClickRate: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*")
      .in("status", ["active", "scheduled"]);

    const { data: results } = await supabase
      .from("campaign_results")
      .select("click_rate");

    const avgClickRate = results && results.length > 0
      ? results.reduce((sum, r) => sum + (Number(r.click_rate) || 0), 0) / results.length
      : 0;

    const { data: targets } = await supabase
      .from("campaign_targets")
      .select("email");

    const uniqueEmails = new Set(targets?.map(t => t.email) || []);

    setStats({
      activeCampaigns: campaigns?.length || 0,
      avgClickRate: Math.round(avgClickRate),
      totalUsers: uniqueEmails.size,
    });
  };

  const handleExportPdf = async () => {
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("name, status, created_at, started_at")
      .order("created_at", { ascending: false })
      .limit(15);
    exportDashboardReport({ stats, campaigns: campaigns || [] });
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{t("dashboard.eyebrow")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button
            className="gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => navigate("/campaigns")}
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.newCampaign")}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-10">
        <StatCard
          title={t("dashboard.stats.activeCampaigns")}
          value={stats.activeCampaigns}
          change={stats.activeCampaigns > 0 ? t("dashboard.stats.inProgress") : t("dashboard.stats.noActive")}
          changeType={stats.activeCampaigns > 0 ? "positive" : "neutral"}
          icon={Target}
          onClick={() => navigate("/campaigns")}
        />
        <StatCard
          title={t("dashboard.stats.avgClickRate")}
          value={`${stats.avgClickRate}%`}
          change={stats.avgClickRate < 20 ? t("dashboard.stats.excellent") : stats.avgClickRate < 30 ? t("dashboard.stats.good") : t("dashboard.stats.needsImprovement")}
          changeType={stats.avgClickRate < 20 ? "positive" : stats.avgClickRate < 30 ? "neutral" : "negative"}
          icon={TrendingDown}
          onClick={() => navigate("/analytics")}
        />
        <StatCard
          title={t("dashboard.stats.totalTargets")}
          value={stats.totalUsers}
          change={stats.totalUsers > 0 ? t("dashboard.stats.uniqueEmails") : t("dashboard.stats.noDataYet")}
          changeType="neutral"
          icon={Users}
          onClick={() => navigate("/users")}
        />
        <StatCard
          title={t("dashboard.stats.systemStatus")}
          value={t("dashboard.stats.active")}
          change={t("dashboard.stats.allOperational")}
          changeType="positive"
          icon={AlertCircle}
          onClick={() => navigate("/settings")}
        />
      </div>

      {/* Widgets */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentCampaigns />
        </div>
        <div>
          <ComplianceChecklist />
        </div>
      </div>
    </DashboardLayout>
  );
}
