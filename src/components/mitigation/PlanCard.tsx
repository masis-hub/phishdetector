import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Calendar, User, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Plan {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  responsible: string | null;
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number;
}

const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-[hsl(var(--success))] text-white",
};

interface PlanCardProps {
  plan: Plan;
  onUpdated: () => void;
}

export function PlanCard({ plan, onUpdated }: PlanCardProps) {
  const [progress, setProgress] = useState(plan.completion_percentage);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const dfLocale = i18n.language?.startsWith("es") ? es : enUS;
  const statusKeys = ["pending", "in_progress", "completed", "cancelled"] as const;

  const updateField = async (field: string, value: any) => {
    const { error } = await supabase
      .from("mitigation_plans")
      .update({ [field]: value } as any)
      .eq("id", plan.id);
    if (error) {
      toast({ title: t("common.error"), description: t("plans.card.updateError"), variant: "destructive" });
    } else {
      onUpdated();
    }
  };

  const handleProgressSave = async () => {
    setSaving(true);
    const newStatus = progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending";
    await supabase
      .from("mitigation_plans")
      .update({ completion_percentage: progress, status: newStatus } as any)
      .eq("id", plan.id);
    setSaving(false);
    onUpdated();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("mitigation_plans").delete().eq("id", plan.id);
    if (!error) {
      toast({ title: t("plans.card.deleted"), description: t("plans.card.deletedDesc") });
      onUpdated();
    }
  };

  return (
    <Card className="p-4 space-y-3 rounded-xl border-border/50 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${priorityColors[plan.priority]} text-[10px]`}>
            {plan.priority.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {t(`plans.categories.${plan.category}`, { defaultValue: plan.category })}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Select value={plan.status} onValueChange={(v) => updateField("status", v)}>
            <SelectTrigger className="h-7 text-[11px] w-[120px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusKeys.map((k) => (
                <SelectItem key={k} value={k}>{t(`plans.statuses.${k}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm">{plan.title}</h4>
        {plan.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {plan.responsible && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {plan.responsible}
          </span>
        )}
        {plan.start_date && plan.end_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(plan.start_date), "d MMM", { locale: dfLocale })} — {format(new Date(plan.end_date), "d MMM yyyy", { locale: dfLocale })}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <Slider
            value={[progress]}
            onValueChange={([v]) => setProgress(v)}
            max={100}
            step={5}
            className="flex-1"
          />
          <span className="text-xs font-bold w-10 text-right">{progress}%</span>
          {progress !== plan.completion_percentage && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 rounded-md" onClick={handleProgressSave} disabled={saving}>
              {t("plans.card.save")}
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    </Card>
  );
}
