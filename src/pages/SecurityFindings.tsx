import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Upload, RefreshCw, CheckCircle2, EyeOff, AlertCircle, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";

type Finding = {
  id: string;
  scanner: string;
  internal_id: string;
  name: string;
  description: string | null;
  severity: string;
  status: string;
  link: string | null;
  scanned_at: string;
  resolved_at: string | null;
  notes: string | null;
};

const SEVERITY_ORDER = ["critical", "high", "warn", "low", "info"] as const;
const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  warn: "bg-warning/15 text-warning border-warning/30",
  low: "bg-primary/10 text-primary border-primary/20",
  info: "bg-muted text-muted-foreground border-border",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-destructive/15 text-destructive border-destructive/30",
  fixed: "bg-success/15 text-success border-success/30",
  ignored: "bg-muted text-muted-foreground border-border",
};
export default function SecurityFindings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);
  const [scannerFilter, setScannerFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("security_findings")
      .select("*")
      .order("scanned_at", { ascending: false });
    if (error) {
      console.error("security_findings load error", error);
    } else {
      setFindings((data ?? []) as Finding[]);
    }
    setLoading(false);
  };

  const scanners = useMemo(
    () => Array.from(new Set(findings.map((f) => f.scanner))).sort(),
    [findings]
  );

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (scannerFilter !== "all" && f.scanner !== scannerFilter) return false;
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !f.name.toLowerCase().includes(q) &&
          !(f.description ?? "").toLowerCase().includes(q) &&
          !f.internal_id.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [findings, scannerFilter, severityFilter, statusFilter, search]);

  const metrics = useMemo(() => {
    const bySeverity: Record<string, number> = {};
    const byScanner: Record<string, { open: number; fixed: number; ignored: number }> = {};
    let open = 0, fixed = 0, ignored = 0;
    for (const f of findings) {
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
      byScanner[f.scanner] ??= { open: 0, fixed: 0, ignored: 0 };
      (byScanner[f.scanner] as any)[f.status] = ((byScanner[f.scanner] as any)[f.status] ?? 0) + 1;
      if (f.status === "open") open++;
      else if (f.status === "fixed") fixed++;
      else if (f.status === "ignored") ignored++;
    }
    const severityData = SEVERITY_ORDER.map((s) => ({ severity: s, count: bySeverity[s] ?? 0 }));
    const scannerData = Object.entries(byScanner).map(([scanner, v]) => ({ scanner, ...v }));
    return { open, fixed, ignored, severityData, scannerData };
  }, [findings]);

  const trendData = useMemo(() => {
    const byDate: Record<string, { date: string; open: number; fixed: number; ignored: number }> = {};
    for (const f of findings) {
      const date = f.scanned_at.slice(0, 10);
      byDate[date] ??= { date, open: 0, fixed: 0, ignored: 0 };
      (byDate[date] as any)[f.status]++;
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [findings]);

  const handleImport = async () => {
    setImporting(true);
    try {
      const parsed = JSON.parse(jsonText);
      const rows: any[] = [];
      const scannedAt = new Date().toISOString();
      // Support either { scanner_name: { findings: [...] }, ... } or array of findings
      const ingest = (scanner: string, items: any[], ts?: string) => {
        for (const f of items ?? []) {
          const sevRaw = (f.level ?? f.severity ?? "warn").toString().toLowerCase();
          rows.push({
            scanner,
            internal_id: f.internal_id ?? f.id ?? crypto.randomUUID(),
            name: f.name ?? f.title ?? t("securityPage.noName"),
            description: f.description ?? null,
            severity: ["critical", "high", "warn", "low", "info"].includes(sevRaw) ? sevRaw : "warn",
            status: f.status ?? "open",
            link: f.link ?? null,
            scanned_at: f.created_at ?? ts ?? scannedAt,
            metadata: f.metadata ?? null,
          });
        }
      };
      if (Array.isArray(parsed)) {
        ingest("manual", parsed);
      } else if (parsed && typeof parsed === "object") {
        for (const [key, val] of Object.entries<any>(parsed)) {
          if (val?.findings && Array.isArray(val.findings)) {
            ingest(val.scanner_name ?? key, val.findings, val.timestamp);
          }
        }
      }
      if (!rows.length) throw new Error(t("securityPage.noFindings"));
      const { error } = await supabase
        .from("security_findings")
        .upsert(rows, { onConflict: "scanner,internal_id" });
      if (error) throw error;
      toast({ title: t("securityPage.importedTitle"), description: t("securityPage.imported", { count: rows.length }) });
      setImportOpen(false);
      setJsonText("");
      await load();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message ?? t("securityPage.invalidJson"), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("security_findings")
      .update({ status, resolved_at: status === "open" ? null : new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      await load();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{t("securityPage.eyebrow")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{t("securityPage.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("securityPage.subtitle")}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="rounded-xl flex-1 sm:flex-none gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {t("securityPage.reload")}
          </Button>
          <Button className="gap-2 gradient-primary border-0 rounded-xl shadow-lg shadow-primary/20 flex-1 sm:flex-none" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            {t("securityPage.importJson")}
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
        <KpiCard label={t("securityPage.kpi.total")} value={findings.length} icon={ShieldAlert} tone="primary" />
        <KpiCard label={t("securityPage.kpi.open")} value={metrics.open} icon={AlertCircle} tone="destructive" />
        <KpiCard label={t("securityPage.kpi.fixed")} value={metrics.fixed} icon={CheckCircle2} tone="success" />
        <KpiCard label={t("securityPage.kpi.ignored")} value={metrics.ignored} icon={EyeOff} tone="muted" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="p-6 rounded-2xl">
          <h3 className="text-sm font-bold mb-4">{t("securityPage.severityDist")}</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.severityData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="severity" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 rounded-2xl">
          <h3 className="text-sm font-bold mb-4">{t("securityPage.trend")}</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="open" stroke="hsl(var(--destructive))" strokeWidth={2} />
                <Line type="monotone" dataKey="fixed" stroke="hsl(var(--success))" strokeWidth={2} />
                <Line type="monotone" dataKey="ignored" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 rounded-2xl mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder={t("securityPage.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl"
          />
          <Select value={scannerFilter} onValueChange={setScannerFilter}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("securityPage.connector")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("securityPage.allConnectors")}</SelectItem>
              {scanners.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("securityPage.severity")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("securityPage.allSev")}</SelectItem>
              {SEVERITY_ORDER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("securityPage.status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("securityPage.allStatus")}</SelectItem>
              <SelectItem value="open">{t("securityPage.statusLabels.open")}</SelectItem>
              <SelectItem value="fixed">{t("securityPage.statusLabels.fixed")}</SelectItem>
              <SelectItem value="ignored">{t("securityPage.statusLabels.ignored")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("securityPage.col.finding")}</TableHead>
              <TableHead>{t("securityPage.col.connector")}</TableHead>
              <TableHead>{t("securityPage.col.severity")}</TableHead>
              <TableHead>{t("securityPage.col.status")}</TableHead>
              <TableHead>{t("securityPage.col.lastScan")}</TableHead>
              <TableHead className="text-right">{t("securityPage.col.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  {loading ? t("securityPage.loadingRow") : t("securityPage.emptyRow")}
                </TableCell>
              </TableRow>
            ) : filtered.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="max-w-[420px]">
                  <div className="font-semibold text-sm">{f.name}</div>
                  {f.description && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{f.description}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{f.internal_id}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">{f.scanner}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px] uppercase", SEVERITY_COLOR[f.severity])}>
                    {f.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_COLOR[f.status])}>
                    {t(`securityPage.statusLabels.${f.status}`, f.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(f.scanned_at), "dd MMM yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {f.link && (
                      <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0" asChild>
                        <a href={f.link} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </Button>
                    )}
                    <Select value={f.status} onValueChange={(v) => updateStatus(f.id, v)}>
                      <SelectTrigger className="rounded-lg h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t("securityPage.statusLabels.open")}</SelectItem>
                        <SelectItem value="fixed">{t("securityPage.statusLabels.fixed")}</SelectItem>
                        <SelectItem value="ignored">{t("securityPage.statusLabels.ignored")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("securityPage.importTitle")}</DialogTitle>
            <DialogDescription>{t("securityPage.importDesc", { format: "{ scanner_name: { findings: [...] } }" })}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"wiz": {"scanner_name": "wiz", "findings": [...] }}'
            className="min-h-[280px] font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleImport} disabled={!jsonText || importing}>
              {importing ? t("securityPage.importing") : t("securityPage.import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "primary" | "destructive" | "success" | "muted" }) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}