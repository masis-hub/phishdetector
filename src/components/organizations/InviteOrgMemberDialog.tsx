import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  organizationId: string;
  organizationName?: string;
  onInvited?: () => void;
}

export function InviteOrgMemberDialog({ organizationId, organizationName, onInvited }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"manager" | "viewer">("viewer");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!email.trim() || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: {
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          role,
          organization_id: organizationId,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any).error || "No se pudo invitar");
      toast({
        title: "Usuario invitado",
        description: `Se envió una invitación a ${email}. Cada organización admite máximo 3 usuarios.`,
      });
      setEmail("");
      setFullName("");
      setRole("viewer");
      setOpen(false);
      onInvited?.();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Operación fallida", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto border-primary/40 text-primary hover:bg-primary/10">
          <UserPlus className="h-4 w-4 mr-2" /> Invitar usuario a esta org
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario {organizationName ? `a ${organizationName}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Cada organización admite hasta <strong>3 usuarios en total</strong> (1 administrador + 2 adicionales). El invitado recibirá un correo para activar su cuenta.
          </p>
          <div className="space-y-2">
            <Label>Correo</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@cliente.com" />
          </div>
          <div className="space-y-2">
            <Label>Nombre (opcional)</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as "manager" | "viewer")} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="viewer" id="r-viewer" />
                <Label htmlFor="r-viewer" className="cursor-pointer">Viewer (solo lectura)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manager" id="r-manager" />
                <Label htmlFor="r-manager" className="cursor-pointer">Manager (puede gestionar)</Label>
              </div>
            </RadioGroup>
          </div>
          <Button onClick={submit} disabled={loading || !email.trim()} className="w-full gradient-primary">
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>) : "Enviar invitación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}