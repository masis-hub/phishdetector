import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Brand palette (matches landing/dashboard)
const COLORS = {
  primary: [124, 58, 237] as [number, number, number], // #7C3AED
  accent: [167, 139, 250] as [number, number, number], // #A78BFA
  navy: [30, 58, 138] as [number, number, number], // #1E3A8A
  dark: [6, 8, 15] as [number, number, number], // #06080F
  text: [30, 30, 40] as [number, number, number],
  muted: [110, 110, 130] as [number, number, number],
  border: [220, 220, 230] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
};

function header(doc: jsPDF, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  // Top band
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, w, 70, "F");
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 65, w, 5, "F");

  // Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PhishDetector", 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.accent);
  doc.text("by Techsecure AI", 40, 48);

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, w - 40, 32, { align: "right" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.accent);
    doc.text(subtitle, w - 40, 48, { align: "right" });
  }
}

function footer(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.border);
    doc.line(40, h - 40, w - 40, h - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Generado el ${new Date().toLocaleString("es-AR")}  •  PhishDetector by Techsecure AI`,
      40,
      h - 25,
    );
    doc.text(`Página ${i} de ${pageCount}`, w - 40, h - 25, { align: "right" });
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(2);
  doc.line(40, y, 60, y);
  doc.setLineWidth(0.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.navy);
  doc.text(text, 68, y + 4);
  return y + 18;
}

function kpiGrid(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string | number; color?: [number, number, number] }[],
): number {
  const w = doc.internal.pageSize.getWidth();
  const pad = 40;
  const gap = 10;
  const cardW = (w - pad * 2 - gap * (items.length - 1)) / items.length;
  const cardH = 56;
  items.forEach((item, i) => {
    const x = pad + i * (cardW + gap);
    doc.setFillColor(248, 249, 252);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, y, cardW, cardH, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...(item.color || COLORS.primary));
    doc.text(String(item.value), x + 12, y + 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label, x + 12, y + 45);
  });
  return y + cardH + 14;
}

function ensureSpace(doc: jsPDF, y: number, needed = 80): number {
  const h = doc.internal.pageSize.getHeight();
  if (y + needed > h - 60) {
    doc.addPage();
    return 90;
  }
  return y;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    draft: "Borrador",
    scheduled: "Programada",
    active: "Activa",
    completed: "Completada",
    archived: "Archivada",
    pending: "Pendiente",
    in_progress: "En progreso",
    cancelled: "Cancelada",
  };
  return map[s] || s;
}

function categoryLabel(c: string): string {
  const map: Record<string, string> = {
    mitigation: "Mitigación",
    training: "Capacitación",
    policy: "Política",
    simulation: "Simulación",
  };
  return map[c] || c;
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
  };
  return map[p] || p;
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-AR");
  } catch {
    return String(d);
  }
}

function safeName(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
}

// ============================================================
// CAMPAIGN REPORT
// ============================================================
export function exportCampaignReport(campaign: any, targets: any[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const sent = targets.filter((t) => t.sent_at).length;
  const opened = targets.filter((t) => t.opened_at).length;
  const clicked = targets.filter((t) => t.clicked_at).length;
  const reported = targets.filter((t) => t.reported_at).length;
  const total = targets.length;
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");

  header(doc, "Reporte de campaña", campaign.name);
  let y = 100;

  // Metadata
  y = sectionTitle(doc, "Información general", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  const meta: [string, string][] = [
    ["Estado", statusLabel(campaign.status)],
    ["Creada", fmtDate(campaign.created_at)],
    ["Inicio", fmtDate(campaign.started_at)],
    ["Fin", fmtDate(campaign.completed_at)],
    ["Plantilla", campaign.phishing_templates?.name || "—"],
    ["Remitente", campaign.phishing_templates?.sender_email || "—"],
  ];
  autoTable(doc, {
    startY: y,
    body: meta,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 4, textColor: COLORS.text },
    columnStyles: {
      0: { fontStyle: "bold", textColor: COLORS.muted, cellWidth: 100 },
      1: { textColor: COLORS.text },
    },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // KPIs
  y = ensureSpace(doc, y, 100);
  y = sectionTitle(doc, "Métricas", y);
  y = kpiGrid(doc, y, [
    { label: "Destinatarios", value: total, color: COLORS.navy },
    { label: "Enviados", value: sent, color: COLORS.primary },
    { label: "Abiertos", value: `${opened} (${pct(opened)})`, color: [14, 165, 233] },
    { label: "Clics", value: `${clicked} (${pct(clicked)})`, color: COLORS.danger },
    { label: "Reportados", value: `${reported} (${pct(reported)})`, color: COLORS.success },
  ]);

  // Funnel
  y = ensureSpace(doc, y, 160);
  y = sectionTitle(doc, "Embudo de conversión", y);
  const funnel = [
    { label: "Destinatarios", val: total, color: COLORS.navy },
    { label: "Enviados", val: sent, color: COLORS.primary },
    { label: "Abiertos", val: opened, color: [14, 165, 233] as [number, number, number] },
    { label: "Clics", val: clicked, color: COLORS.danger },
    { label: "Reportados", val: reported, color: COLORS.success },
  ];
  const maxVal = Math.max(...funnel.map((f) => f.val), 1);
  const w = doc.internal.pageSize.getWidth();
  const barMaxW = w - 80 - 120;
  funnel.forEach((f) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text(f.label, 40, y + 11);
    const barW = Math.max((f.val / maxVal) * barMaxW, 2);
    doc.setFillColor(...f.color);
    doc.roundedRect(160, y, barW, 14, 3, 3, "F");
    doc.setTextColor(...COLORS.muted);
    doc.text(`${f.val} (${pct(f.val)})`, 160 + barW + 6, y + 11);
    y += 22;
  });
  y += 6;

  // Top departments
  const deptMap = new Map<string, { total: number; clicked: number }>();
  targets.forEach((t) => {
    const d = t.department || "Sin departamento";
    if (!deptMap.has(d)) deptMap.set(d, { total: 0, clicked: 0 });
    const s = deptMap.get(d)!;
    s.total++;
    if (t.clicked_at) s.clicked++;
  });
  if (deptMap.size > 0) {
    y = ensureSpace(doc, y, 140);
    y = sectionTitle(doc, "Riesgo por departamento", y);
    const rows = [...deptMap.entries()]
      .map(([d, s]) => [d, s.total, s.clicked, `${Math.round((s.clicked / s.total) * 100)}%`])
      .sort((a, b) => (b[2] as number) - (a[2] as number));
    autoTable(doc, {
      startY: y,
      head: [["Departamento", "Destinatarios", "Clics", "Tasa de clics"]],
      body: rows,
      headStyles: { fillColor: COLORS.navy, textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // High-risk targets
  const riskyTargets = targets.filter((t) => t.clicked_at && !t.reported_at);
  if (riskyTargets.length > 0) {
    y = ensureSpace(doc, y, 120);
    y = sectionTitle(doc, "Usuarios de mayor riesgo (clic sin reporte)", y);
    autoTable(doc, {
      startY: y,
      head: [["Email", "Nombre", "Departamento", "Clic"]],
      body: riskyTargets
        .slice(0, 50)
        .map((t) => [
          t.email,
          [t.first_name, t.last_name].filter(Boolean).join(" ") || "—",
          t.department || "—",
          fmtDate(t.clicked_at),
        ]),
      headStyles: { fillColor: COLORS.danger, textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 4 },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  footer(doc);
  doc.save(`Reporte_Campana_${safeName(campaign.name)}.pdf`);
}

// ============================================================
// EXECUTIVE DASHBOARD REPORT
// ============================================================
export function exportDashboardReport(data: {
  stats: { activeCampaigns: number; avgClickRate: number; totalUsers: number };
  campaigns?: any[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  header(doc, "Reporte ejecutivo", "Resumen general");
  let y = 100;

  y = sectionTitle(doc, "Indicadores clave", y);
  const rateColor: [number, number, number] =
    data.stats.avgClickRate < 20
      ? COLORS.success
      : data.stats.avgClickRate < 30
        ? COLORS.warning
        : COLORS.danger;
  y = kpiGrid(doc, y, [
    { label: "Campañas activas", value: data.stats.activeCampaigns, color: COLORS.primary },
    { label: "Tasa de clics promedio", value: `${data.stats.avgClickRate}%`, color: rateColor },
    { label: "Usuarios únicos", value: data.stats.totalUsers, color: COLORS.navy },
    { label: "Estado del sistema", value: "Activo", color: COLORS.success },
  ]);

  // Diagnosis text
  y = ensureSpace(doc, y, 120);
  y = sectionTitle(doc, "Diagnóstico", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  const diag =
    data.stats.avgClickRate < 20
      ? "El nivel de exposición es bajo. La organización muestra una postura sólida frente a phishing. Se recomienda mantener la cadencia de simulaciones y reforzar microcapacitación trimestral."
      : data.stats.avgClickRate < 30
        ? "El nivel de exposición es moderado. Se sugiere intensificar simulaciones segmentadas y revisar el contenido de las capacitaciones para los departamentos con mayor tasa de clics."
        : "El nivel de exposición es alto. Se recomienda priorizar planes de mitigación y capacitación obligatoria para reducir la superficie de ataque por ingeniería social.";
  const split = doc.splitTextToSize(diag, doc.internal.pageSize.getWidth() - 80);
  doc.text(split, 40, y);
  y += split.length * 13 + 12;

  // Recent campaigns
  if (data.campaigns && data.campaigns.length > 0) {
    y = ensureSpace(doc, y, 120);
    y = sectionTitle(doc, "Campañas recientes", y);
    autoTable(doc, {
      startY: y,
      head: [["Nombre", "Estado", "Creada", "Inicio"]],
      body: data.campaigns
        .slice(0, 15)
        .map((c) => [c.name, statusLabel(c.status), fmtDate(c.created_at), fmtDate(c.started_at)]),
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: 40, right: 40 },
    });
  }

  footer(doc);
  doc.save(`Reporte_Ejecutivo_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================
// MITIGATION PLAN REPORT
// ============================================================
export function exportMitigationPlansReport(orgName: string, plans: any[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  header(doc, "Plan de mitigación", orgName);
  let y = 100;

  const total = plans.length;
  const completed = plans.filter((p) => p.status === "completed").length;
  const inProgress = plans.filter((p) => p.status === "in_progress").length;
  const avgProgress =
    total > 0 ? Math.round(plans.reduce((s, p) => s + (p.completion_percentage || 0), 0) / total) : 0;

  y = sectionTitle(doc, "Resumen", y);
  y = kpiGrid(doc, y, [
    { label: "Planes totales", value: total, color: COLORS.navy },
    { label: "Completados", value: completed, color: COLORS.success },
    { label: "En progreso", value: inProgress, color: COLORS.primary },
    { label: "Progreso global", value: `${avgProgress}%`, color: COLORS.accent },
  ]);

  // By category
  const cats = ["mitigation", "training", "policy", "simulation"];
  const catRows = cats.map((c) => {
    const items = plans.filter((p) => p.category === c);
    const done = items.filter((p) => p.status === "completed").length;
    return [categoryLabel(c), items.length, done, items.length ? `${Math.round((done / items.length) * 100)}%` : "0%"];
  });
  y = ensureSpace(doc, y, 140);
  y = sectionTitle(doc, "Por categoría", y);
  autoTable(doc, {
    startY: y,
    head: [["Categoría", "Total", "Completados", "% Completado"]],
    body: catRows,
    headStyles: { fillColor: COLORS.navy, textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 5 },
    margin: { left: 40, right: 40 },
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Plan detail
  if (plans.length > 0) {
    y = ensureSpace(doc, y, 140);
    y = sectionTitle(doc, "Detalle de planes", y);
    autoTable(doc, {
      startY: y,
      head: [["Título", "Categoría", "Prioridad", "Estado", "Inicio", "Fin", "Avance"]],
      body: plans.map((p) => [
        p.title,
        categoryLabel(p.category),
        priorityLabel(p.priority),
        statusLabel(p.status),
        fmtDate(p.start_date),
        fmtDate(p.end_date),
        `${p.completion_percentage || 0}%`,
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 140 } },
      margin: { left: 40, right: 40 },
    });
  }

  footer(doc);
  doc.save(`Plan_Mitigacion_${safeName(orgName)}.pdf`);
}