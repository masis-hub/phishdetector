import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ChecklistItem {
  id: string;
  status: "complete" | "pending" | "required";
  key: string;
}

const checklistItems: ChecklistItem[] = [
  { id: "1", status: "complete", key: "auth" },
  { id: "2", status: "complete", key: "legal" },
  { id: "3", status: "pending", key: "exclusion" },
  { id: "4", status: "required", key: "data" },
  { id: "5", status: "pending", key: "comms" },
];

export function ComplianceChecklist() {
  const { t } = useTranslation();
  const completedCount = checklistItems.filter((item) => item.status === "complete").length;
  const totalCount = checklistItems.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <Card className="p-6 rounded-2xl shadow-card border-border/50">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold tracking-tight">{t("dashboard.compliance.title")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("dashboard.compliance.subtitle")}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{t("dashboard.compliance.progress")}</span>
          <span className="text-xs font-bold text-primary">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-default",
              item.status === "complete"
                ? "border-success/20 bg-success/5"
                : item.status === "pending"
                ? "border-warning/20 bg-warning/5"
                : "border-destructive/20 bg-destructive/5"
            )}
          >
            <div className="shrink-0">
              {item.status === "complete" && (
                <CheckCircle2 className="h-4.5 w-4.5 text-success" />
              )}
              {item.status === "pending" && (
                <Clock className="h-4.5 w-4.5 text-warning" />
              )}
              {item.status === "required" && (
                <AlertCircle className="h-4.5 w-4.5 text-destructive" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-[13px] font-semibold leading-tight">{t(`dashboard.compliance.items.${item.key}.title`)}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t(`dashboard.compliance.items.${item.key}.desc`)}</p>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-semibold px-1.5 py-0 rounded-md border shrink-0",
                item.status === "complete" && "border-success/30 text-success bg-success/10",
                item.status === "pending" && "border-warning/30 text-warning bg-warning/10",
                item.status === "required" && "border-destructive/30 text-destructive bg-destructive/10"
              )}
            >
              {t(`dashboard.compliance.status.${item.status}`)}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
