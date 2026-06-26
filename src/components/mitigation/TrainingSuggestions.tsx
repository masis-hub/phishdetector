import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  organizationId: string;
}

interface Suggestion {
  id: string;
  title: string;
  rationale: string;
  priority: "critical" | "high" | "medium" | "low";
  source?: string;
  url?: string;
}

// Curated catalog. Only confirmed, reliable sources include URLs.
// Items without URL will have links added later by the team.
const CATALOG: Omit<Suggestion, "priority" | "rationale">[] = [
  {
    id: "google-phishing-quiz",
    title: "Reconocimiento de correos de phishing (quiz interactivo)",
    source: "Google Jigsaw",
    url: "https://phishingquiz.withgoogle.com/",
  },
  {
    id: "cisa-secure-our-world",
    title: "Conciencia de ciberseguridad — Secure Our World",
    source: "CISA",
    url: "https://www.cisa.gov/secure-our-world",
  },
  {
    id: "sans-phishing",
    title: "Anti-Phishing Essentials",
    source: "SANS Security Awareness",
    url: "https://www.sans.org/security-awareness-training/products/specialized-training/phishing/",
  },
  {
    id: "owasp-top10",
    title: "OWASP Top 10 — Riesgos de aplicaciones web",
    source: "OWASP",
    url: "https://owasp.org/www-project-top-ten/",
  },
  {
    id: "nist-passwords",
    title: "Manejo seguro de contraseñas (NIST SP 800-63B)",
    source: "NIST",
    url: "https://pages.nist.gov/800-63-3/sp800-63b.html",
  },
  {
    id: "enisa-awareness",
    title: "Ingeniería social y concientización del personal",
    source: "ENISA",
    url: "https://www.enisa.europa.eu/topics/cybersecurity-education/awareness",
  },
  { id: "mfa-deployment", title: "Adopción de autenticación multifactor (MFA) en toda la organización" },
  { id: "incident-reporting", title: "Procedimiento interno para reportar correos sospechosos" },
  { id: "executive-briefing", title: "Briefing ejecutivo: riesgo de phishing dirigido (spear phishing y BEC)" },
];

const priorityStyles: Record<Suggestion["priority"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const priorityLabel: Record<Suggestion["priority"], string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Recomendada",
};

export function TrainingSuggestions({ organizationId }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const load = async () => {
      // Aggregate metrics from this org's campaign results to drive prioritization
      const { data: results } = await supabase
        .from("campaign_results")
        .select("click_rate, report_rate, emails_clicked, emails_reported, total_targets")
        .eq("organization_id", organizationId);

      const avgClick = results && results.length
        ? results.reduce((s, r: any) => s + (Number(r.click_rate) || 0), 0) / results.length
        : 0;
      const avgReport = results && results.length
        ? results.reduce((s, r: any) => s + (Number(r.report_rate) || 0), 0) / results.length
        : 0;

      // Build prioritized suggestion list
      const out: Suggestion[] = [];

      const phishingPriority: Suggestion["priority"] =
        avgClick >= 30 ? "critical" : avgClick >= 15 ? "high" : avgClick >= 5 ? "medium" : "low";

      out.push({
        ...CATALOG[0],
        priority: phishingPriority,
        rationale: `Tasa de clic promedio: ${avgClick.toFixed(1)}%. ${avgClick >= 15 ? "Refuerzo urgente recomendado." : "Mantenimiento periódico recomendado."}`,
      });
      out.push({
        ...CATALOG[2],
        priority: phishingPriority === "critical" ? "critical" : "high",
        rationale: "Programa formal de concientización dirigido a todo el personal expuesto a correo.",
      });
      out.push({
        ...CATALOG[1],
        priority: "medium",
        rationale: "Material gratuito y campañas listas para distribuir internamente.",
      });

      // Reporting culture
      out.push({
        ...CATALOG[7],
        priority: avgReport < 5 ? "high" : "medium",
        rationale: `Tasa de reporte: ${avgReport.toFixed(1)}%. ${avgReport < 5 ? "Los usuarios no están reportando correos sospechosos." : "Continuar promoviendo el canal de reporte."}`,
      });

      // MFA, always relevant
      out.push({
        ...CATALOG[6],
        priority: "high",
        rationale: "Mitiga el impacto cuando una credencial es expuesta por un ataque exitoso.",
      });

      // Passwords
      out.push({
        ...CATALOG[4],
        priority: "medium",
        rationale: "Estándar de referencia para políticas de contraseñas modernas.",
      });

      // Social engineering
      out.push({
        ...CATALOG[5],
        priority: "medium",
        rationale: "Marco europeo de concientización aplicable a equipos administrativos y de soporte.",
      });

      // Executive briefing
      out.push({
        ...CATALOG[8],
        priority: avgClick >= 15 ? "high" : "medium",
        rationale: "Alinear al equipo directivo en los riesgos de BEC y spear phishing dirigidos a roles clave.",
      });

      // OWASP for tech teams
      out.push({
        ...CATALOG[3],
        priority: "low",
        rationale: "Capacitación complementaria para equipos de desarrollo y TI.",
      });

      setSuggestions(out);
    };
    if (organizationId) load();
  }, [organizationId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Entrenamientos sugeridos según hallazgos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sugerencias generadas automáticamente a partir de las métricas de las campañas de esta organización.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
          >
            <div className="flex gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-md bg-primary/10 h-fit">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.title}</span>
                  <Badge variant="outline" className={priorityStyles[s.priority]}>
                    {priorityLabel[s.priority]}
                  </Badge>
                  {s.source && (
                    <span className="text-xs text-muted-foreground">Fuente: {s.source}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.rationale}</p>
              </div>
            </div>
            <div className="md:ml-3 shrink-0">
              {s.url ? (
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    Abrir <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              ) : (
                <Badge variant="outline" className="text-xs">Link pendiente</Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}