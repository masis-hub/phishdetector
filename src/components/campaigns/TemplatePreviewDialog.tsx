import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Code, Save, Loader2, Mail, User, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    name: string;
    subject: string;
    sender_name: string;
    sender_email: string;
    html_content: string;
  };
  onSaved?: () => void;
}

export function TemplatePreviewDialog({ open, onOpenChange, template, onSaved }: TemplatePreviewDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<string>("preview");

  const [subject, setSubject] = useState(template.subject);
  const [senderName, setSenderName] = useState(template.sender_name);
  const [senderEmail, setSenderEmail] = useState(template.sender_email);
  const [htmlContent, setHtmlContent] = useState(template.html_content);

  // Sync state when template changes
  const [lastId, setLastId] = useState(template.id);
  if (template.id !== lastId) {
    setLastId(template.id);
    setSubject(template.subject);
    setSenderName(template.sender_name);
    setSenderEmail(template.sender_email);
    setHtmlContent(template.html_content);
  }

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("phishing_templates")
      .update({
        subject,
        sender_name: senderName,
        sender_email: senderEmail,
        html_content: htmlContent,
      })
      .eq("id", template.id);

    if (error) {
      toast({ title: t("common.error"), description: t("templatePreview.saveError"), variant: "destructive" });
    } else {
      toast({ title: t("templatePreview.savedTitle"), description: t("templatePreview.savedDesc") });
      onSaved?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {template.name}
          </DialogTitle>
        </DialogHeader>

        {/* Editable fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> {t("templatePreview.subject")}
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> {t("templatePreview.sender")}
            </Label>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> {t("templatePreview.email")}
            </Label>
            <Input
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="text-sm rounded-lg"
            />
          </div>
        </div>

        {/* Preview / Code tabs */}
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-fit rounded-xl">
            <TabsTrigger value="preview" className="gap-1.5 rounded-lg text-xs">
              <Eye className="h-3.5 w-3.5" /> {t("templatePreview.preview")}
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-1.5 rounded-lg text-xs">
              <Code className="h-3.5 w-3.5" /> {t("templatePreview.code")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 min-h-0 mt-3">
            <div className="h-full max-h-[60vh] overflow-auto rounded-xl border border-border/50 bg-background">
              {/* Email chrome header */}
              <div className="border-b border-border/50 bg-muted/30 px-5 py-3 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">{t("templatePreview.from")}</span>
                  <span>{senderName} &lt;{senderEmail}&gt;</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">{t("templatePreview.subjectLabel")}</span>
                  <span className="font-medium">{subject}</span>
                </div>
              </div>
              {/* Email body — rendered in a sandboxed iframe to neutralize scripts/handlers in template HTML */}
              <iframe
                title="email-preview"
                sandbox=""
                className="w-full min-h-[50vh] border-0"
                srcDoc={(htmlContent || "").replace(/\{\{TRACKING_URL\}\}/g, "#").replace(/\{tracking_link\}/g, "#")}
              />
            </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 min-h-0 mt-3">
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="h-full max-h-[60vh] font-mono text-xs rounded-xl resize-vertical"
              spellCheck={false}
            />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {t("templatePreview.cancel")}
          </Button>
          <Button className="gap-2 gradient-primary border-0 rounded-xl" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("templatePreview.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
