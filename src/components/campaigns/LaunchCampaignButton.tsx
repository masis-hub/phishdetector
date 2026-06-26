import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, ShieldAlert, ShieldCheck, ExternalLink, FileDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { downloadDnsGuidePdf } from "@/lib/dnsGuidePdf";

interface LaunchCampaignButtonProps {
  campaignId: string;
  hasTemplate: boolean;
  targetCount: number;
  status: string;
  onLaunched: () => void;
}

export function LaunchCampaignButton({ campaignId, hasTemplate, targetCount, status, onLaunched }: LaunchCampaignButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [dnsIssue, setDnsIssue] = useState<{
    domain: string;
    missing: string[];
    reason: string | null;
  } | null>(null);
  const tErr = (code: string, fallback?: string) =>
    t(`errors.${code}`, { defaultValue: fallback || code });

  const handleLaunch = async () => {
    if (!hasTemplate) {
      toast({ title: t("campaigns.launch.missingTemplateTitle"), description: t("campaigns.launch.missingTemplateDesc"), variant: "destructive" });
      return;
    }
    if (targetCount === 0) {
      toast({ title: t("campaigns.launch.noTargetsTitle"), description: t("campaigns.launch.noTargetsDesc"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("UNAUTHORIZED");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      let response: Response;
      try {
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign-emails`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ campaign_id: campaignId, locale: i18n.language?.startsWith("en") ? "en" : "es" }),
            signal: controller.signal,
          }
        );
      } catch (fetchErr: any) {
        if (fetchErr?.name === "AbortError") throw new Error("REQUEST_TIMEOUT");
        throw new Error(fetchErr?.message || "NETWORK_ERROR");
      } finally {
        clearTimeout(timeoutId);
      }

      const result = await response.json();
      if (!response.ok) {
        if (result?.error === "DOMAIN_NOT_VERIFIED") {
          setDnsIssue({
            domain: result.domain ?? "—",
            missing: Array.isArray(result.missing) ? result.missing : [],
            reason: result.reason ?? null,
          });
          return;
        }
        const details = Array.isArray(result.errors) && result.errors.length > 0
          ? result.errors[0]
          : result.error || "UNEXPECTED";
        throw new Error(details);
      }

      toast({
        title: t("campaigns.launch.launchedTitle"),
        description: t("campaigns.launch.launchedDesc", { sent: result.sent, total: result.total }),
      });
      onLaunched();
    } catch (error: any) {
      toast({ title: t("campaigns.launch.launchErrorTitle"), description: tErr(error.message, error.message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (status !== "draft") {
    return null;
  }

  return (
    <>
    <Button onClick={handleLaunch} disabled={loading} className="gradient-primary gap-2">
      <Rocket className="h-4 w-4" />
      {loading ? t("campaigns.launch.sending") : t("campaigns.launch.button")}
    </Button>

    <Dialog open={!!dnsIssue} onOpenChange={(o) => !o && setDnsIssue(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            Lanzamiento bloqueado: dominio no verificado
          </DialogTitle>
          <DialogDescription>
            El dominio remitente <strong className="text-foreground">{dnsIssue?.domain}</strong> no tiene los tres registros DNS verificados en Resend. Por política antispam y de DMARC, no podemos enviar la campaña hasta corregirlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["SPF", "DKIM", "DMARC"] as const).map((k) => {
              const missing = dnsIssue?.missing.includes(k);
              return (
                <Badge
                  key={k}
                  variant="outline"
                  className={missing
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}
                >
                  {missing ? <ShieldAlert className="h-3 w-3 mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                  {k} {missing ? "pendiente" : "verificado"}
                </Badge>
              );
            })}
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-4 text-sm space-y-3">
            <p className="font-semibold text-foreground">Cómo solucionarlo</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                Verificá que el dominio <code className="text-xs bg-background px-1 rounded">{dnsIssue?.domain}</code> esté cargado en <strong className="text-foreground">Resend</strong> y copiá los registros que muestra la consola (SPF, DKIM y DMARC).
              </li>
              <li>
                Pedile al cliente (o al equipo de IT) que cree esos registros <strong className="text-foreground">TXT</strong> en el panel DNS del dominio. DMARC va sobre <code className="text-xs bg-background px-1 rounded">_dmarc.{dnsIssue?.domain}</code>.
              </li>
              <li>
                Esperá la propagación DNS (entre minutos y hasta 24-48 h) y en Resend tocá <em>Verify DNS Records</em> hasta ver los tres en estado <strong className="text-emerald-400">Verified</strong>.
              </li>
              <li>
                En PhishDetector volvé a <strong className="text-foreground">Admin → Verificación DNS</strong> y presioná <em>Reverificar</em>. Cuando el dominio aparezca como <strong className="text-emerald-400">Listo</strong>, podés relanzar la campaña.
              </li>
            </ol>
            {dnsIssue?.reason && dnsIssue.reason !== "DNS_RECORDS_NOT_VERIFIED" && (
              <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
                Detalle técnico: <code className="text-xs">{dnsIssue.reason}</code>
                {dnsIssue.reason === "DOMAIN_NOT_IN_RESEND" && (
                  <span> — el dominio aún no está dado de alta en Resend. Agregalo antes de continuar.</span>
                )}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setDnsIssue(null)}>Cerrar</Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => dnsIssue && downloadDnsGuidePdf({
              domain: dnsIssue.domain,
              missing: dnsIssue.missing,
              reason: dnsIssue.reason,
            })}
          >
            <FileDown className="h-4 w-4" /> Descargar guía PDF
          </Button>
          {isAdmin && (
            <Button
              onClick={() => { setDnsIssue(null); navigate("/admin/domain-verification"); }}
              className="gap-2 gradient-primary"
            >
              <ShieldCheck className="h-4 w-4" /> Ir a Verificación DNS
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
