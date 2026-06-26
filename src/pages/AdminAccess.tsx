import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Building2, ShieldCheck, UserPlus, Trash2, Users as UsersIcon, Crown, AlertTriangle } from "lucide-react";

type AppRole = "admin" | "manager" | "viewer";
type Org = { id: string; name: string };
type Profile = { id: string; email: string; full_name: string | null };
type RoleRow = { id: string; user_id: string; role: AppRole; organization_id: string | null; created_at: string };

const GLOBAL_KEY = "__global__";

const roleBadge: Record<AppRole, string> = {
  admin: "bg-primary/15 text-primary border-primary/30",
  manager: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

export default function AdminAccess() {
  const { t, i18n } = useTranslation();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [orgFilter, setOrgFilter] = useState<string>(GLOBAL_KEY);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const { data: orgs = [] } = useQuery<Org[]>({
    queryKey: ["admin", "orgs"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery<RoleRow[]>({
    queryKey: ["admin", "roles"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, organization_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["admin", "profiles"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const profileById = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const filteredRoles = useMemo(() => {
    if (orgFilter === GLOBAL_KEY) return roles.filter((r) => r.organization_id === null);
    return roles.filter((r) => r.organization_id === orgFilter);
  }, [roles, orgFilter]);

  const totalUsers = useMemo(() => new Set(roles.map((r) => r.user_id)).size, [roles]);
  const globalAdmins = useMemo(() => roles.filter((r) => r.role === "admin" && r.organization_id === null).length, [roles]);

  const revoke = async (roleId: string) => {
    const { data, error } = await supabase.functions.invoke("admin-revoke-role", { body: { role_id: roleId } });
    if (error || !data?.ok) {
      toast({ title: t("common.error"), description: data?.error ?? t("admin.revokeFail"), variant: "destructive" });
      return;
    }
    toast({ title: t("admin.revokedTitle"), description: t("admin.revokedDesc") });
    qc.invalidateQueries({ queryKey: ["admin", "roles"] });
  };

  if (isAdmin === null) {
    return (
      <DashboardLayout>
        <div className="text-muted-foreground">{t("admin.verifying")}</div>
      </DashboardLayout>
    );
  }
  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            {t("admin.title")}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">{t("admin.subtitle")}</p>
        </div>
        <Button className="gap-2 gradient-primary shrink-0" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-5 w-5" /> {t("admin.invite")}
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={UsersIcon} label={t("admin.stats.users")} value={totalUsers} />
        <StatCard icon={Crown} label={t("admin.stats.globalAdmins")} value={globalAdmins} />
        <StatCard icon={Building2} label={t("admin.stats.orgs")} value={orgs.length} />
      </div>

      {/* Selector */}
      <Card className="shadow-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Label className="text-sm font-semibold shrink-0">{t("admin.showMembers")}</Label>
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL_KEY}>{t("admin.globalLabel")}</SelectItem>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.col.user")}</TableHead>
              <TableHead>{t("admin.col.email")}</TableHead>
              <TableHead>{t("admin.col.role")}</TableHead>
              <TableHead>{t("admin.col.since")}</TableHead>
              <TableHead className="text-right">{t("admin.col.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  {t("admin.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filteredRoles.map((r) => {
                const profile = profileById.get(r.user_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{profile?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{profile?.email ?? r.user_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadge[r.role]}>{t(`admin.roles.${r.role}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleDateString(i18n.language?.startsWith("en") ? "en-US" : "es-ES")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => revoke(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        orgs={orgs}
        defaultOrgId={orgFilter === GLOBAL_KEY ? null : orgFilter}
        onInvited={() => {
          qc.invalidateQueries({ queryKey: ["admin", "roles"] });
          qc.invalidateQueries({ queryKey: ["admin", "profiles"] });
        }}
      />
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof UsersIcon; label: string; value: number }) {
  return (
    <Card className="shadow-card p-5 flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function InviteDialog({
  open, onOpenChange, orgs, defaultOrgId, onInvited,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgs: Org[];
  defaultOrgId: string | null;
  onInvited: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");
  const [orgId, setOrgId] = useState<string>(defaultOrgId ?? (orgs[0]?.id ?? ""));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setFullName("");
      setRole("viewer");
      setOrgId(defaultOrgId ?? (orgs[0]?.id ?? ""));
    }
  }, [open, defaultOrgId, orgs]);

  const requiresOrg = role !== "admin";

  const submit = async () => {
    if (!email.includes("@")) {
      toast({ title: t("admin.inviteDlg.invalidEmail"), variant: "destructive" });
      return;
    }
    if (requiresOrg && !orgId) {
      toast({ title: t("admin.inviteDlg.selectOrg"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: {
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          role,
          organization_id: requiresOrg ? orgId : null,
        },
      });
      if (error || !data?.ok) {
        toast({
          title: t("admin.inviteDlg.inviteFail"),
          description: data?.error || t("admin.inviteDlg.verify"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: data.invited ? t("admin.inviteDlg.invitedTitle") : t("admin.inviteDlg.roleAssignedTitle"),
        description: data.invited ? t("admin.inviteDlg.invitedDesc") : t("admin.inviteDlg.roleAssignedDesc"),
      });
      onInvited();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("admin.inviteDlg.title")}</DialogTitle>
          <DialogDescription>{t("admin.inviteDlg.desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("admin.inviteDlg.email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("admin.inviteDlg.emailPh")} />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.inviteDlg.fullName")}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("admin.inviteDlg.fullNamePh")} />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.inviteDlg.role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">{t("admin.inviteDlg.viewerOpt")}</SelectItem>
                <SelectItem value="manager">{t("admin.inviteDlg.managerOpt")}</SelectItem>
                <SelectItem value="admin">{t("admin.inviteDlg.adminOpt")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {requiresOrg ? (
            <div className="space-y-2">
              <Label>{t("admin.inviteDlg.company")}</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger><SelectValue placeholder={t("admin.inviteDlg.companyPh")} /></SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orgs.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t("admin.inviteDlg.noOrgs")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 bg-primary/5 border border-primary/20 rounded-lg p-3">
              <Crown className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              {t("admin.inviteDlg.adminNote")}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={submitting} className="gradient-primary">
            {submitting ? t("admin.inviteDlg.sending") : t("admin.inviteDlg.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}