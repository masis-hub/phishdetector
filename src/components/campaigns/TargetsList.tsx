import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { CheckCircle, Clock, MousePointerClick, AlertTriangle, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, MailOpen, Send } from "lucide-react";
import excelLogo from "@/assets/excel-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Target {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  reported_at: string | null;
}

interface TargetsListProps {
  targets: Target[];
  loading: boolean;
  campaignId?: string;
  onResent?: () => void;
}

type SortKey = "full_name" | "email" | "department" | "sent_at" | "opened_at" | "clicked_at" | "reported_at";
type SortDir = "asc" | "desc";

function exportToCSV(targets: Target[], headers: string[], statusLabels: { sent: string; pending: string }, fileName: string) {
  const rows = targets.map((t) => [
    t.full_name || "",
    t.email,
    t.department || "",
    t.sent_at ? statusLabels.sent : statusLabels.pending,
    t.opened_at ? format(new Date(t.opened_at), "dd/MM/yyyy HH:mm") : "",
    t.clicked_at ? format(new Date(t.clicked_at), "dd/MM/yyyy HH:mm") : "",
    t.reported_at ? format(new Date(t.reported_at), "dd/MM/yyyy HH:mm") : "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const ITEMS_PER_PAGE = 10;

export function TargetsList({ targets, loading, campaignId, onResent }: TargetsListProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("en") ? enUS : es;
  const tErr = (code: string, fallback?: string) =>
    t(`errors.${code}`, { defaultValue: fallback || code });
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [sendingTargetId, setSendingTargetId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleResendToTarget = async (targetId: string) => {
    if (!campaignId) return;
    setSendingTargetId(targetId);
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
        body: JSON.stringify({ campaign_id: campaignId, target_id: targetId, locale: i18n.language?.startsWith("en") ? "en" : "es" }),
      });
      const result = await res.json();
      if (res.ok) {
        toast({
          title: t("campaigns.targets.toast.sentTitle"),
          description: result.sent > 0
            ? t("campaigns.targets.toast.sentOk")
            : t("campaigns.targets.toast.sentNone"),
        });
        onResent?.();
      } else {
        const details = Array.isArray(result.errors) && result.errors.length > 0
          ? result.errors[0]
          : result.error || "UNEXPECTED";
        toast({ title: t("campaigns.targets.toast.errorTitle"), description: tErr(details, details), variant: "destructive" });
      }
    } catch {
      toast({ title: t("campaigns.targets.toast.errorTitle"), description: t("campaigns.targets.toast.errorDesc"), variant: "destructive" });
    } finally {
      setSendingTargetId(null);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const filtered = useMemo(() => {
    let result = targets;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.email.toLowerCase().includes(q) ||
          (t.full_name && t.full_name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [targets, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useMemo(() => setCurrentPage(1), [search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("campaigns.targets.empty")}
      </div>
    );
  }

  const StatusBadge = ({ target }: { target: Target }) => target.sent_at ? (
    <Badge variant="default" className="gap-1 text-[10px] rounded-md">
      <CheckCircle className="h-3 w-3" /> {t("campaigns.targets.badge.sent")}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-[10px] rounded-md">
      <Clock className="h-3 w-3" /> {t("campaigns.targets.badge.pending")}
    </Badge>
  );

  const OpenedBadge = ({ target }: { target: Target }) => target.opened_at ? (
    <Badge className="gap-1 text-[10px] rounded-md bg-primary/15 text-primary border border-primary/30" variant="outline">
      <MailOpen className="h-3 w-3" />
      {format(new Date(target.opened_at), "d MMM, HH:mm", { locale: dateLocale })}
    </Badge>
  ) : <span className="text-muted-foreground text-xs">—</span>;

  const ClickedBadge = ({ target }: { target: Target }) => target.clicked_at ? (
    <Badge variant="destructive" className="gap-1 text-[10px] rounded-md">
      <MousePointerClick className="h-3 w-3" />
      {format(new Date(target.clicked_at), "d MMM, HH:mm", { locale: dateLocale })}
    </Badge>
  ) : <span className="text-muted-foreground text-xs">—</span>;

  const ReportedBadge = ({ target }: { target: Target }) => target.reported_at ? (
    <Badge className="gap-1 text-[10px] rounded-md bg-success text-success-foreground">
      <AlertTriangle className="h-3 w-3" />
      {format(new Date(target.reported_at), "d MMM, HH:mm", { locale: dateLocale })}
    </Badge>
  ) : <span className="text-muted-foreground text-xs">—</span>;

  const ResendButton = ({ target }: { target: Target }) => campaignId ? (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs h-8 px-2.5 text-primary hover:text-primary hover:bg-primary/10"
      disabled={sendingTargetId === target.id}
      onClick={() => handleResendToTarget(target.id)}
    >
      <Send className="h-3.5 w-3.5" />
      {sendingTargetId === target.id ? "..." : t("campaigns.targets.send")}
    </Button>
  ) : null;

  return (
    <div className="space-y-4">
      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("campaigns.targets.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl shrink-0"
          onClick={() => exportToCSV(
            targets,
            [
              t("campaigns.targets.csvHeaders.name"),
              t("campaigns.targets.csvHeaders.email"),
              t("campaigns.targets.csvHeaders.department"),
              t("campaigns.targets.csvHeaders.status"),
              t("campaigns.targets.csvHeaders.opened"),
              t("campaigns.targets.csvHeaders.click"),
              t("campaigns.targets.csvHeaders.reported"),
            ],
            { sent: t("campaigns.targets.badge.sent"), pending: t("campaigns.targets.badge.pending") },
            t("campaigns.targets.csvFile"),
          )}
        >
          <img src={excelLogo} alt="Excel" className="h-5 w-5" />
          {t("campaigns.targets.exportCsv")}
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {t("campaigns.targets.showing", { shown: paginated.length, total: sorted.length })}
        {search && t("campaigns.targets.filteredFrom", { total: targets.length })}
      </p>

      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden lg:block rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold text-xs cursor-pointer select-none" onClick={() => handleSort("full_name")}>
                <span className="flex items-center gap-1">{t("campaigns.targets.col.name")} <SortIcon col="full_name" /></span>
              </TableHead>
              <TableHead className="font-semibold text-xs cursor-pointer select-none" onClick={() => handleSort("email")}>
                <span className="flex items-center gap-1">{t("campaigns.targets.col.email")} <SortIcon col="email" /></span>
              </TableHead>
              <TableHead className="font-semibold text-xs cursor-pointer select-none" onClick={() => handleSort("department")}>
                <span className="flex items-center gap-1">{t("campaigns.targets.col.dept")} <SortIcon col="department" /></span>
              </TableHead>
              <TableHead className="font-semibold text-xs cursor-pointer select-none" onClick={() => handleSort("sent_at")}>
                <span className="flex items-center gap-1">{t("campaigns.targets.col.status")} <SortIcon col="sent_at" /></span>
              </TableHead>
              <TableHead className="font-semibold text-xs cursor-pointer select-none" onClick={() => handleSort("opened_at")}>
                <span className="flex items-center gap-1">{t("campaigns.targets.col.opened")} <SortIcon col="opened_at" /></span>
              </TableHead>
              <TableHead className="font-semibold text-xs cursor-pointer select-none" onClick={() => handleSort("clicked_at")}>
                <span className="flex items-center gap-1">{t("campaigns.targets.col.click")} <SortIcon col="clicked_at" /></span>
              </TableHead>
              <TableHead className="font-semibold text-xs cursor-pointer select-none" onClick={() => handleSort("reported_at")}>
                <span className="flex items-center gap-1">{t("campaigns.targets.col.reported")} <SortIcon col="reported_at" /></span>
              </TableHead>
              {campaignId && (
                <TableHead className="font-semibold text-xs text-right">{t("campaigns.targets.col.actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((target) => (
              <TableRow key={target.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-medium text-sm">{target.full_name || "—"}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{target.email}</TableCell>
                <TableCell className="text-sm">{target.department || "—"}</TableCell>
                <TableCell><StatusBadge target={target} /></TableCell>
                <TableCell><OpenedBadge target={target} /></TableCell>
                <TableCell><ClickedBadge target={target} /></TableCell>
                <TableCell><ReportedBadge target={target} /></TableCell>
                {campaignId && (
                  <TableCell className="text-right"><ResendButton target={target} /></TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout (visible on mobile/tablet) */}
      <div className="lg:hidden space-y-3">
        {paginated.map((target) => (
          <div
            key={target.id}
            className="rounded-xl border border-border/50 bg-card p-4 space-y-3"
          >
            {/* Header: Name + Status + Action */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{target.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{target.email}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge target={target} />
                <ResendButton target={target} />
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">{t("campaigns.targets.col.department")}</span>
                <p className="font-medium mt-0.5">{target.department || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("campaigns.targets.col.opened")}</span>
                <div className="mt-0.5"><OpenedBadge target={target} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">{t("campaigns.targets.col.click")}</span>
                <div className="mt-0.5"><ClickedBadge target={target} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">{t("campaigns.targets.col.reported")}</span>
                <div className="mt-0.5"><ReportedBadge target={target} /></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {t("campaigns.targets.page", { current: currentPage, total: totalPages })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 rounded-lg text-xs"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
