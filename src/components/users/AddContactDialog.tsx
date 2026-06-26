import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, UserPlus, Download } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ContactEntry {
  email: string;
  full_name: string;
  department: string;
}

export function AddContactDialog({ open, onOpenChange, onSuccess }: AddContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState<ContactEntry & { password: string; role: string }>({ email: "", full_name: "", department: "", password: "", role: "viewer" });
  const [csvText, setCsvText] = useState("");
  const [parsedContacts, setParsedContacts] = useState<ContactEntry[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleAddManual = async () => {
    if (!manual.email || !manual.password) {
      toast({ title: t("common.error"), description: t("addContact.errEmailPass"), variant: "destructive" });
      return;
    }
    if (manual.password.length < 6) {
      toast({ title: t("common.error"), description: t("addContact.errPasswordShort"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: manual.email,
          password: manual.password,
          full_name: manual.full_name,
          department: manual.department,
          role: manual.role,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: t("addContact.successTitle"), description: t("addContact.userCreated") });
      setManual({ email: "", full_name: "", department: "", password: "", role: "viewer" });
      onSuccess();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleParseCsv = () => {
    const lines = csvText.trim().split("\n").filter(Boolean);
    const contacts: ContactEntry[] = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts[0] && parts[0].includes("@")) {
        contacts.push({
          email: parts[0],
          full_name: parts[1] || "",
          department: parts[2] || "",
        });
      }
    }
    setParsedContacts(contacts);
  };

  const handleImportCsv = async () => {
    if (parsedContacts.length === 0) {
      toast({ title: t("common.error"), description: t("addContact.errNoContacts"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const inserts = parsedContacts.map((c) => ({
        email: c.email,
        full_name: c.full_name || null,
        department: c.department || null,
      }));
      const { error } = await supabase.from("contacts").insert(inserts);
      if (error) throw error;
      toast({ title: t("addContact.successTitle"), description: t("addContact.imported", { count: parsedContacts.length }) });
      setCsvText("");
      setParsedContacts([]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        toast({ title: t("common.error"), description: t("addContact.errDuplicate"), variant: "destructive" });
      } else {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = "correo,nombre_completo,departamento\njuan@empresa.com,Juan Pérez,Tecnología\nmaria@empresa.com,María López,Ventas";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_usuarios.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Skip header row if it looks like one
      const lines = text.trim().split("\n");
      const firstLine = lines[0]?.toLowerCase() || "";
      const hasHeader = firstLine.includes("correo") || firstLine.includes("email") || firstLine.includes("nombre");
      const dataLines = hasHeader ? lines.slice(1) : lines;
      setCsvText(dataLines.join("\n"));
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("addContact.title")}</DialogTitle>
          <DialogDescription>{t("addContact.desc")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2"><UserPlus className="h-4 w-4" /> {t("addContact.tabManual")}</TabsTrigger>
            <TabsTrigger value="csv" className="gap-2"><Upload className="h-4 w-4" /> {t("addContact.tabCsv")}</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("addContact.email")}</Label>
              <Input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} placeholder={t("addContact.emailPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("addContact.password")}</Label>
              <Input type="password" value={manual.password} onChange={(e) => setManual({ ...manual, password: e.target.value })} placeholder={t("addContact.passwordPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("addContact.fullName")}</Label>
                <Input value={manual.full_name} onChange={(e) => setManual({ ...manual, full_name: e.target.value })} placeholder={t("addContact.fullNamePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("addContact.department")}</Label>
                <Input value={manual.department} onChange={(e) => setManual({ ...manual, department: e.target.value })} placeholder={t("addContact.departmentPlaceholder")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("addContact.role")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={manual.role}
                onChange={(e) => setManual({ ...manual, role: e.target.value })}
              >
                <option value="viewer">{t("addContact.roleViewer")}</option>
                <option value="manager">{t("addContact.roleManager")}</option>
                <option value="admin">{t("addContact.roleAdmin")}</option>
              </select>
            </div>
            <Button onClick={handleAddManual} disabled={loading} className="gradient-primary w-full">
              {loading ? t("addContact.creating") : t("addContact.createUser")}
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                <Download className="h-4 w-4" /> {t("addContact.downloadTpl")}
              </Button>
              <Label htmlFor="csv-file" className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-accent transition-colors">
                  <Upload className="h-4 w-4" /> {t("addContact.upload")}
                </div>
              </Label>
              <input id="csv-file" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </div>
            <div className="space-y-2">
              <Label>{t("addContact.csvData")}</Label>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={6}
                placeholder={"juan@empresa.com, Juan Pérez, Tecnología\nmaria@empresa.com, María López, Ventas"}
              />
            </div>
            <Button variant="outline" onClick={handleParseCsv}>{t("addContact.preview")}</Button>
            {parsedContacts.length > 0 && (
              <div className="border rounded-lg p-3 max-h-40 overflow-auto text-sm">
                <p className="font-medium mb-2">{t("addContact.foundUsers", { count: parsedContacts.length })}</p>
                {parsedContacts.map((c, i) => (
                  <div key={i} className="text-muted-foreground">{c.email} — {c.full_name || t("addContact.noName")} — {c.department || t("addContact.noDept")}</div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleImportCsv} disabled={loading || parsedContacts.length === 0} className="gradient-primary">
                {loading ? t("addContact.importing") : t("addContact.import", { count: parsedContacts.length })}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
