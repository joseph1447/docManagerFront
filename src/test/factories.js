// Builders for tests. Response shapes mirror docManagerAPI POST /upload (see CLAUDE.md).
export const xmlFile = (name, content = "<FacturaElectronica/>", options = {}) =>
  new File([content], name, { type: "text/xml", lastModified: 1700000000000, ...options });

export const jsonResponse = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

export const okEntry = (index, fileName, extra = {}) => ({
  index,
  fileName,
  status: "ok",
  error: null,
  warnings: [],
  documentType: "FacturaElectronica",
  version: "4.4",
  consecutivo: `0010000101000000000${index}`,
  emisor: "Proveedor Demo S.A.",
  ...extra,
});

export const errorEntry = (index, fileName, code, message, hint = "Descarga el XML de nuevo.", details = null) => ({
  index,
  fileName,
  status: "error",
  error: { code, message, hint, details },
  warnings: [],
});

export const summarize = (files) => {
  const failed = files.filter((f) => f.status === "error").length;
  return {
    total: files.length,
    processed: files.length - failed,
    failed,
    withWarnings: files.filter((f) => f.status === "warning").length,
  };
};

export const successBody = (files, requestId = "req12345") => ({
  report: { summary: summarize(files), files },
  excel: {
    fileName: "facturas.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64: btoa("fake-xlsx"),
  },
  requestId,
});
