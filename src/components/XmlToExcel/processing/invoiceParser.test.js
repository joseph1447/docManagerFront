import { describe, it, expect } from "vitest";
import { parseComprobante, describeParserError } from "./invoiceParser";
import { fixtureBytes } from "../../../test/factories";

const bytes = (content) => (typeof content === "string" ? new TextEncoder().encode(content) : new Uint8Array(content));

const outcome = (input) => {
  try {
    const { warnings } = parseComprobante(input);
    return warnings.length ? { status: "warning", warnings } : { status: "ok" };
  } catch (error) {
    return { status: "error", error };
  }
};

// Add a row here (and the anonymized XML in src/test/fixtures) for every failing file users report.
const CASES = [
  { fixture: "valid-factura-v43-crc.xml", status: "ok" },
  { fixture: "valid-factura-v44-usd.xml", status: "ok" },
  { fixture: "valid-tiquete-v44.xml", status: "ok" },
  { fixture: "campos-faltantes.xml", status: "warning", code: "MISSING_FIELDS", message: /NumeroConsecutivo, Emisor\/Nombre/ },
  { fixture: "monto-invalido.xml", status: "warning", code: "INVALID_AMOUNT", message: /"ciento trece".*TotalComprobante/ },
  { fixture: "vacio.xml", status: "error", code: "EMPTY_FILE", message: /vacío/ },
  { fixture: "malformada-cortada.xml", status: "error", code: "INVALID_XML", message: /línea 6, columna 38.*incompleto o cortado/ },
  { fixture: "malformada-etiqueta.xml", status: "error", code: "INVALID_XML", message: /línea 3.*etiqueta de cierre/ },
  { fixture: "fecha-invalida.xml", status: "error", code: "INVALID_DATE", message: /"15\/03\/2024"/ },
  { fixture: "mensaje-hacienda.xml", status: "error", code: "UNSUPPORTED_DOCUMENT", message: /respuesta de Hacienda/ },
  { fixture: "nota-credito.xml", status: "error", code: "UNSUPPORTED_DOCUMENT", message: /Nota de Crédito/ },
  { fixture: "no-es-comprobante.xml", status: "error", code: "UNSUPPORTED_DOCUMENT", message: /<catalogo>/ },
];

describe("parseComprobante: one outcome per fixture", () => {
  for (const { fixture, status, code, message } of CASES) {
    it(`${fixture} -> ${status}${code ? ` (${code})` : ""}`, () => {
      const result = outcome(fixtureBytes(fixture));
      expect(result.status).toBe(status);
      if (status === "error") {
        expect(result.error.code).toBe(code);
        expect(result.error.message).toMatch(message);
        expect(result.error.hint, "every error must tell the user how to fix it").toBeTruthy();
      }
      if (status === "warning") {
        const warning = result.warnings.find((w) => w.code === code);
        expect(warning, `expected warning ${code}`).toBeTruthy();
        expect(warning.message).toMatch(message);
      }
    });
  }
});

