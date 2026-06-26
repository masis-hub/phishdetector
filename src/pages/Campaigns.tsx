import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Mail, Calendar, Users as UsersIcon, Search, Filter, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-green-500/15 text-green-600 border-green-500/30",
  scheduled: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

const ITEMS_PER_PAGE = 5;

export default function Campaigns() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("en") ? enUS : es;
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_results (
            total_targets,
            emails_sent,
            click_rate,
            report_rate
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCampaigns(data);
      }
    } catch (e) {
      console.error("[Campaigns] fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = campaigns;
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [campaigns, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length };
    campaigns.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [campaigns]);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("campaigns.title")}</h1>
          <p className="text-muted-foreground text-sm md:text-base">{t("campaigns.subtitle")}</p>
        </div>
        <Button
          className="gap-2 gradient-primary shrink-0"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
          {t("campaigns.new")}
        </Button>
      </div>

      {/* Filters bar */}
      <Card className="p-4 mb-6 rounded-2xl shadow-card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("campaigns.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 rounded-xl"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: t("campaigns.filters.all") },
              { key: "active", label: t("campaigns.filters.active") },
              { key: "draft", label: t("campaigns.filters.draft") },
              { key: "scheduled", label: t("campaigns.filters.scheduled") },
              { key: "completed", label: t("campaigns.filters.completed") },
            ].map((s) => (
              <Button
                key={s.key}
                variant={statusFilter === s.key ? "default" : "outline"}
                size="sm"
                className={`rounded-xl gap-1.5 ${statusFilter === s.key ? "" : "bg-muted/50 border-0"}`}
                onClick={() => setStatusFilter(s.key)}
              >
                {s.label}
                {statusCounts[s.key] != null && (
                  <span className={`text-xs ${statusFilter === s.key ? "opacity-80" : "text-muted-foreground"}`}>
                    {statusCounts[s.key] || 0}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {campaigns.length === 0
              ? t("campaigns.empty.noneTitle")
              : t("campaigns.empty.notFoundTitle")}
          </h3>
          <p className="text-muted-foreground mb-4">
            {campaigns.length === 0
              ? t("campaigns.empty.noneDesc")
              : t("campaigns.empty.notFoundDesc")}
          </p>
          {campaigns.length === 0 && (
            <Button
              className="gradient-primary"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              {t("campaigns.new")}
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((campaign) => {
              const results = campaign.campaign_results?.[0];
              return (
                <Card
                  key={campaign.id}
                  className="group p-5 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer hover:-translate-y-0.5 border border-border/50 hover:border-primary/30 relative overflow-hidden"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  {/* Subtle gradient accent */}
                  <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-4 items-center flex-1 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="text-base font-semibold truncate">
                            {campaign.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-lg border ${statusColors[campaign.status] || ""}`}
                          >
                            {t(`campaigns.status.${campaign.status}`, { defaultValue: campaign.status })}
                          </Badge>
                        </div>

                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {campaign.scheduled_at
                              ? format(
                                  new Date(campaign.scheduled_at),
                                  "d MMM yyyy",
                                  { locale: dateLocale }
                                )
                              : format(
                                  new Date(campaign.created_at),
                                  "d MMM yyyy",
                                  { locale: dateLocale }
                                )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UsersIcon className="h-3.5 w-3.5" />
                            {t("campaigns.card.targets", { count: results?.total_targets || 0 })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {results && campaign.status !== "draft" && (
                      <div className="flex gap-5 shrink-0">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-destructive font-bold text-lg">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {results.click_rate
                              ? Math.round(results.click_rate)
                              : 0}
                            %
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            {t("campaigns.card.click")}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-green-600 font-bold text-lg">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {results.report_rate
                              ? Math.round(results.report_rate)
                              : 0}
                            %
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            {t("campaigns.card.report")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                {t("campaigns.pagination.showing", {
                  from: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  to: Math.min(currentPage * ITEMS_PER_PAGE, filtered.length),
                  total: filtered.length,
                })}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      className={`h-9 w-9 rounded-xl text-sm ${currentPage === page ? "" : "bg-muted/50 border-0"}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchCampaigns}
      />
    </DashboardLayout>
  );
}
