import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Trash2, Building2, Info, BookOpen, CheckCircle, AlertTriangle, Shield, ShieldCheck } from "lucide-react";

type SenderDomain = {
  id: string;
  domain: string;
  default_local_part: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
};
type Org = { id: string; name: string; sender_domain_id: string | null };

const UNSET = "__unset__";

export default function AdminSenderDomains() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const { data: domains = [] } = useQuery<SenderDomain[]>({
    queryKey: ["admin", "sender_domains"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sender_domains")
        .select("*")
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as SenderDomain[];
    },
  });

  const { data: orgs = [] } = useQuery<Org[]>({
    queryKey: ["admin", "orgs_with_domain"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, sender_domain_id")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Org[];
    },
  });

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase
      .from("sender_domains")
      .update({ is_active: value })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin", "sender_domains"] });
  };

  const removeDomain = async (id: string) => {
    if (!confirm("¿Eliminar este dominio del pool? Las organizaciones que lo usaban volverán al default.")) return;
    const { error } = await supabase.from("sender_domains").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dominio eliminado" });
    qc.invalidateQueries({ queryKey: ["admin", "sender_domains"] });
    qc.invalidateQueries({ queryKey: ["admin", "orgs_with_domain"] });
  };

  const assignOrgDomain = async (orgId: string, domainId: string | null) => {
    const { error } = await supabase
      .from("organizations")
      .update({ sender_domain_id: domainId })
      .eq("id", orgId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dominio asignado" });
    qc.invalidateQueries({ queryKey: ["admin", "orgs_with_domain"] });
  };

      {/* Checklist anti-spam — solo equipo Techsecure AI */}
      <Card className="p-5 mb-6 border-l-4 border-l-emerald-500 bg-emerald-500/5 shadow-card">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Checklist anti-spam — antes de lanzar campaña</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="text-foreground/90">
                <strong className="text-emerald-500">1. Autenticación DNS:</strong> Confirmá que el dominio tiene SPF, DKIM y DMARC configurados y verificados en Resend. Sin estos tres registros, Gmail y Outlook marcan los correos como spam.
              </p>
              <p className="text-foreground/90">
                <strong className="text-emerald-500">2. Usá subdominios dedicados:</strong> Nunca uses el dominio raíz del cliente (<code className="text-xs bg-muted px-1 rounded">cliente.com</code>). Siempre un subdominio exclusivo para simulaciones (<code className="text-xs bg-muted px-1 rounded">alertas.cliente.com</code>) para no afectar su reputación principal.
              </p>
              <p className="text-foreground/90">
                <strong className="text-emerald-500">3. Whitelisting en el cliente:</strong> Pedile al cliente (o al área de TI) que configure su servidor de correo para confiar en los remitentes de Resend. En Microsoft 365: regla de transporte con SCL = -1 + lista de IPs permitidas. En Google Workspace: IPs de Resend en la lista de permitidos del Admin Console.
              </p>
              <p className="text-foreground/90">
                <strong className="text-emerald-500">4. Contenido del correo:</strong> Verificá que la plantilla tenga:
              </p>
              <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-muted-foreground">
                <li>Mayor proporción de texto que imágenes.</li>
                <li>HTML válido y bien formado (sin tags rotos).</li>
                <li>Enlaces coherentes con el remitente (no mezclar dominios sospechosos).</li>
                <li>Evitar palabras de spam: "GRATIS", "$$$", "URGENTE", "ACTUALIZÁ AHORA" en mayúsculas.</li>
                <li>Asunto realista y creíble, sin exceso de signos de exclamación.</li>
              </ul>
              <p className="text-foreground/90">
                <strong className="text-emerald-500">5. Calentamiento del dominio:</strong> Si el subdominio es nuevo, no mandes 500 correos el primer día. Empezá con pocos y aumentá gradualmente:
              </p>
              <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-muted-foreground">
                <li>Días 1-3: máximo 50 correos/día.</li>
                <li>Días 4-7: máximo 200 correos/día.</li>
                <li>Semana 2: máximo 500 correos/día.</li>
                <li>Después: volumen completo según plan del cliente.</li>
              </ul>
              <p className="text-foreground/90">
                <strong className="text-emerald-500">6. Versión en texto plano:</strong> Asegurate de que la plantilla incluya una versión <code className="text-xs bg-muted px-1 rounded">text/plain</code> además de HTML. Los filtros de spam penalizan correos que solo tienen HTML.
              </p>
              <p className="text-foreground/90">
                <strong className="text-emerald-500">7. Monitoreo post-campaña:</strong> Revisá métricas de rebote, tasa de apertura y si algún dominio destino marcó como spam. Si ves más de 5% de rebote o menos de 10% de apertura inesperada, pausá y revisá el dominio o contenido.
              </p>
              <div className="flex items-start gap-2 pt-1">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-600/90">
                  <strong>Regla de oro:</strong> si el dominio no está verificado en Resend, no lo asignes a una campaña activa. Siempre confirmá el estado "Verificado" en Resend antes de lanzar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

  if (isAdmin === null) {
    return <DashboardLayout><div className="text-muted-foreground">Verificando…</div></DashboardLayout>;
  }
  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" />
            Dominios remitentes
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Pool de dominios verificados en Resend. Cada organización elige cuál usar para que sus simulaciones no aparezcan saliendo de techsecureai.com.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/domain-verification")}>
            <ShieldCheck className="h-5 w-5" /> Verificar DNS
          </Button>
          <Button className="gap-2 gradient-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-5 w-5" /> Agregar dominio
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-6 bg-primary/5 border-primary/20 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Cómo funciona:</strong> verificá el dominio en Resend (compralo en cualquier registrador y agregá los registros DNS que Resend te muestre). Luego cargalo acá. Una vez activo, lo podés asignar como dominio por defecto de una organización en la tabla de abajo.
        </div>
      </Card>

      {/* Instrucciones internas del equipo Techsecure AI */}
      <Card className="p-5 mb-6 border-l-4 border-l-amber-500 bg-amber-500/5 shadow-card">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Guía interna — Cómo agregar dominios de clientes</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="text-foreground/90">
                <strong className="text-amber-500">1. Qué pedirle al cliente:</strong> Solicitá un <strong>subdominio</strong> o dominio propio que ellos controlen. Ejemplo: <code className="text-xs bg-muted px-1 rounded">alertas.cliente.com</code> o <code className="text-xs bg-muted px-1 rounded">seguridad.empresa.co.cr</code>. Idealmente algo relacionado con su marca o con notificaciones/alertas.
              </p>
              <p className="text-foreground/90">
                <strong className="text-amber-500">2. Verificación en Resend:</strong> El dominio debe estar verificado en Resend antes de usarlo. Pedile al cliente (o al equipo interno) que compre el dominio en cualquier registrador y que agregue los registros DNS SPF, DKIM y DMARC que Resend solicita.
              </p>
              <p className="text-foreground/90">
                <strong className="text-amber-500">3. Cargar en la aplicación:</strong> Una vez verificado en Resend, hacé clic en <strong>"Agregar dominio"</strong> arriba a la derecha. Completá:
              </p>
              <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-muted-foreground">
                <li><strong>Nombre visible:</strong> nombre amigable para el selector (ej: "Alertas Banco Nacional").</li>
                <li><strong>Local part:</strong> la parte antes del @. Recomendado: <code className="text-xs bg-muted px-1 rounded">alertas</code>, <code className="text-xs bg-muted px-1 rounded">seguridad</code> o <code className="text-xs bg-muted px-1 rounded">notificaciones</code>.</li>
                <li><strong>Dominio:</strong> el dominio completo verificado en Resend.</li>
                <li><strong>Descripción (opcional):</strong> notas internas sobre a qué cliente pertenece o cuándo usarlo.</li>
              </ul>
              <p className="text-foreground/90">
                <strong className="text-amber-500">4. Asignar a la organización:</strong> Activá el dominio con el switch y luego asignalo a la organización del cliente en la tabla <strong>"Dominio por organización"</strong> de abajo. Desde ese momento, todas las simulaciones de esa org saldrán con ese remitente.
              </p>
              <div className="flex items-start gap-2 pt-1">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600/90">
                  <strong>Importante:</strong> sin el dominio verificado en Resend, los correos pueden rebotar o ir a spam. Siempre confirmá que el estado en Resend esté "Verificado" antes de asignarlo a una campaña activa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Pool */}
      <Card className="shadow-card overflow-hidden mb-8">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Pool de dominios</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre visible</TableHead>
              <TableHead>Dirección por defecto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Sin dominios en el pool</TableCell></TableRow>
            ) : domains.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="font-medium">{d.display_name}</div>
                  {d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {d.default_local_part}@{d.domain}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={d.is_active} onCheckedChange={(v) => toggleActive(d.id, v)} />
                    <Badge variant="outline" className={d.is_active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                      {d.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeDomain(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Asignación por organización */}
      <Card className="shadow-card overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Dominio por organización</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organización</TableHead>
              <TableHead>Dominio asignado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-10">Sin organizaciones</TableCell></TableRow>
            ) : orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell>
                  <Select
                    value={o.sender_domain_id ?? UNSET}
                    onValueChange={(v) => assignOrgDomain(o.id, v === UNSET ? null : v)}
                  >
                    <SelectTrigger className="w-full sm:w-[360px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSET}>— Default del sistema —</SelectItem>
                      {domains.filter((d) => d.is_active).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.display_name} · {d.default_local_part}@{d.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <CreateDomainDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["admin", "sender_domains"] })}
      />
    </DashboardLayout>
  );
}

function CreateDomainDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [localPart, setLocalPart] = useState("alertas");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDomain(""); setLocalPart("alertas"); setDisplayName(""); setDescription("");
    }
  }, [open]);

  const submit = async () => {
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) {
      toast({ title: "Dominio inválido", description: "Ej: bancos-cr-alertas.com", variant: "destructive" });
      return;
    }
    if (!/^[a-z0-9._-]+$/i.test(localPart)) {
      toast({ title: "Local part inválida", variant: "destructive" });
      return;
    }
    if (!displayName.trim()) {
      toast({ title: "Falta el nombre visible", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("sender_domains").insert({
      domain: cleanDomain,
      default_local_part: localPart.trim(),
      display_name: displayName.trim(),
      description: description.trim() || null,
      is_active: true,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dominio agregado", description: "Recordá tenerlo verificado en Resend antes de usarlo." });
    onCreated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Agregar dominio al pool</DialogTitle>
          <DialogDescription>
            El dominio debe estar verificado en Resend antes de usarse en una campaña real.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre visible</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ej: Alertas Bancos CR" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
            <div className="space-y-2">
              <Label>Local part</Label>
              <Input value={localPart} onChange={(e) => setLocalPart(e.target.value)} placeholder="alertas" />
            </div>
            <div className="space-y-2">
              <Label>Dominio</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="bancos-cr-alertas.com" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Los correos saldrán de: <span className="font-mono">{localPart || "alertas"}@{domain || "tu-dominio.com"}</span>
          </p>
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas internas sobre cuándo usar este dominio" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting} className="gradient-primary">
            {submitting ? "Guardando…" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}