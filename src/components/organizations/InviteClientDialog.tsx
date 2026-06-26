import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onCreated?: (orgId: string) => void;
}

export function InviteClientDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!orgName.trim() || !adminEmail.trim() || loading) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // 1) Create org
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name: orgName.trim(),
          contact_email: contactEmail.trim() || adminEmail.trim(),
          created_by: user?.id,
        })
        .select("id, name")
        .single();
      if (orgErr || !org) throw new Error(orgErr?.message || "No se pudo crear la organización");

      // 2) Invite admin user scoped to that org (role manager = admin within org)
      const { data: inv, error: invErr } = await supabase.functions.invoke("admin-invite-user", {
        body: {
          email: adminEmail.trim(),
          full_name: adminName.trim() || undefined,
          role: "manager",
          organization_id: org.id,
        },
      });
      if (invErr) throw new Error(invErr.message);
      if ((inv as any)?.ok === false) throw new Error((inv as any).error || "No se pudo invitar al usuario");

      toast({
        title: "Cliente invitado",
        description: `Se creó "${org.name}" y se envió la invitación a ${adminEmail}. El usuario debe revisar su correo para activar la cuenta.`,
      });
      setOrgName("");
      setContactEmail("");
      setAdminEmail("");
      setAdminName("");
      setOpen(false);
      onCreated?.(org.id);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Operación fallida", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto border-accent/40 text-accent hover:bg-accent/10">
          <UserPlus className="h-4 w-4 mr-2" /> Invitar cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar cliente nuevo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Crea una organización para tu cliente y envía una invitación al administrador. El usuario recibirá un correo para activar su cuenta y solo verá los datos de su organización.
          </p>
          <div className="space-y-2">
            <Label>Nombre de la organización</Label>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Banco XYZ" />
          </div>
          <div className="space-y-2">
            <Label>Correo del administrador del cliente</Label>
            <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="ciso@cliente.com" />
          </div>
          <div className="space-y-2">
            <Label>Nombre del administrador (opcional)</Label>
            <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="space-y-2">
            <Label>Correo de contacto de la organización (opcional)</Label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contacto@cliente.com" />
          </div>
          <Button onClick={submit} disabled={loading || !orgName.trim() || !adminEmail.trim()} className="w-full gradient-primary">
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando invitación…</>) : "Crear organización e invitar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}