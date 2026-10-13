import { it, expect } from "vitest";
import { buildFeedbackReport } from "./feedbackReport";
import { addFiles, applyReport, sendableItems } from "./fileSelection";
import { xmlFile, okEntry, errorEntry } from "../../test/factories";

it("includes everything a developer needs to reproduce each failure", () => {
  const { items } = addFiles([], [xmlFile("vacio.xml", ""), xmlFile("ok.xml"), xmlFile("cortada.xml")]);
  const processedIds = sendableItems(items).map((i) => i.id);
  const updated = applyReport(items, processedIds, {
    files: [
      okEntry(0, "ok.xml"),
      errorEntry(1, "cortada.xml", "INVALID_XML", "El archivo no es un XML válido (línea 6, columna 38)", "Descárgalo de nuevo.", { line: 6, column: 38 }),
    ],
  });

  const text = buildFeedbackReport({
    items: updated,
    lastRun: { summary: { total: 2, processed: 1, failed: 1, withWarnings: 0 } },
    now: new Date("2026-10-12T15:00:00Z"),
    userAgent: "TestBrowser/1.0",
    appVersion: "abc1234",
  });

  expect(text).toContain("Fecha: 2026-10-12T15:00:00.000Z");
  expect(text).toContain("Versión: abc1234 (procesado en el navegador)");
  expect(text).toContain("Resultado: 1 de 2 procesados, 1 con error, 0 con advertencias");
  expect(text).toContain("vacio.xml (0 B) — ERROR (detectado al agregarlo, no se procesó)");
  expect(text).toContain("[EMPTY_FILE]");
  expect(text).toContain("[INVALID_XML] El archivo no es un XML válido (línea 6, columna 38)");
  expect(text).toContain("Cómo resolverlo: Descárgalo de nuevo.");
  expect(text).toContain('Detalle técnico: {"line":6,"column":38}');
  expect(text).not.toContain("ok.xml (");
  expect(text).toContain("Navegador: TestBrowser/1.0");
});

it("reports a general error (e.g. the Excel library failed to load)", () => {
  const text = buildFeedbackReport({
    items: [],
    lastRun: {
      error: {
        code: "EXCEL_GENERATION_FAILED",
        message: "No se pudo generar el Excel en el navegador.",
        hint: "Recarga la página.",
        details: { errorMessage: "Failed to fetch dynamically imported module" },
      },
    },
  });
  expect(text).toContain("Error general:");
  expect(text).toContain("[EXCEL_GENERATION_FAILED] No se pudo generar el Excel en el navegador.");
  expect(text).toContain("Failed to fetch dynamically imported module");
});
