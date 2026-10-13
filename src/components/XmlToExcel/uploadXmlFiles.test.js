import { describe, it, expect, vi } from "vitest";
import { uploadXmlFiles, UploadError } from "./uploadXmlFiles";
import { xmlFile, jsonResponse, okEntry, errorEntry, successBody, summarize } from "../../test/factories";

const BASE = "http://api.test";
const files = [xmlFile("a.xml"), xmlFile("b.xml")];

const callWith = (response) => uploadXmlFiles(files, { baseUrl: BASE, fetchImpl: vi.fn().mockResolvedValue(response) });

const expectUploadError = async (promise, expected) => {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(UploadError);
  expect(error).toMatchObject(expected);
  expect(error.hint).toBeTruthy();
  return error;
};

describe("uploadXmlFiles", () => {
  it("posts every file in the 'files' field asking for the JSON contract", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(successBody([okEntry(0, "a.xml"), okEntry(1, "b.xml")])));
    await uploadXmlFiles(files, { baseUrl: BASE, fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${BASE}/upload`);
    expect(init.method).toBe("POST");
    expect(init.headers.Accept).toBe("application/json");
    expect(init.body.getAll("files").map((f) => f.name)).toEqual(["a.xml", "b.xml"]);
  });

  it("returns the per-file report and the Excel as a Blob", async () => {
    const entries = [okEntry(0, "a.xml"), errorEntry(1, "b.xml", "INVALID_XML", "El archivo no es un XML válido")];
    const result = await callWith(jsonResponse(successBody(entries, "abc123")));

    expect(result.report.files).toEqual(entries);
    expect(result.requestId).toBe("abc123");
    expect(result.excel.fileName).toBe("resultado.xlsx");
    expect(result.excel.blob.size).toBe("fake-xlsx".length);
    expect(result.excel.blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  it("still works with the old API that only returns the .xlsx binary (report = null)", async () => {
    const xlsx = new Response("binary", {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    });
    const result = await callWith(xlsx);
    expect(result.report).toBeNull();
    expect(result.excel.blob).toBeTruthy();
  });

  it("422: exposes the API code, message and per-file report", async () => {
    const entries = [errorEntry(0, "a.xml", "EMPTY_FILE", "El archivo está vacío."), errorEntry(1, "b.xml", "UNSUPPORTED_DOCUMENT", "Es la respuesta de Hacienda")];
    const body = {
      error: { code: "NO_VALID_FILES", message: "Ninguno de los 2 archivos se pudo procesar.", hint: "Revisa cada archivo." },
      report: { summary: summarize(entries), files: entries },
      requestId: "r422",
    };
    const error = await expectUploadError(callWith(jsonResponse(body, 422)), {
      code: "NO_VALID_FILES",
      status: 422,
      requestId: "r422",
      message: "Ninguno de los 2 archivos se pudo procesar.",
    });
    expect(error.report.files.map((f) => f.fileName)).toEqual(["a.xml", "b.xml"]);
  });

  it("413 FILE_TOO_LARGE keeps the offending file name", async () => {
    const body = { error: { code: "FILE_TOO_LARGE", message: 'El archivo "b.xml" supera el límite de 5 MB.', hint: "x", fileName: "b.xml" } };
    await expectUploadError(callWith(jsonResponse(body, 413)), { code: "FILE_TOO_LARGE", fileName: "b.xml", status: 413 });
  });

  it("old API error format { error: 'texto' } is shown as is", async () => {
    await expectUploadError(callWith(jsonResponse({ error: "Error interno del servidor." }, 500)), {
      code: "UNEXPECTED_RESPONSE",
      message: "Error interno del servidor.",
      status: 500,
    });
  });

  it("HTML 502/503 from the host (server asleep or deploying) -> SERVER_UNAVAILABLE", async () => {
    const html = new Response("<html><body>Bad Gateway</body></html>", { status: 502, headers: { "Content-Type": "text/html" } });
    const error = await expectUploadError(callWith(html), { code: "SERVER_UNAVAILABLE", status: 502 });
    expect(error.details.responseStart).toContain("Bad Gateway");
  });

  it("HTML 404 -> ENDPOINT_NOT_FOUND", async () => {
    const html = new Response("<h1>Eror 404 Not Found</h1>", { status: 404, headers: { "Content-Type": "text/html" } });
    await expectUploadError(callWith(html), { code: "ENDPOINT_NOT_FOUND", status: 404 });
  });

  it("network failure / CORS -> NETWORK_ERROR with the URL that failed", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await expectUploadError(uploadXmlFiles(files, { baseUrl: BASE, fetchImpl }), { code: "NETWORK_ERROR" });
    expect(error.details).toEqual({ reason: "Failed to fetch", url: `${BASE}/upload` });
  });

  it("aborts after the timeout -> TIMEOUT", async () => {
    const fetchImpl = vi.fn((url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
    );
    await expectUploadError(uploadXmlFiles(files, { baseUrl: BASE, fetchImpl, timeoutMs: 10 }), { code: "TIMEOUT" });
  });

  it("missing VITE_API_URL -> CONFIG_MISSING_API_URL without calling fetch", async () => {
    const fetchImpl = vi.fn();
    await expectUploadError(uploadXmlFiles(files, { baseUrl: "", fetchImpl }), { code: "CONFIG_MISSING_API_URL" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
