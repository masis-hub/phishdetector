import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowLeft, Globe,
  FileDown,
} from "lucide-react";
import { downloadDnsGuidePdf } from "@/lib/dnsGuidePdf";

type DnsStatus = "verified" | "pending" | "failed" | "missing";
type ResendRecord = {
  record?: string; name?: string; type?: string; value?: string; status?: string; ttl?: string;
};
type DomainCheck = {
  id: string;
  domain: string;
  display_name: string;
  default_local_part: string;
  is_active: boolean;
  resend_status: string;
  resend_region: string | null;
  spf: DnsStatus;
  dkim: DnsStatus;
  dmarc: DnsStatus;
  ready: boolean;
  records: Record<"SPF" | "DKIM" | "DMARC", ResendRecord[]>;
  matched_domain: string | null;
};

const STATUS_META: Record<DnsStatus, { label: string; variant: any; icon: any; className: string }> = {
  verified: { label: "Verificado", variant: "default", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  pending:  { label: "Pendiente",  variant: "secondary", icon: HelpCircle, className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  failed:   { label: "Fallido",    variant: "destructive", icon: XCircle, className: "bg-red-500/15 text-red-300 border-red-500/30" },
  missing:  { label: "Sin registro", variant: "outline", icon: AlertTriangle, className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
};

function StatusBadge({ status }: { status: DnsStatus }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.className}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

export default function AdminDomainVerification() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DomainCheck[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("verify-sender-domains", { body: {} });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData((res as any).domains ?? []);
      setCheckedAt((res as any).checked_at ?? null);
    } catch (e: any) {
      toast({
        title: "No se pudo verificar",
        description: e?.message ?? "Error consultando Resend",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (isAdmin !== true) return null;

  const ready = data.filter((d) => d.ready).length;
  const pending = data.length - ready;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/sender-domains")} className="gap-1 -ml-2">
                <ArrowLeft className="h-4 w-4" /> Dominios
              </Button>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-violet-400" />
              Verificación DNS de dominios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Estado de SPF, DKIM y DMARC por dominio remitente antes de lanzar una campaña.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {checkedAt && (
              <span className="text-xs text-muted-foreground">
                Última verificación: {new Date(checkedAt).toLocaleString()}
              </span>
            )}
            <Button onClick={fetchStatus} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Verificando..." : "Reverificar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Dominios configurados</div>
            <div className="text-2xl font-bold mt-1">{data.length}</div>
          </Card>
          <Card className="p-4 border-emerald-500/30">
            <div className="text-sm text-emerald-300">Listos para lanzar</div>
            <div className="text-2xl font-bold mt-1 text-emerald-200">{ready}</div>
          </Card>
          <Card className="p-4 border-amber-500/30">
            <div className="text-sm text-amber-300">Con pendientes</div>
            <div className="text-2xl font-bold mt-1 text-amber-200">{pending}</div>
          </Card>
        </div>

        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dominio</TableHead>
                <TableHead>Estado Resend</TableHead>
                <TableHead>SPF</TableHead>
                <TableHead>DKIM</TableHead>
                <TableHead>DMARC</TableHead>
                <TableHead>Listo</TableHead>
                <TableHead className="text-right">Guía</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay dominios configurados.
                  </TableCell>
                </TableRow>
              )}
              {data.map((d) => (
                <TableRow key={d.id} className={d.ready ? "" : "bg-amber-500/5"}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{d.default_local_part}@{d.domain}</div>
                        <div className="text-xs text-muted-foreground">{d.display_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {d.resend_status === "not_found" ? "No encontrado en Resend" : d.resend_status}
                    </Badge>
                    {d.matched_domain && d.matched_domain.toLowerCase() !== d.domain.toLowerCase() && (
                      <div className="text-xs text-muted-foreground mt-1">vía {d.matched_domain}</div>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={d.spf} /></TableCell>
                  <TableCell><StatusBadge status={d.dkim} /></TableCell>
                  <TableCell><StatusBadge status={d.dmarc} /></TableCell>
                  <TableCell>
                    {d.ready ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Listo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 gap-1">
                        <AlertTriangle className="h-3 w-3" /> Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => downloadDnsGuidePdf({
                        domain: d.domain,
                        missing: (["SPF", "DKIM", "DMARC"] as const).filter(
                          (k) => d[k.toLowerCase() as "spf" | "dkim" | "dmarc"] !== "verified"
                        ),
                        statusByRecord: {
                          SPF: d.spf, DKIM: d.dkim, DMARC: d.dmarc,
                        },
                      })}
                    >
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {data.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Detalle de registros DNS</h3>
            <Accordion type="multiple" className="w-full">
              {data.map((d) => (
                <AccordionItem key={d.id} value={d.id}>
                  <AccordionTrigger className="text-sm">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> {d.domain}
                      {!d.ready && (
                        <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 ml-2">
                          {[
                            d.spf !== "verified" && "SPF",
                            d.dkim !== "verified" && "DKIM",
                            d.dmarc !== "verified" && "DMARC",
                          ].filter(Boolean).join(" · ")} pendiente
                        </Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {(["SPF", "DKIM", "DMARC"] as const).map((kind) => (
                      <div key={kind} className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{kind}</span>
                          <StatusBadge status={d[kind.toLowerCase() as "spf" | "dkim" | "dmarc"]} />
                        </div>
                        {d.records[kind].length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            No se encontró un registro {kind} en Resend para este dominio.
                          </p>
                        ) : (
                          <div className="rounded border border-border/40 overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Tipo</TableHead>
                                  <TableHead className="text-xs">Nombre</TableHead>
                                  <TableHead className="text-xs">Valor</TableHead>
                                  <TableHead className="text-xs">Estado</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {d.records[kind].map((r, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="text-xs">{r.type ?? "-"}</TableCell>
                                    <TableCell className="text-xs font-mono break-all">{r.name ?? "-"}</TableCell>
                                    <TableCell className="text-xs font-mono break-all max-w-md">{r.value ?? "-"}</TableCell>
                                    <TableCell className="text-xs"><StatusBadge status={(r.status as DnsStatus) === "verified" ? "verified" : (r.status === "failed" ? "failed" : "pending")} /></TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
