import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "valid" | "invalid" | "already" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { setState("invalid"); return; }
        if (data?.already_unsubscribed) { setState("already"); setEmail(data?.email ?? null); return; }
        setEmail(data?.email ?? null);
        setState("valid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setState(error ? "error" : "done");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">PhishDetector</h1>
        <p className="text-xs text-muted-foreground mb-6">Gestión de suscripción</p>

        {state === "loading" && (
          <div className="py-6"><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /></div>
        )}
        {state === "valid" && (
          <>
            <p className="text-foreground mb-6">¿Querés dejar de recibir emails{email ? ` en ${email}` : ""}?</p>
            <Button onClick={confirm} className="bg-primary hover:bg-primary/90 text-primary-foreground">Confirmar baja</Button>
          </>
        )}
        {state === "submitting" && (
          <div className="py-6"><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /></div>
        )}
        {(state === "done" || state === "already") && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-accent mb-4" />
            <p className="text-foreground">
              {state === "already" ? "Ya estabas dado de baja." : "Listo, te dimos de baja."}
            </p>
            {email && <p className="text-sm text-muted-foreground mt-2">{email}</p>}
          </>
        )}
        {(state === "invalid" || state === "error") && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-foreground">El enlace no es válido o ya expiró.</p>
          </>
        )}
      </div>
    </div>
  );
}