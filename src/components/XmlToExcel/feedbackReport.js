import { formatSize } from "./fileSelection";

const STATUS_LABEL = { ok: "OK", warning: "ADVERTENCIA", error: "ERROR", pending: "PENDIENTE", sent: "ENVIADO" };

const describeIssue = (issue, indent) => {
  const lines = [`${indent}[${issue.code}] ${issue.message}`];
  if (issue.hint) lines.push(`${indent}Cómo resolverlo: ${issue.hint}`);
  if (issue.details) lines.push(`${indent}Detalle técnico: ${JSON.stringify(issue.details)}`);
  return lines;
};

/**
 * Plain-text report the user can paste to support / developers. Includes everything needed to
 * reproduce: request id, codes, parser positions and browser.
 */
export function buildFeedbackReport({ items, lastRun, apiUrl, now = new Date(), userAgent = globalThis.navigator?.userAgent }) {
  const lines = ["Reporte de carga XML → Excel", `Fecha: ${now.toISOString()}`, `Servidor: ${apiUrl || "(sin configurar)"}`];

  if (lastRun?.requestId) lines.push(`Request ID: ${lastRun.requestId}`);
  if (lastRun?.summary) {
    const { total, processed, failed, withWarnings } = lastRun.summary;
    lines.push(`Resultado: ${processed} de ${total} procesados, ${failed} con error, ${withWarnings} con advertencias`);
  }
  if (lastRun?.legacyApi) lines.push("Nota: la API respondió sin reporte por archivo (versión anterior).");
  if (lastRun?.error) {
    const e = lastRun.error;
    lines.push("", `Error general${e.status ? ` (HTTP ${e.status})` : ""}:`, ...describeIssue(e, "  "));
  }

  const withIssues = items.filter((item) => item.status === "error" || item.status === "warning");
  lines.push("", withIssues.length ? "Archivos con problemas:" : "Ningún archivo con problemas.");
  withIssues.forEach((item, i) => {
    const origin = item.origin === "client" ? " (detectado en el navegador, no se envió)" : "";
    lines.push(`${i + 1}. ${item.name} (${formatSize(item.size)}) — ${STATUS_LABEL[item.status]}${origin}`);
    if (item.meta?.consecutivo) lines.push(`   Consecutivo: ${item.meta.consecutivo}${item.meta.emisor ? ` · Emisor: ${item.meta.emisor}` : ""}`);
    if (item.error) lines.push(...describeIssue(item.error, "   "));
    item.warnings.forEach((w) => lines.push(...describeIssue(w, "   ")));
  });

  lines.push("", `Total de archivos en la lista: ${items.length}`, `Navegador: ${userAgent || "desconocido"}`);
  return lines.join("\n");
}
