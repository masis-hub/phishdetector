import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onCreated: () => void;
}

export function CreatePlanDialog({ open, onOpenChange, organizationId, onCreated }: CreatePlanDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("mitigation");
  const [priority, setPriority] = useState("medium");
  const [responsible, setResponsible] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: t("common.error"), description: t("plans.dialog.titleRequired"), variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("mitigation_plans").insert({
      organization_id: organizationId,
      title: title.trim(),
      description: description.trim() || null,
      category,
      priority,
      responsible: responsible.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      created_by: user?.id,
    } as any);

    if (error) {
      toast({ title: t("common.error"), description: t("plans.dialog.createError"), variant: "destructive" });
    } else {
      toast({ title: t("plans.dialog.createdTitle"), description: t("plans.dialog.createdDesc") });
      setTitle("");
      setDescription("");
      setCategory("mitigation");
      setPriority("medium");
      setResponsible("");
      setStartDate("");
      setEndDate("");
      onOpenChange(false);
      onCreated();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("plans.dialog.createTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{t("plans.dialog.titleLabel")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("plans.dialog.titlePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("plans.dialog.description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("plans.dialog.descriptionPlaceholder")} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("plans.dialog.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mitigation">{t("plans.categories.mitigation")}</SelectItem>
                  <SelectItem value="training">{t("plans.categories.training")}</SelectItem>
                  <SelectItem value="policy">{t("plans.categories.policy")}</SelectItem>
                  <SelectItem value="simulation">{t("plans.categories.simulation")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("plans.dialog.priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">{t("plans.priorities.critical")}</SelectItem>
                  <SelectItem value="high">{t("plans.priorities.high")}</SelectItem>
                  <SelectItem value="medium">{t("plans.priorities.medium")}</SelectItem>
                  <SelectItem value="low">{t("plans.priorities.low")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("plans.dialog.responsible")}</Label>
            <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder={t("plans.dialog.responsiblePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("plans.dialog.startDate")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("plans.dialog.endDate")}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? t("plans.dialog.creating") : t("plans.dialog.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
