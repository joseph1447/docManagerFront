// Client for POST /upload of docManagerAPI. Contract documented in CLAUDE.md.
// No limit on the number of files; only a per-file sanity limit (same as the API).
export const MAX_FILE_SIZE_MB = 20;
export const EXCEL_FILE_NAME = "resultado.xlsx";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// The server is confirmed awake before uploading (wakeUpServer), so this only covers upload +
// processing. 190 invoices take ~7 s on Render; the margin is for slow connections.
export const timeoutFor = (fileCount) => 60_000 + fileCount * 500;
export const WAKE_UP_TIMEOUT_MS = 90_000;
const RETRYABLE_CODES = new Set(["NETWORK_ERROR", "TIMEOUT", "SERVER_UNAVAILABLE"]);

const RETRY_HINT = "Intenta de nuevo. Si continúa, usa «Copiar reporte» y envíalo a soporte.";
const WAKE_UP_HINT =
  "Si el servidor estaba inactivo puede tardar hasta un minuto en despertar. Espera unos segundos e intenta de nuevo.";

export class UploadError extends Error {
  constructor({ code, message, hint = null, status = null, requestId = null, report = null, details = null, fileName = null }) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.hint = hint;
    this.status = status;
    this.requestId = requestId;
    this.report = report;
    this.details = details;
    this.fileName = fileName;
  }
}

const base64ToBlob = (base64, mimeType = XLSX_MIME) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
};

const errorForStatus = (status) => {
  if ([502, 503, 504].includes(status)) {
    return { code: "SERVER_UNAVAILABLE", message: `El servidor no está disponible en este momento (HTTP ${status}).`, hint: WAKE_UP_HINT };
  }
  if (status === 404) {
    return { code: "ENDPOINT_NOT_FOUND", message: "El servidor no reconoce la ruta de carga (HTTP 404).", hint: "Puede que la API no esté actualizada. Avisa al equipo de desarrollo." };
  }
  return { code: "UNEXPECTED_RESPONSE", message: `El servidor respondió de forma inesperada (HTTP ${status}).`, hint: RETRY_HINT };
};

/**
 * Sends the XML files and returns { excel: { blob, fileName }, report, requestId }.
 * `report` is null when the API is older than the per-file report (it only returns the .xlsx).
 * Throws UploadError with a user-facing message, a hint and technical details.
 */
export async function uploadXmlFiles(files, { baseUrl = import.meta.env.VITE_API_URL, fetchImpl = globalThis.fetch, timeoutMs = timeoutFor(files.length) } = {}) {
  if (!baseUrl) {
    throw new UploadError({
      code: "CONFIG_MISSING_API_URL",
      message: "La aplicación no tiene configurada la dirección del servidor (VITE_API_URL).",
      hint: "Es un problema de configuración del sitio: avisa al equipo de desarrollo.",
    });
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/upload`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new UploadError({
          code: "TIMEOUT",
          message: `El servidor no respondió en ${Math.round(timeoutMs / 1000)} segundos.`,
          hint: `${WAKE_UP_HINT} Si la conexión es lenta, intenta de nuevo o divide los archivos en dos cargas.`,
        });
      }
      throw new UploadError({
        code: "NETWORK_ERROR",
        message: "No se pudo conectar con el servidor.",
        hint: `Revisa tu conexión a internet. ${WAKE_UP_HINT}`,
        details: { reason: error.message, url: `${baseUrl}/upload` },
      });
    }

    const requestId = response.headers.get("X-Request-Id");
    const contentType = response.headers.get("Content-Type") || "";

    if (response.ok && contentType.includes("spreadsheetml")) {
      return { excel: { blob: await response.blob(), fileName: EXCEL_FILE_NAME }, report: null, requestId };
    }

    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }

    if (response.ok && body?.excel?.base64) {
      return {
        excel: { blob: base64ToBlob(body.excel.base64, body.excel.mimeType), fileName: EXCEL_FILE_NAME },
        report: body.report ?? null,
        requestId: body.requestId ?? requestId,
      };
    }

    const fallback = errorForStatus(response.status);
    // Older API versions answer { error: "text" }; current ones { error: { code, message, hint } }.
    const apiError = typeof body?.error === "string" ? { message: body.error } : body?.error;
    throw new UploadError({
      code: apiError?.code || fallback.code,
      message: apiError?.message || fallback.message,
      hint: apiError?.hint || fallback.hint,
      status: response.status,
      requestId: body?.requestId ?? requestId,
      report: body?.report ?? null,
      details: apiError?.details ?? (body ? null : { responseStart: text.slice(0, 300) }),
      fileName: apiError?.fileName ?? null,
    });
  } catch (error) {
    if (error instanceof UploadError) throw error;
    throw new UploadError({
      code: "CLIENT_ERROR",
      message: "Ocurrió un error inesperado al leer la respuesta del servidor.",
      hint: RETRY_HINT,
      details: { reason: error.message },
    });
  } finally {
    clearTimeout(timer);
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The API runs on Render's free plan, which sleeps after 15 min idle and takes up to a minute to
 * wake up. A big multipart POST sent while it wakes can be lost and hang until the timeout, so we
 * wait for a light GET / to answer first. Retries until `timeoutMs`.
 */
export async function wakeUpServer(baseUrl = import.meta.env.VITE_API_URL, { fetchImpl = globalThis.fetch, timeoutMs = WAKE_UP_TIMEOUT_MS, retryDelayMs = 3_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, deadline - Date.now()));
    try {
      const response = await fetchImpl(`${baseUrl}/`, { signal: controller.signal });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    } finally {
      clearTimeout(timer);
    }
    if (Date.now() + retryDelayMs < deadline) await wait(retryDelayMs);
    else break;
  }
  throw new UploadError({
    code: "SERVER_UNAVAILABLE",
    message: `El servidor no respondió en ${Math.round(timeoutMs / 1000)} segundos.`,
    hint: "Puede estar caído o en mantenimiento, o tu conexión a internet falló. Intenta de nuevo en unos minutos; si continúa, usa «Copiar reporte» y envíalo a soporte.",
    details: { reason: lastError, url: `${baseUrl}/` },
  });
}

/**
 * Wakes the server, uploads, and retries once on network errors/timeouts (processing is
 * stateless, so repeating it is safe). onPhase receives "waking" | "uploading" | "retrying".
 */
export async function processXmlFiles(files, { baseUrl = import.meta.env.VITE_API_URL, fetchImpl = globalThis.fetch, onPhase = () => {}, retries = 1, wakeTimeoutMs, retryDelayMs, timeoutMs } = {}) {
  for (let attempt = 0; ; attempt++) {
    onPhase(attempt === 0 ? "waking" : "retrying");
    if (baseUrl) await wakeUpServer(baseUrl, { fetchImpl, timeoutMs: wakeTimeoutMs, retryDelayMs });
    onPhase("uploading");
    try {
      return await uploadXmlFiles(files, { baseUrl, fetchImpl, timeoutMs });
    } catch (error) {
      if (attempt < retries && RETRYABLE_CODES.has(error.code)) continue;
      error.details = { ...error.details, attempts: attempt + 1 };
      throw error;
    }
  }
}