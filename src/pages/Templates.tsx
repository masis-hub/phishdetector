import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Pencil } from "lucide-react";
import { CreateTemplateDialog } from "@/components/templates/CreateTemplateDialog";
import { supabase } from "@/integrations/supabase/client";

export default function Templates() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("phishing_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) setEditingTemplate(null);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("templates.title")}</h1>
          <p className="text-muted-foreground text-sm md:text-base">{t("templates.subtitle")}</p>
        </div>
        <Button className="gap-2 gradient-primary shrink-0" onClick={() => { setEditingTemplate(null); setCreateDialogOpen(true); }}>
          <Plus className="h-5 w-5" />
          {t("templates.create")}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("templates.emptyTitle")}</h3>
          <p className="text-muted-foreground mb-4">{t("templates.emptyDesc")}</p>
          <Button className="gradient-primary" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-5 w-5 mr-2" />
            {t("templates.create")}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="p-6 shadow-card hover:shadow-elevated transition-smooth">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{template.name}</h3>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-1">{template.description || t("templates.noDescription")}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t("templates.difficulty")}: {t(`templates.difficulties.${template.difficulty}`, template.difficulty)} • {t("templates.from")}: {template.sender_name}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t("templates.subject")}: {template.subject}</span>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleEdit(template)}>
                      <Pencil className="h-3 w-3" /> {t("templates.edit")}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchTemplates}
        editTemplate={editingTemplate}
      />

      <Card className="p-6 shadow-card mt-8">
        <h3 className="text-lg font-semibold mb-2">{t("templates.guidelinesTitle")}</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• {t("templates.guidelines.g1")}</li>
          <li>• {t("templates.guidelines.g2")}</li>
          <li>• {t("templates.guidelines.g3")}</li>
          <li>• {t("templates.guidelines.g4")}</li>
          <li>• {t("templates.guidelines.g5")}</li>
        </ul>
      </Card>
    </DashboardLayout>
  );
}
