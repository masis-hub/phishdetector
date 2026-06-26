import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCampaignDialog({ open, onOpenChange, onSuccess }: CreateCampaignDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_id: "",
    organization_id: "",
    scheduled_at: "",
  });

  useEffect(() => {
    if (open) {
      setOrgsLoaded(false);
      fetchTemplates();
      fetchOrganizations();
    }
  }, [open]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("phishing_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data);
  };

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("name");
    if (error) console.error("fetchOrganizations error", error);
    setOrganizations(data ?? []);
    setOrgsLoaded(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.organization_id) {
      toast({ title: "Error", description: t("campaigns.create.errOrgRequired"), variant: "destructive" });
      setLoading(false);
      return;
    }
    if (!formData.scheduled_at) {
      toast({ title: "Error", description: t("campaigns.create.errScheduleRequired"), variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("campaigns").insert({
        name: formData.name.trim(),
        description: formData.description.trim(),
        template_id: formData.template_id || null,
        organization_id: formData.organization_id || null,
        scheduled_at: formData.scheduled_at || null,
        status: "draft",
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: t("campaigns.create.successTitle"),
        description: t("campaigns.create.successDesc"),
      });

      setFormData({ name: "", description: "", template_id: "", organization_id: "", scheduled_at: "" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("campaigns.create.title")}</DialogTitle>
          <DialogDescription>{t("campaigns.create.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("campaigns.create.name")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("campaigns.create.descLabel")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template">{t("campaigns.create.template")}</Label>
              {templates.length > 0 ? (
                <Select
                  value={formData.template_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("campaigns.create.templatePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2">{t("campaigns.create.loadingTemplates")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">{t("campaigns.create.organization")} <span className="text-destructive">*</span></Label>
              {!orgsLoaded ? (
                <p className="text-sm text-muted-foreground py-2">{t("campaigns.create.loadingOrgs")}</p>
              ) : organizations.length > 0 ? (
                <Select
                  value={formData.organization_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("campaigns.create.organizationPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-destructive py-2">
                  No tenés ninguna organización asignada. Pedile a un administrador que te vincule a una organización antes de crear campañas.
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t("campaigns.create.organizationHint")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_at">{t("campaigns.create.scheduledAt")} <span className="text-destructive">*</span></Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("campaigns.create.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary">
              {loading ? t("campaigns.create.submitting") : t("campaigns.create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
