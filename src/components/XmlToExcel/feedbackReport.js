import { formatSize } from "./fileSelection";

const STATUS_LABEL = { ok: "OK", warning: "ADVERTENCIA", error: "ERROR", pending: "PENDIENTE" };

const describeIssue = (issue, indent) => {
  const lines = [`${indent}[${issue.code}] ${issue.message}`];
  if (issue.hint) lines.push(`${indent}Cómo resolverlo: ${issue.hint}`);
  if (issue.details) lines.push(`${indent}Detalle técnico: ${JSON.stringify(issue.details)}`);
  return lines;
};

/**
 * Plain-text report the user can paste to support / developers. Includes everything needed to
 * reproduce: app version, codes, parser positions and browser.
 */
export function buildFeedbackReport({
  items,
  lastRun,
  now = new Date(),
  userAgent = globalThis.navigator?.userAgent,
  appVersion = import.meta.env.VITE_APP_VERSION,
}) {
  const lines = [
    "Reporte de carga XML → Excel",
    `Fecha: ${now.toISOString()}`,
    `Versión: ${appVersion || "desconocida"} (procesado en el navegador)`,
  ];

  if (lastRun?.summary) {
    const { total, processed, failed, withWarnings } = lastRun.summary;
    lines.push(`Resultado: ${processed} de ${total} procesados, ${failed} con error, ${withWarnings} con advertencias`);
  }
  if (lastRun?.error) {
    lines.push("", "Error general:", ...describeIssue(lastRun.error, "  "));
  }

  const withIssues = items.filter((item) => item.status === "error" || item.status === "warning");
  lines.push("", withIssues.length ? "Archivos con problemas:" : "Ningún archivo con problemas.");
  withIssues.forEach((item, i) => {
    const origin = item.origin === "client" ? " (detectado al agregarlo, no se procesó)" : "";
    lines.push(`${i + 1}. ${item.name} (${formatSize(item.size)}) — ${STATUS_LABEL[item.status]}${origin}`);
    if (item.meta?.consecutivo) lines.push(`   Consecutivo: ${item.meta.consecutivo}${item.meta.emisor ? ` · Emisor: ${item.meta.emisor}` : ""}`);
    if (item.error) lines.push(...describeIssue(item.error, "   "));
    item.warnings.forEach((w) => lines.push(...describeIssue(w, "   ")));
  });

  lines.push("", `Total de archivos en la lista: ${items.length}`, `Navegador: ${userAgent || "desconocido"}`);
  return lines.join("\n");
}
