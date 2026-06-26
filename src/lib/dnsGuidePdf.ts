import jsPDF from "jspdf";

export type DnsStatus = "verified" | "pending" | "failed" | "missing";

export interface DnsGuideInput {
  domain: string;
  organizationName?: string | null;
  missing?: string[]; // e.g. ["SPF","DKIM","DMARC"]
  statusByRecord?: Partial<Record<"SPF" | "DKIM" | "DMARC", DnsStatus>>;
  reason?: string | null;
}

const VIOLET: [number, number, number] = [124, 58, 237]; // #7C3AED
const NAVY: [number, number, number] = [30, 58, 138];     // #1E3A8A
const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [100, 100, 100];
const AMBER: [number, number, number] = [217, 119, 6];
const GREEN: [number, number, number] = [16, 185, 129];

const STATUS_LABEL: Record<DnsStatus, string> = {
  verified: "Verificado",
  pending: "Pendiente",
  failed: "Fallido",
  missing: "Sin registro",
};

export function generateDnsGuidePdf(input: DnsGuideInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header band
  doc.setFillColor(...VIOLET);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PhishDetector — Guía de configuración DNS", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Powered by Techsecure AI", margin, 50);
  doc.text(new Date().toLocaleDateString(), pageW - margin, 50, { align: "right" });

  y = 100;
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Para el equipo de TI del cliente", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const intro = doc.splitTextToSize(
    `Esta guía explica cómo dejar listo el dominio remitente que se usará en las simulaciones de phishing autorizadas. Sin estos registros DNS, los correos serán bloqueados por filtros de spam o por la política DMARC del dominio.`,
    pageW - margin * 2
  );
  doc.text(intro, margin, y);
  y += intro.length * 14 + 10;

  // Domain card
  ensureSpace(90);
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 248, 252);
  doc.roundedRect(margin, y, pageW - margin * 2, 78, 6, 6, "FD");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DOMINIO REMITENTE", margin + 14, y + 20);
  doc.setTextColor(...TEXT);
  doc.setFontSize(15);
  doc.text(input.domain, margin + 14, y + 40);
  if (input.organizationName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(`Organización: ${input.organizationName}`, margin + 14, y + 58);
  }
  y += 92;

  // Status row
  const records: Array<"SPF" | "DKIM" | "DMARC"> = ["SPF", "DKIM", "DMARC"];
  ensureSpace(60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text("Estado actual de los registros", margin, y);
  y += 16;

  const colW = (pageW - margin * 2) / 3;
  records.forEach((rec, i) => {
    const status: DnsStatus =
      input.statusByRecord?.[rec] ??
      (input.missing?.includes(rec) ? "missing" : "verified");
    const isOk = status === "verified";
    const color = isOk ? GREEN : AMBER;
    const x = margin + i * colW;
    doc.setDrawColor(...color);
    doc.setFillColor(isOk ? 236 : 254, isOk ? 253 : 247, isOk ? 245 : 234);
    doc.roundedRect(x + 4, y, colW - 8, 44, 5, 5, "FD");
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(rec, x + 14, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(STATUS_LABEL[status], x + 14, y + 34);
  });
  y += 60;

  // Step list
  const steps: Array<{ title: string; body: string }> = [
    {
      title: "1. Confirmar autorización por escrito",
      body: `Antes de tocar el DNS, asegurate de tener autorización formal del responsable del dominio ${input.domain} para correr simulaciones de phishing controladas. Esta autorización debe quedar archivada.`,
    },
    {
      title: "2. Dar de alta el dominio en Resend",
      body: `El proveedor de envío (Resend) generará los valores exactos de los registros SPF, DKIM y DMARC para ${input.domain}. El equipo Techsecure AI hace este paso desde su consola.`,
    },
    {
      title: "3. Crear los registros DNS en el panel del cliente",
      body: `En el panel DNS del dominio (Cloudflare, GoDaddy, Route53, etc.) creá los siguientes registros TXT con los valores que entrega Resend:
• SPF — registro TXT en ${input.domain} con un valor "v=spf1 include:_spf.resend.com ~all" (Resend confirma el valor exacto).
• DKIM — uno o varios registros TXT con nombre tipo "resend._domainkey.${input.domain}" y el valor "v=DKIM1; k=rsa; p=..." entregado por Resend.
• DMARC — registro TXT en "_dmarc.${input.domain}" con un valor como "v=DMARC1; p=none; rua=mailto:dmarc@${input.domain}". Empezá con p=none para monitorear y subir a quarantine luego.`,
    },
    {
      title: "4. Esperar la propagación DNS",
      body: `Los cambios DNS pueden tardar entre algunos minutos y 24-48 horas en propagar. Podés verificar con herramientas como dnschecker.org o "dig TXT ${input.domain}".`,
    },
    {
      title: "5. Verificar en Resend",
      body: `Una vez propagado, en la consola de Resend tocá "Verify DNS Records" hasta que los tres registros aparezcan en estado "Verified". Si alguno queda en rojo, revisá que el valor esté copiado sin espacios extra y que el nombre del registro sea exactamente el indicado.`,
    },
    {
      title: "6. Reverificar en PhishDetector",
      body: `En PhishDetector, el equipo Techsecure AI entra a Admin → Verificación DNS y toca "Reverificar". Cuando el dominio aparece como "Listo", recién ahí se permite el lanzamiento de campañas.`,
    },
    {
      title: "7. Recomendaciones de hardening",
      body: `Para mejorar deliverability:
• Usar un subdominio dedicado (por ejemplo alertas.${input.domain.replace(/^[^.]+\./, "")}) para no afectar la reputación del dominio principal.
• Listar las IPs de Resend en las reglas de allow-list de Microsoft 365 / Google Workspace si el cliente filtra correo entrante.
• Hacer warm-up gradual: primeros días pocos envíos, ir aumentando.`,
    },
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  ensureSpace(20);
  doc.text("Pasos para configurar el dominio", margin, y);
  y += 14;

  steps.forEach((step) => {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...VIOLET);
    doc.text(step.title, margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(step.body, pageW - margin * 2);
    lines.forEach((line: string) => {
      ensureSpace(14);
      doc.text(line, margin, y);
      y += 13;
    });
    y += 8;
  });

  // Footer note
  ensureSpace(60);
  doc.setDrawColor(...AMBER);
  doc.setFillColor(254, 247, 234);
  doc.roundedRect(margin, y, pageW - margin * 2, 50, 5, 5, "FD");
  doc.setTextColor(...AMBER);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Importante", margin + 12, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT);
  const note = doc.splitTextToSize(
    `PhishDetector NO permite el lanzamiento de campañas mientras el dominio no tenga SPF + DKIM + DMARC verificados. Este bloqueo protege tanto la reputación del dominio del cliente como el cumplimiento de políticas antispam.`,
    pageW - margin * 2 - 24
  );
  doc.text(note, margin + 12, y + 32);

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
    doc.text("Confidencial — PhishDetector by Techsecure AI", margin, pageH - 20);
  }

  return doc;
}

export function downloadDnsGuidePdf(input: DnsGuideInput) {
  const doc = generateDnsGuidePdf(input);
  const safe = input.domain.replace(/[^a-z0-9.-]/gi, "_");
  doc.save(`guia-dns-${safe}.pdf`);
}