describe("parseComprobante: content sniffing and encodings", () => {
  it("PDF renamed to .xml", () => {
    expect(outcome(bytes("%PDF-1.7\n binary")).error).toMatchObject({ code: "NOT_XML", message: expect.stringMatching(/PDF/) });
  });

  it("ZIP renamed to .xml", () => {
    expect(outcome(bytes([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])).error).toMatchObject({ code: "NOT_XML", message: expect.stringMatching(/ZIP/) });
  });

  it("HTML error page saved as .xml", () => {
    expect(outcome(bytes("<!DOCTYPE html><html><body>Sesión expirada</body></html>")).error).toMatchObject({ code: "NOT_XML" });
  });

  it("UTF-8 BOM is accepted", () => {
    const xml = fixtureBytes("valid-factura-v43-crc.xml");
    expect(outcome(new Uint8Array([0xef, 0xbb, 0xbf, ...xml])).status).toBe("ok");
  });

  it("UTF-16 LE file is decoded", () => {
    const xml = new TextDecoder().decode(fixtureBytes("valid-tiquete-v44.xml")).replace('encoding="utf-8"', 'encoding="utf-16"');
    const utf16 = new Uint8Array(2 + xml.length * 2);
    utf16.set([0xff, 0xfe]);
    for (let i = 0; i < xml.length; i++) {
      utf16[2 + i * 2] = xml.charCodeAt(i) & 0xff;
      utf16[3 + i * 2] = xml.charCodeAt(i) >> 8;
    }
    expect(parseComprobante(utf16).meta.consecutivo).toBe("00100001040000000789");
  });

  it("accepts a namespace prefix on the root (fe:FacturaElectronica)", () => {
    const xml = new TextDecoder()
      .decode(fixtureBytes("valid-tiquete-v44.xml"))
      .replace(/<(\/?)([A-Za-z])/g, "<$1fe:$2")
      .replace("<fe:?xml", "<?xml")
      .replace('xmlns="', 'xmlns:fe="');
    expect(parseComprobante(bytes(xml)).row.NoFactura).toBe("00100001040000000789");
  });
});

describe("describeParserError: real messages from each browser engine", () => {
  // Captured with Playwright from the malformed fixtures (2026-10).
  const MESSAGES = [
    ["Chrome/Safari truncated", "This page contains the following errors:error on line 6 at column 39: Premature end of data in tag Emisor line 5 Below is a rendering of the page up to the first error.", 6, 39, /incompleto o cortado/],
    ["Chrome/Safari mismatch", "This page contains the following errors:error on line 3 at column 56: Opening and ending tag mismatch: NumeroConsecutivo line 3 and Consecutivo", 3, 56, /etiqueta de cierre/],
    ["Firefox truncated", "XML Parsing Error: no root element found Location: about:blank Line Number 6, Column 39: <Nombre>", 6, 39, /incompleto o cortado/],
    ["Firefox mismatch", "XML Parsing Error: mismatched tag. Expected: </NumeroConsecutivo>. Location: about:blank Line Number 3, Column 44:", 3, 44, /etiqueta de cierre/],
    ["Firefox in Spanish", "Error de lectura XML: etiqueta sin pareja. Se esperaba: </NumeroConsecutivo>. Ubicación: about:blank Número de línea 3, columna 44:", 3, 44, /etiqueta de cierre/],
    ["jsdom", "6:38: unclosed tag: Emisor", 6, 38, /incompleto o cortado/],
  ];
  for (const [engine, raw, line, column, reason] of MESSAGES) {
    it(engine, () => {
      const { message, details } = describeParserError(raw);
      expect(details).toMatchObject({ line, column });
      expect(message).toContain(`(línea ${line}, columna ${column})`);
      expect(message).toMatch(reason);
    });
  }

  it("unknown wording still gives a useful message", () => {
    expect(describeParserError("something odd").message).toBe("El archivo no es un XML válido: tiene un error de formato.");
  });
});

describe("parseComprobante: metadata for the UI", () => {
  it("returns document type, version, consecutivo, emisor and clave", () => {
    const { meta } = parseComprobante(fixtureBytes("valid-factura-v44-usd.xml"));
    expect(meta).toEqual({
      documentType: "FacturaElectronica",
      version: "4.4",
      clave: "50630112500310100000200100001010000004567100000002",
      consecutivo: "00100001010000004567",
      emisor: "Importadora Ejemplo Ltda.",
      emisorId: "3102000002",
    });
  });

  it("an element with attributes no longer breaks the file (the original crashed on .replace)", () => {
    const xml = new TextDecoder()
      .decode(fixtureBytes("valid-factura-v43-crc.xml"))
      .replace("<Detalle>Servicio de limpieza</Detalle>", '<Detalle lang="es">Servicio de limpieza</Detalle>');
    expect(parseComprobante(bytes(xml)).row.Descripcion).toBe("Servicio de limpieza");
  });
});
