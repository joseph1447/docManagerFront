import { MAX_FILES, MAX_FILE_SIZE_MB } from "./uploadXmlFiles";

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
      `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${MAX_FILE_SIZE_MB} MB.`,
      "Un XML de factura normalmente pesa menos de 1 MB; verifica que sea el archivo correcto."
    );
  }
  return null;
};

/**
 * Merges newly dropped files into the list. Files that fail local checks are kept in the list
 * with status "error" (so the user sees why) but are never sent to the server.
 * @returns {{ items: object[], notices: string[] }}
 */
export function addFiles(items, acceptedFiles, rejectedFiles = []) {
  const next = [...items];
  const notices = [];
  const ids = new Set(items.map((item) => item.id));

  const push = (file, error) => {
    const id = fileId(file);
    if (ids.has(id)) {
      notices.push(`"${file.name}" ya estaba en la lista; no se agregó de nuevo.`);
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

  const sendable = next.filter((item) => item.origin !== "client");
  if (sendable.length > MAX_FILES) {
    const overflow = new Set(sendable.slice(MAX_FILES).map((item) => item.id));
    notices.push(`Se pueden procesar máximo ${MAX_FILES} archivos por carga; se ignoraron ${overflow.size}. Procésalos en otro grupo.`);
    return { items: next.filter((item) => !overflow.has(item.id)), notices };
  }

  return { items: next, notices };
}

export const sendableItems = (items) => items.filter((item) => item.origin !== "client");

/**
 * Applies the API per-file report to the items that were sent (report.files[i].index = position sent).
 */
export function applyReport(items, sentIds, report) {
  if (!report?.files) return items;
  const byId = new Map();
  report.files.forEach((entry) => {
    const id = sentIds[entry.index];
    if (id) byId.set(id, entry);
  });
  return items.map((item) => {
    const entry = byId.get(item.id);
    if (!entry) return item;
    return {
      ...item,
      status: entry.status,
      origin: "server",
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

export const markSent = (items, sentIds, status) =>
  items.map((item) => (sentIds.includes(item.id) ? { ...item, status, origin: null, error: null, warnings: [], meta: null } : item));

export const formatSize = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
