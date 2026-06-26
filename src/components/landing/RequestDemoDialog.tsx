import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

interface RequestDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestDemoDialog({ open, onOpenChange }: RequestDemoDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
    website: "", // honeypot
  });

  const reset = () => {
    setForm({ name: "", email: "", company: "", phone: "", message: "", website: "" });
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("request-demo", { body: form });
      if (error) throw error;
      setSuccess(true);
      toast({
        title: "¡Solicitud enviada!",
        description: "Te contactaremos a la brevedad.",
      });
    } catch (err: any) {
      toast({
        title: "No se pudo enviar la solicitud",
        description:
          "Por favor escribinos directamente a info@techsecureai.com",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTimeout(reset, 200);
      }}
    >
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 mx-auto text-accent mb-4" />
            <DialogTitle className="text-foreground text-xl">¡Gracias!</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Recibimos tu solicitud. Nuestro equipo te contactará en menos de 24 hs.
            </DialogDescription>
            <Button
              className="mt-6 bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-foreground">Solicitá una demo</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Completá el formulario y te contactamos a la brevedad.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="rd-name" className="text-foreground/80">Nombre *</Label>
              <Input
                id="rd-name"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rd-email" className="text-foreground/80">Email *</Label>
              <Input
                id="rd-email"
                type="email"
                required
                maxLength={200}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rd-company" className="text-foreground/80">Empresa</Label>
                <Input
                  id="rd-company"
                  maxLength={200}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rd-phone" className="text-foreground/80">Teléfono</Label>
                <Input
                  id="rd-phone"
                  maxLength={60}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rd-message" className="text-foreground/80">Comentarios</Label>
              <Textarea
                id="rd-message"
                rows={3}
                maxLength={2000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>

            {/* Honeypot — hidden from users */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-transparent border-border text-foreground/80 hover:bg-muted hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>
                ) : (
                  "Enviar solicitud"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
