import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Upload, UserPlus, Users, Download, Search } from "lucide-react";

interface AddTargetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess: () => void;
}

interface TargetEntry {
  email: string;
  full_name: string;
  department: string;
}

export function AddTargetsDialog({ open, onOpenChange, campaignId, onSuccess }: AddTargetsDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [manualTarget, setManualTarget] = useState<TargetEntry>({ email: "", full_name: "", department: "" });
  const [csvText, setCsvText] = useState("");
  const [parsedTargets, setParsedTargets] = useState<TargetEntry[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const { toast } = useToast();

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-for-targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.full_name?.toLowerCase().includes(q) ?? false) ||
      (c.department?.toLowerCase().includes(q) ?? false)
    );
  });

  const generateToken = () => crypto.randomUUID().replace(/-/g, "");

  const handleAddManual = async () => {
    if (!manualTarget.email) {
      toast({ title: "Error", description: t("campaigns.add.manual.emailRequired"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("campaign_targets").insert({
        campaign_id: campaignId,
        email: manualTarget.email,
        full_name: manualTarget.full_name || null,
        department: manualTarget.department || null,
        unique_token: generateToken(),
      });
      if (error) throw error;
      toast({ title: t("campaigns.add.manual.addedTitle"), description: t("campaigns.add.manual.addedDesc") });
      setManualTarget({ email: "", full_name: "", department: "" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleParseCsv = () => {
    const lines = csvText.trim().split("\n").filter(Boolean);
    const targets: TargetEntry[] = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts[0] && parts[0].includes("@")) {
        targets.push({
          email: parts[0],
          full_name: parts[1] || "",
          department: parts[2] || "",
        });
      }
    }
    setParsedTargets(targets);
  };

  const handleImportCsv = async () => {
    if (parsedTargets.length === 0) {
      toast({ title: "Error", description: t("campaigns.add.csv.noValid"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const inserts = parsedTargets.map((t) => ({
        campaign_id: campaignId,
        email: t.email,
        full_name: t.full_name || null,
        department: t.department || null,
        unique_token: generateToken(),
      }));
      const { error } = await supabase.from("campaign_targets").insert(inserts);
      if (error) throw error;
      toast({ title: t("campaigns.add.manual.addedTitle"), description: t("campaigns.add.csv.importedDesc", { count: parsedTargets.length }) });
      setCsvText("");
      setParsedTargets([]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      const firstLine = lines[0]?.toLowerCase() || "";
      const hasHeader = firstLine.includes("correo") || firstLine.includes("email") || firstLine.includes("nombre");
      const dataLines = hasHeader ? lines.slice(1) : lines;
      setCsvText(dataLines.join("\n"));
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csv = "correo,nombre_completo,departamento\njuan@empresa.com,Juan Pérez,Tecnología\nmaria@empresa.com,María López,Ventas";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_objetivos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedContactIds.size === filteredContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleImportContacts = async () => {
    if (selectedContactIds.size === 0) {
      toast({ title: "Error", description: t("campaigns.add.directory.selectAtLeastOne"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const selected = contacts.filter((c) => selectedContactIds.has(c.id));
      const inserts = selected.map((c) => ({
        campaign_id: campaignId,
        email: c.email,
        full_name: c.full_name || null,
        department: c.department || null,
        unique_token: generateToken(),
      }));
      const { error } = await supabase.from("campaign_targets").insert(inserts);
      if (error) throw error;
      toast({ title: t("campaigns.add.manual.addedTitle"), description: t("campaigns.add.directory.importedDesc", { count: selected.length }) });
      setSelectedContactIds(new Set());
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("campaigns.add.title")}</DialogTitle>
          <DialogDescription>{t("campaigns.add.description")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2 text-xs"><UserPlus className="h-4 w-4" /> {t("campaigns.add.tabs.manual")}</TabsTrigger>
            <TabsTrigger value="csv" className="gap-2 text-xs"><Upload className="h-4 w-4" /> {t("campaigns.add.tabs.csv")}</TabsTrigger>
            <TabsTrigger value="directory" className="gap-2 text-xs"><Users className="h-4 w-4" /> {t("campaigns.add.tabs.directory")}</TabsTrigger>
          </TabsList>

          {/* Manual Tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("campaigns.add.manual.email")}</Label>
              <Input value={manualTarget.email} onChange={(e) => setManualTarget({ ...manualTarget, email: e.target.value })} placeholder={t("campaigns.add.manual.emailPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("campaigns.add.manual.fullName")}</Label>
                <Input value={manualTarget.full_name} onChange={(e) => setManualTarget({ ...manualTarget, full_name: e.target.value })} placeholder={t("campaigns.add.manual.fullNamePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("campaigns.add.manual.department")}</Label>
                <Input value={manualTarget.department} onChange={(e) => setManualTarget({ ...manualTarget, department: e.target.value })} placeholder={t("campaigns.add.manual.departmentPlaceholder")} />
              </div>
            </div>
            <Button onClick={handleAddManual} disabled={loading} className="gradient-primary w-full">
              {loading ? t("campaigns.add.manual.adding") : t("campaigns.add.manual.add")}
            </Button>
          </TabsContent>

          {/* CSV Tab */}
          <TabsContent value="csv" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                <Download className="h-4 w-4" /> {t("campaigns.add.csv.downloadTemplate")}
              </Button>
              <Label htmlFor="csv-file-targets" className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-accent transition-colors">
                  <Upload className="h-4 w-4" /> {t("campaigns.add.csv.upload")}
                </div>
              </Label>
              <input id="csv-file-targets" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </div>
            <div className="space-y-2">
              <Label>{t("campaigns.add.csv.dataLabel")}</Label>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={6}
                placeholder={"juan@empresa.com, Juan Pérez, Ingeniería\nmaria@empresa.com, María López, Marketing"}
              />
            </div>
            <Button variant="outline" onClick={handleParseCsv}>{t("campaigns.add.csv.preview")}</Button>
            {parsedTargets.length > 0 && (
              <div className="border rounded-lg p-3 max-h-40 overflow-auto text-sm">
                <p className="font-medium mb-2">{t("campaigns.add.csv.foundTargets", { count: parsedTargets.length })}</p>
                {parsedTargets.map((t, i) => (
                  <div key={i} className="text-muted-foreground">{t.email} — {t.full_name || ""} — {t.department || ""}</div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleImportCsv} disabled={loading || parsedTargets.length === 0} className="gradient-primary">
                {loading ? t("campaigns.add.csv.importing") : t("campaigns.add.csv.import", { count: parsedTargets.length })}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Directory Tab */}
          <TabsContent value="directory" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("campaigns.add.directory.search")}
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("campaigns.add.directory.empty")}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-sm text-muted-foreground">{t("campaigns.add.directory.selectAll", { count: filteredContacts.length })}</span>
                  </div>
                  <span className="text-sm font-medium">{t("campaigns.add.directory.selected", { count: selectedContactIds.size })}</span>
                </div>

                <div className="border rounded-lg max-h-60 overflow-auto divide-y divide-border">
                  {filteredContacts.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={selectedContactIds.has(c.id)}
                        onCheckedChange={() => toggleContact(c.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name || c.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email} {c.department ? `· ${c.department}` : ""}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            <DialogFooter>
              <Button onClick={handleImportContacts} disabled={loading || selectedContactIds.size === 0} className="gradient-primary">
                {loading ? t("campaigns.add.directory.importing") : t("campaigns.add.directory.import", { count: selectedContactIds.size })}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}