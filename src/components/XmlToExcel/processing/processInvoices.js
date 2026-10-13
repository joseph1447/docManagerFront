import { parseComprobante, InvoiceFileError } from "./invoiceParser";

export const EXCEL_FILE_NAME = "resultado.xlsx";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// The "Comprobantes" sheet is consumed by the client's accounting workflow: do not change
// headers, order or keys without coordinating it (excelCompat.test.js guards this).
export const COLUMNS = [
  { header: "No. Factura", key: "NoFactura", width: 15 },
  { header: "Tipo de Transacción", key: "TipoTransaccion", width: 20 },
  { header: "Proveedor", key: "Proveedor", width: 30 },
  { header: "Grupo de Facturación", key: "GrupoFacturacion", width: 25 },
  { header: "Términos de Pago", key: "TerminoPago", width: 20 },
  { header: "Fecha", key: "Fecha", width: 15 },
  { header: "Descripción", key: "Descripcion", width: 40 },
  { header: "SubTotal", key: "SubTotal", width: 15 },
  { header: "Impuesto", key: "Impuesto", width: 15 },
  { header: "Monto Total", key: "MontoTotal", width: 15 },
  { header: "Cuenta Contable", key: "CuentaContable", width: 20 },
  { header: "Dividir Monto", key: "DividirMonto", width: 15 },
  { header: "Tipo de Cambio (Transacción)", key: "TipoCambioTransaccion", width: 25 },
  { header: "Tipo de Cambio (Cuenta Contable)", key: "TipoCambioCuentaContable", width: 25 },
  { header: "Sucursal", key: "Sucursal", width: 20 },
  { header: "Departamento", key: "Departamento", width: 20 },
  { header: "Unidad de Negocio", key: "UnidadNegocio", width: 20 },
];

// ExcelJS is ~1 MB: load it only on this page, the first time it is needed.
export const loadExcelJS = () => import("exceljs").then((mod) => mod.default ?? mod);

export async function buildWorkbook(rows) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Comprobantes");
  worksheet.columns = COLUMNS;
  rows.forEach((row) => worksheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

const toReportError = (error) => {
  if (error instanceof InvoiceFileError) {
    return { code: error.code, message: error.message, hint: error.hint || null, details: error.details || null };
  }
  return {
    code: "UNEXPECTED_PARSE_ERROR",
    message: "Ocurrió un error inesperado al leer el comprobante.",
    hint: "Usa «Copiar reporte de errores» y envíalo a soporte junto con este XML.",
    details: { errorName: error.name, errorMessage: error.message },
  };
};

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Processes every file in the browser (nothing is uploaded). Same report shape the API used to return.
 * @param {File[]} files
 * @param {{ onProgress?: (done: number, total: number) => void }} options
 * @returns {Promise<{ excel: { blob: Blob, fileName: string } | null, report: object }>}
 */
export async function processInvoices(files, { onProgress = () => {} } = {}) {
  const rows = [];
  const entries = [];
  const seen = new Map();

  for (const [index, file] of files.entries()) {
    const entry = { index, fileName: file.name, status: "ok", error: null, warnings: [] };
    try {
      const { row, meta, warnings } = parseComprobante(new Uint8Array(await file.arrayBuffer()));
      Object.assign(entry, meta);
      entry.warnings = warnings;

      const identity = meta.clave || (meta.emisorId && meta.consecutivo ? `${meta.emisorId}-${meta.consecutivo}` : null);
      if (identity && seen.has(identity)) {
        entry.warnings.push({
          code: "DUPLICATE_DOCUMENT",
          message: `Este comprobante${meta.consecutivo ? ` (${meta.consecutivo})` : ""} es el mismo que el archivo "${seen.get(identity)}". Aparecerá dos veces en el Excel.`,
          hint: "Quita uno de los dos archivos si no quieres la fila duplicada.",
          details: { duplicateOf: seen.get(identity) },
        });
      } else if (identity) {
        seen.set(identity, file.name);
      }

      if (entry.warnings.length > 0) entry.status = "warning";
      rows.push(row);
    } catch (error) {
      entry.status = "error";
      entry.error = toReportError(error);
    }
    entries.push(entry);

    // Report progress and let the page repaint every 25 files: keeps big batches responsive
    // without re-rendering on every file.
    if ((index + 1) % 25 === 0 || index + 1 === files.length) {
      onProgress(index + 1, files.length);
      await yieldToBrowser();
    }
  }

  const failed = entries.filter((e) => e.status === "error").length;
  const report = {
    summary: {
      total: entries.length,
      processed: entries.length - failed,
      failed,
      withWarnings: entries.filter((e) => e.status === "warning").length,
    },
    files: entries,
  };

  if (rows.length === 0) return { excel: null, report };
  const buffer = await buildWorkbook(rows);
  return { excel: { blob: new Blob([buffer], { type: XLSX_MIME }), fileName: EXCEL_FILE_NAME }, report };
}
