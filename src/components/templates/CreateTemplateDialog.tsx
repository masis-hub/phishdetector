import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editTemplate?: any;
}

const emptyForm = {
  name: "",
  category: "",
  difficulty: "medium",
  subject: "",
  sender_name: "",
  sender_email: "",
  html_content: "",
  description: "",
  subject_en: "",
  sender_name_en: "",
  html_content_en: "",
};

export function CreateTemplateDialog({ open, onOpenChange, onSuccess, editTemplate }: CreateTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const [formData, setFormData] = useState(emptyForm);

  const isEditing = !!editTemplate;

  useEffect(() => {
    if (editTemplate) {
      setFormData({
        name: editTemplate.name || "",
        category: editTemplate.category || "",
        difficulty: editTemplate.difficulty || "medium",
        subject: editTemplate.subject || "",
        sender_name: editTemplate.sender_name || "",
        sender_email: editTemplate.sender_email || "",
        html_content: editTemplate.html_content || "",
        description: editTemplate.description || "",
        subject_en: editTemplate.subject_en || "",
        sender_name_en: editTemplate.sender_name_en || "",
        html_content_en: editTemplate.html_content_en || "",
      });
    } else {
      setFormData(emptyForm);
    }
  }, [editTemplate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        subject_en: formData.subject_en?.trim() || null,
        sender_name_en: formData.sender_name_en?.trim() || null,
        html_content_en: formData.html_content_en?.trim() || null,
      };
      if (isEditing) {
        const { error } = await supabase
          .from("phishing_templates")
          .update(payload)
          .eq("id", editTemplate.id);
        if (error) throw error;
        toast({ title: t("templatesDialog.successTitle"), description: t("templatesDialog.updatedToast") });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("phishing_templates").insert({
          ...payload,
          created_by: user?.id,
        });
        if (error) throw error;
        toast({ title: t("templatesDialog.successTitle"), description: t("templatesDialog.createdToast") });
      }

      setFormData(emptyForm);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("templatesDialog.editTitle") : t("templatesDialog.createTitle")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("templatesDialog.editDesc") : t("templatesDialog.createDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("templatesDialog.name")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t("templatesDialog.category")}</Label>
              <Input
                id="category"
                placeholder={t("templatesDialog.categoryPlaceholder")}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">{t("templatesDialog.difficulty")}</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t("templatesDialog.diffEasy")}</SelectItem>
                  <SelectItem value="medium">{t("templatesDialog.diffMedium")}</SelectItem>
                  <SelectItem value="hard">{t("templatesDialog.diffHard")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender_email">{t("templatesDialog.senderEmail")}</Label>
              <Input
                id="sender_email"
                type="email"
                placeholder={t("templatesDialog.senderEmailPlaceholder")}
                value={formData.sender_email}
                onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("templatesDialog.description")}</Label>
            <Textarea
              id="description"
              placeholder={t("templatesDialog.descriptionPlaceholder")}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <Tabs defaultValue="es" className="w-full">
            <Label>{t("templatesDialog.emailContent")}</Label>
            <TabsList className="grid w-full grid-cols-2 mt-2">
              <TabsTrigger value="es">{t("templatesDialog.tabEs")}</TabsTrigger>
              <TabsTrigger value="en">{t("templatesDialog.tabEn")}</TabsTrigger>
            </TabsList>
            <TabsContent value="es" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label htmlFor="subject">{t("templatesDialog.subject")}</Label>
                <Input id="subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender_name">{t("templatesDialog.senderName")}</Label>
                <Input id="sender_name" placeholder={t("templatesDialog.senderNamePlaceholder")} value={formData.sender_name} onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="html_content">{t("templatesDialog.htmlContent")}</Label>
                <Textarea id="html_content" placeholder={t("templatesDialog.htmlPlaceholderEs")} value={formData.html_content} onChange={(e) => setFormData({ ...formData, html_content: e.target.value })} rows={6} required />
                <p className="text-xs text-muted-foreground">{t("templatesDialog.htmlHintEs")}</p>
              </div>
            </TabsContent>
            <TabsContent value="en" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label htmlFor="subject_en">{t("templatesDialog.subjectEn")}</Label>
                <Input id="subject_en" value={formData.subject_en} onChange={(e) => setFormData({ ...formData, subject_en: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender_name_en">{t("templatesDialog.senderNameEn")}</Label>
                <Input id="sender_name_en" placeholder={t("templatesDialog.senderNameEnPlaceholder")} value={formData.sender_name_en} onChange={(e) => setFormData({ ...formData, sender_name_en: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="html_content_en">{t("templatesDialog.htmlContentEn")}</Label>
                <Textarea id="html_content_en" placeholder={t("templatesDialog.htmlPlaceholderEn")} value={formData.html_content_en} onChange={(e) => setFormData({ ...formData, html_content_en: e.target.value })} rows={6} />
                <p className="text-xs text-muted-foreground">{t("templatesDialog.htmlHintEn")}</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("templatesDialog.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary">
              {loading ? (isEditing ? t("templatesDialog.saving") : t("templatesDialog.creating")) : (isEditing ? t("templatesDialog.saveChanges") : t("templatesDialog.create"))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
