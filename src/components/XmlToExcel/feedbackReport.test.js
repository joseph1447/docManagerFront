import { it, expect } from "vitest";
import { buildFeedbackReport } from "./feedbackReport";
import { addFiles, applyReport, sendableItems } from "./fileSelection";
import { xmlFile, okEntry, errorEntry } from "../../test/factories";

it("includes everything a developer needs to reproduce each failure", () => {
  const { items } = addFiles([], [xmlFile("vacio.xml", ""), xmlFile("ok.xml"), xmlFile("cortada.xml")]);
  const sentIds = sendableItems(items).map((i) => i.id);
  const updated = applyReport(items, sentIds, {
    files: [
      okEntry(0, "ok.xml"),
      errorEntry(1, "cortada.xml", "INVALID_XML", "El archivo no es un XML válido (línea 6, columna 38)", "Descárgalo de nuevo.", { line: 6, column: 38 }),
    ],
  });

  const text = buildFeedbackReport({
    items: updated,
    lastRun: { summary: { total: 2, processed: 1, failed: 1, withWarnings: 0 }, requestId: "abc123" },
    apiUrl: "https://api.test",
    now: new Date("2026-10-12T15:00:00Z"),
    userAgent: "TestBrowser/1.0",
  });

  expect(text).toContain("Fecha: 2026-10-12T15:00:00.000Z");
  expect(text).toContain("Servidor: https://api.test");
  expect(text).toContain("Request ID: abc123");
  expect(text).toContain("Resultado: 1 de 2 procesados, 1 con error, 0 con advertencias");
  expect(text).toContain("vacio.xml (0 B) — ERROR (detectado en el navegador, no se envió)");
  expect(text).toContain("[EMPTY_FILE]");
  expect(text).toContain("cortada.xml");
  expect(text).toContain("[INVALID_XML] El archivo no es un XML válido (línea 6, columna 38)");
  expect(text).toContain("Cómo resolverlo: Descárgalo de nuevo.");
  expect(text).toContain('Detalle técnico: {"line":6,"column":38}');
  expect(text).not.toContain("ok.xml (");
  expect(text).toContain("Navegador: TestBrowser/1.0");
});

it("reports a global error (e.g. network) with its HTTP status", () => {
  const text = buildFeedbackReport({
    items: [],
    lastRun: { error: { code: "SERVER_UNAVAILABLE", message: "El servidor no está disponible (HTTP 503).", hint: "Espera.", status: 503, details: null } },
    apiUrl: "https://api.test",
  });
  expect(text).toContain("Error general (HTTP 503):");
  expect(text).toContain("[SERVER_UNAVAILABLE] El servidor no está disponible (HTTP 503).");
});
