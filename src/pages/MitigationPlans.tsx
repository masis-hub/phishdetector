import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, LayoutList, GanttChartSquare, ClipboardCheck, GraduationCap, Shield, Repeat, FileDown } from "lucide-react";
import { GanttChart, type GanttPlan } from "@/components/mitigation/GanttChart";
import { PlanCard } from "@/components/mitigation/PlanCard";
import { CreatePlanDialog } from "@/components/mitigation/CreatePlanDialog";
import { TrainingSuggestions } from "@/components/mitigation/TrainingSuggestions";
import { exportMitigationPlansReport } from "@/lib/pdfExport";

interface Organization {
  id: string;
  name: string;
}

const statIcons: Record<string, typeof Shield> = {
  mitigation: Shield,
  training: GraduationCap,
  policy: ClipboardCheck,
  simulation: Repeat,
};

export default function MitigationPlans() {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [plans, setPlans] = useState<GanttPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("gantt");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) fetchPlans();
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    try {
      const { data } = await supabase.from("organizations").select("id, name").order("name");
      if (data) {
        setOrganizations(data);
        if (data.length > 0 && !selectedOrg) setSelectedOrg(data[0].id);
      }
    } catch (e) {
      console.error("[MitigationPlans] fetchOrganizations error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("mitigation_plans")
      .select("*")
      .eq("organization_id", selectedOrg)
      .order("priority", { ascending: true })
      .order("start_date", { ascending: true });

    if (error) {
      toast({ title: t("common.error"), description: t("plans.loadError"), variant: "destructive" });
    } else {
      setPlans((data as any[]) || []);
    }
  }, [selectedOrg, toast]);

  // Stats
  const categoryStats = ["mitigation", "training", "policy", "simulation"].map((cat) => {
    const catPlans = plans.filter((p) => p.category === cat);
    const completed = catPlans.filter((p) => p.status === "completed").length;
    return { category: cat, total: catPlans.length, completed };
  });

  const totalPlans = plans.length;
  const completedPlans = plans.filter((p) => p.status === "completed").length;
  const inProgressPlans = plans.filter((p) => p.status === "in_progress").length;
  const avgProgress = totalPlans > 0 ? Math.round(plans.reduce((s, p) => s + p.completion_percentage, 0) / totalPlans) : 0;

  const filteredPlans = categoryFilter
    ? plans.filter((p) => p.category === categoryFilter)
    : plans;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("plans.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("plans.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {organizations.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder={t("plans.organization")} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedOrg && (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={plans.length === 0}
                  onClick={() => {
                    const org = organizations.find((o) => o.id === selectedOrg);
                    exportMitigationPlansReport(org?.name || "Organización", plans);
                  }}
                >
                  <FileDown className="h-4 w-4" /> PDF
                </Button>
                <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> {t("plans.newPlan")}
                </Button>
              </>
            )}
          </div>
        </div>

        {!loading && organizations.length === 0 && (
          <Card className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("plans.noOrgs")}</h3>
            <p className="text-muted-foreground">{t("plans.noOrgsDesc")}</p>
          </Card>
        )}

        {selectedOrg && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categoryStats.map(({ category, total, completed }) => {
                const Icon = statIcons[category];
                const isActive = categoryFilter === category;
                return (
                  <Card
                    key={category}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setCategoryFilter(isActive ? null : category);
                      setActiveTab("list");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setCategoryFilter(isActive ? null : category);
                        setActiveTab("list");
                      }
                    }}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      isActive ? "ring-2 ring-primary border-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{total}</p>
                        <p className="text-xs text-muted-foreground">{t(`plans.categories.${category}`)} ({t("plans.ready", { count: completed })})</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Overall progress bar */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t("plans.overall")}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{t("plans.completed", { count: completedPlans })}</span>
                  <span>{t("plans.inProgress", { count: inProgressPlans })}</span>
                  <Badge variant="outline" className="text-xs">{avgProgress}%</Badge>
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
            </Card>

            {/* Tabs: Gantt vs List */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="gantt" className="gap-2">
                  <GanttChartSquare className="h-4 w-4" /> {t("plans.tabs.gantt")}
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <LayoutList className="h-4 w-4" /> {t("plans.tabs.list")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gantt">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("plans.ganttTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      <GanttChart plans={filteredPlans} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="list">
                {categoryFilter && (
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-sm text-muted-foreground">
                      {t("plans.categories." + categoryFilter)} · {filteredPlans.length}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => setCategoryFilter(null)}>
                      {t("common.clear", "Limpiar filtro")}
                    </Button>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPlans.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      {t("plans.emptyList")}
                    </div>
                  ) : (
                    filteredPlans.map((plan) => (
                      <PlanCard key={plan.id} plan={plan as any} onUpdated={fetchPlans} />
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <TrainingSuggestions organizationId={selectedOrg} />
          </>
        )}
      </div>

      {selectedOrg && (
        <CreatePlanDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          organizationId={selectedOrg}
          onCreated={fetchPlans}
        />
      )}
    </DashboardLayout>
  );
}
