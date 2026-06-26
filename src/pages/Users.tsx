import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Upload, UserPlus, Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddContactDialog } from "@/components/users/AddContactDialog";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

export default function Users() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.full_name?.toLowerCase().includes(q) ?? false) ||
      c.email.toLowerCase().includes(q) ||
      (c.department?.toLowerCase().includes(q) ?? false)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("common.deleted"), description: t("usersPage.deleted") });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("usersPage.title")}</h1>
          <p className="text-muted-foreground text-sm md:text-base">{t("usersPage.subtitle")}</p>
        </div>
        <Button className="gap-2 gradient-primary shrink-0" onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-5 w-5" />
          {t("usersPage.addUsers")}
        </Button>
      </div>

      <Card className="shadow-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("usersPage.search")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("usersPage.showing", { shown: paginated.length, total: filtered.length })}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("usersPage.user")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("usersPage.email")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("usersPage.department")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("usersPage.riskLevel")}</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("usersPage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("usersPage.loading")}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("usersPage.empty")}</td></tr>
              ) : (
                paginated.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <UsersIcon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{user.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="p-4">{user.department || "—"}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          user.risk_level === "high"
                            ? "destructive"
                            : user.risk_level === "medium"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {t(`usersPage.risk.${user.risk_level}`, user.risk_level)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">{t("usersPage.page", { current: page, total: totalPages })}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <Button key={p} variant={page === p ? "default" : "outline"} size="icon" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AddContactDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["contacts"] })} />
    </DashboardLayout>
  );
}
