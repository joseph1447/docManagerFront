// Files are processed in the browser, so there is no count limit. This only stops a huge file
// added by mistake from freezing the tab (an invoice XML weighs a few KB).
export const MAX_FILE_SIZE_MB = 50;

const fileId = (file) => `${file.name}::${file.size}::${file.lastModified}`;

const clientError = (code, message, hint) => ({ code, message, hint, details: null });

const DROPZONE_ERRORS = {
  "file-invalid-type": () =>
    clientError("NOT_XML_EXTENSION", "No es un archivo .xml.", "Sube solo los XML de facturas o tiquetes electrónicos (no PDF, imágenes ni ZIP)."),
};

const newItem = (file, error = null) => ({
  id: fileId(file),
  file,
  name: file.name,
  size: file.size,
  status: error ? "error" : "pending",
  origin: error ? "client" : null,
  error,
  warnings: [],
  meta: null,
});

const validateFile = (file) => {
  if (file.size === 0) {
    return clientError("EMPTY_FILE", "El archivo está vacío (0 bytes).", "Descarga el XML de nuevo desde el correo o portal del proveedor.");
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return clientError(
      "FILE_TOO_LARGE",
      `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; es demasiado grande para ser una factura (máximo ${MAX_FILE_SIZE_MB} MB).`,
      "Un XML de factura pesa unos pocos KB; verifica que sea el archivo correcto."
    );
  }
  return null;
};

/**
 * Merges newly dropped files into the list. Files that fail local checks are kept in the list
 * with status "error" (so the user sees why) but are never processed.
 * @returns {{ items: object[], notices: string[] }}
 */
export function addFiles(items, acceptedFiles, rejectedFiles = []) {
  const next = [...items];
  const duplicates = [];
  const ids = new Set(items.map((item) => item.id));

  const push = (file, error) => {
    const id = fileId(file);
    if (ids.has(id)) {
      duplicates.push(file.name);
      return;
    }
    ids.add(id);
    next.push(newItem(file, error));
  };

  acceptedFiles.forEach((file) => push(file, validateFile(file)));
  rejectedFiles.forEach(({ file, errors }) => {
    const known = errors.map((e) => DROPZONE_ERRORS[e.code]).find(Boolean);
    push(file, known ? known() : clientError("REJECTED", errors.map((e) => e.message).join(" "), null));
  });

  const notices = [];
  if (duplicates.length === 1) notices.push(`"${duplicates[0]}" ya estaba en la lista; no se agregó de nuevo.`);
  if (duplicates.length > 1) notices.push(`${duplicates.length} archivos ya estaban en la lista; no se agregaron de nuevo.`);
  return { items: next, notices };
}

export const sendableItems = (items) => items.filter((item) => item.origin !== "client");

/**
 * Applies the per-file report to the items that were processed (report.files[i].index = position in the batch).
 */
export function applyReport(items, processedIds, report) {
  if (!report?.files) return items;
  const byId = new Map();
  report.files.forEach((entry) => {
    const id = processedIds[entry.index];
    if (id) byId.set(id, entry);
  });
  return items.map((item) => {
    const entry = byId.get(item.id);
    if (!entry) return item;
    return {
      ...item,
      status: entry.status,
      origin: "processed",
      error: entry.error ?? null,
      warnings: entry.warnings ?? [],
      meta: {
        documentType: entry.documentType ?? null,
        version: entry.version ?? null,
        consecutivo: entry.consecutivo ?? null,
        emisor: entry.emisor ?? null,
      },
    };
  });
}

export const markSent = (items, ids, status) =>
  items.map((item) => (ids.includes(item.id) ? { ...item, status, origin: null, error: null, warnings: [], meta: null } : item));

export const formatSize = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
