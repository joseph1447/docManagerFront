// Reads one Costa Rica electronic invoice (Hacienda XML) in the browser.
// Ported from docManagerAPI/services/facturaService.js: same codes, messages and Excel row.
// The row must stay identical to the original implementation (see excelCompat.test.js).

const SUPPORTED_DOCUMENTS = {
  FacturaElectronica: "FACT",
  TiqueteElectronico: "TIQ",
};

const ONLY_FACT_TIQ = "Por ahora el sistema solo procesa Facturas Electrónicas y Tiquetes Electrónicos.";

const UNSUPPORTED_DOCUMENTS = {
  MensajeHacienda: {
    message: "Este XML es la respuesta de Hacienda (aceptación o rechazo del comprobante), no la factura.",
    hint: "Con cada factura el proveedor suele enviar dos XML. Sube el de la factura y omite el de la respuesta de Hacienda.",
  },
  MensajeReceptor: {
    message: "Este XML es un mensaje de confirmación del receptor (aceptación o rechazo), no un comprobante.",
    hint: "Sube el XML de la factura o tiquete original.",
  },
  NotaCreditoElectronica: {
    message: `Este XML es una Nota de Crédito Electrónica. ${ONLY_FACT_TIQ}`,
    hint: "Registra la nota de crédito manualmente por ahora.",
  },
  NotaDebitoElectronica: {
    message: `Este XML es una Nota de Débito Electrónica. ${ONLY_FACT_TIQ}`,
    hint: "Registra la nota de débito manualmente por ahora.",
  },
  FacturaElectronicaCompra: {
    message: `Este XML es una Factura Electrónica de Compra. ${ONLY_FACT_TIQ}`,
    hint: "Registra este comprobante manualmente por ahora.",
  },
  FacturaElectronicaExportacion: {
    message: `Este XML es una Factura Electrónica de Exportación. ${ONLY_FACT_TIQ}`,
    hint: "Registra este comprobante manualmente por ahora.",
  },
};

const DOWNLOAD_AGAIN_HINT =
  "Descarga el XML de nuevo desde el correo o portal del proveedor. Si el problema continúa, pide al proveedor que lo reenvíe.";

// Each browser words XML errors differently (Chrome/Safari: libxml2, Firefox: localized, jsdom: saxes).
const PARSER_REASONS = [
  [/premature end|EndTag: '<\/' not found|no (root )?element found|unclosed|unexpected end|sin cerrar|no se encontr/i, "el archivo termina antes de tiempo (parece incompleto o cortado)"],
  [/tag mismatch|mismatched tag|unexpected close tag|sin pareja/i, "hay una etiqueta de cierre que no corresponde con la etiqueta abierta"],
  [/extra content|junk after|outside of root|basura/i, "hay contenido después del final del documento"],
  [/entity|EntityRef|entidad/i, "hay un carácter '&' o una entidad inválida"],
  [/start tag expected|document is empty|syntax error|before first tag|error de sintaxis/i, "el archivo no empieza como un XML"],
  [/attribute|atributo/i, "hay un atributo mal formado"],
];

const POSITION_PATTERNS = [
  /^\s*(\d+):(\d+):/m, // jsdom: "6:38: unclosed tag: Emisor"
  /line (\d+) at column (\d+)/i, // Chrome / Safari
  /(?:line number|n[uú]mero de l[ií]nea)\s*(\d+),\s*(?:column|columna)\s*(\d+)/i, // Firefox
];

export class InvoiceFileError extends Error {
  constructor(code, message, { hint, details } = {}) {
    super(message);
    this.name = "InvoiceFileError";
    this.code = code;
    this.hint = hint;
    this.details = details;
  }
}

export const describeParserError = (rawMessage) => {
  const raw = rawMessage.replace(/\s+/g, " ").trim();
  const position = POSITION_PATTERNS.map((pattern) => raw.match(pattern)).find(Boolean);
  const line = position ? Number(position[1]) : null;
  const column = position ? Number(position[2]) : null;
  const reason = PARSER_REASONS.find(([pattern]) => pattern.test(raw))?.[1] ?? "tiene un error de formato";
  const where = line ? ` (línea ${line}${column ? `, columna ${column}` : ""})` : "";
  return {
    message: `El archivo no es un XML válido${where}: ${reason}.`,
    details: { parserMessage: raw.slice(0, 300), line, column },
  };
};

const decodeBytes = (bytes) => {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes); // strips the UTF-8 BOM
};

const assertLooksLikeXml = (bytes, content) => {
  if (bytes.length === 0 || content.trim() === "") {
    throw new InvoiceFileError("EMPTY_FILE", "El archivo está vacío.", { hint: DOWNLOAD_AGAIN_HINT });
  }
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    throw new InvoiceFileError("NOT_XML", "El archivo tiene extensión .xml pero en realidad es un PDF.", {
      hint: "Sube el XML del comprobante, no el PDF.",
    });
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    throw new InvoiceFileError("NOT_XML", "El archivo es un comprimido (ZIP), no un XML.", {
      hint: "Descomprímelo y sube los XML que contiene.",
    });
  }
  if (/^\s*(<!doctype html|<html)/i.test(content)) {
    throw new InvoiceFileError("NOT_XML", "El archivo es una página web (HTML), no un comprobante XML.", {
      hint: "Probablemente se descargó una página de error del portal. " + DOWNLOAD_AGAIN_HINT,
    });
  }
};

const parseXml = (text) => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const error = doc.getElementsByTagName("parsererror")[0];
  if (error) {
    const { message, details } = describeParserError(error.textContent || "");
    throw new InvoiceFileError("INVALID_XML", message, { hint: DOWNLOAD_AGAIN_HINT, details });
  }
  return doc.documentElement;
};

// Same semantics as the original xml2js access `node["Name"]?.[0]`: first direct child element.
const child = (element, name) => {
  if (!element) return undefined;
  for (const node of element.children) {
    if (node.localName === name) return node;
  }
  return undefined;
};

// xml2js returned "" for empty / whitespace-only elements and the raw text otherwise.
const text = (element) => {
  if (!element) return undefined;
  const value = element.textContent;
  return value.trim() === "" ? "" : value;
};

const path = (element, ...names) => names.reduce((node, name) => child(node, name), element);

const resolveDocument = (root) => {
  const rootName = root.localName;
  if (SUPPORTED_DOCUMENTS[rootName]) return { rootName, tipoTransaccion: SUPPORTED_DOCUMENTS[rootName] };
  const known = UNSUPPORTED_DOCUMENTS[rootName];
  if (known) {
    throw new InvoiceFileError("UNSUPPORTED_DOCUMENT", known.message, { hint: known.hint, details: { rootElement: rootName } });
  }
  throw new InvoiceFileError(
    "UNSUPPORTED_DOCUMENT",
    `El XML no es un comprobante electrónico de Hacienda (su etiqueta principal es <${rootName}>).`,
    {
      hint: "Verifica que sea el XML de una factura o tiquete electrónico de Costa Rica.",
      details: { rootElement: rootName },
    }
  );
};

const toIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new InvoiceFileError("INVALID_DATE", `La fecha de emisión "${value}" no es una fecha válida.`, {
      hint: "Revisa la etiqueta <FechaEmision> del XML o pide al proveedor que reenvíe el comprobante.",
      details: { field: "FechaEmision", value },
    });
  }
  // Known issue kept on purpose (identical to the original): UTC date, so invoices issued after
  // 18:00 Costa Rica time show the next day. See CLAUDE.md.
  return date.toISOString().split("T")[0];
};

const REQUIRED_FIELDS = [
  ["NumeroConsecutivo", ["NumeroConsecutivo"]],
  ["FechaEmision", ["FechaEmision"]],
  ["Emisor/Nombre", ["Emisor", "Nombre"]],
  ["ResumenFactura/TotalComprobante", ["ResumenFactura", "TotalComprobante"]],
];

const NUMERIC_FIELDS = [
  ["ResumenFactura/TotalComprobante", ["ResumenFactura", "TotalComprobante"]],
  ["ResumenFactura/TotalImpuesto", ["ResumenFactura", "TotalImpuesto"]],
  ["ResumenFactura/CodigoTipoMoneda/TipoCambio", ["ResumenFactura", "CodigoTipoMoneda", "TipoCambio"]],
];

const collectWarnings = (root) => {
  const warnings = [];
  const missing = REQUIRED_FIELDS.filter(([, names]) => !text(path(root, ...names))).map(([field]) => field);
  if (missing.length > 0) {
    warnings.push({
      code: "MISSING_FIELDS",
      message: `Faltan datos en el XML: ${missing.join(", ")}. La fila se generó con esas columnas vacías o en 0.`,
      hint: "Revisa esa fila en el Excel antes de usarla.",
      details: { fields: missing },
    });
  }
  for (const [field, names] of NUMERIC_FIELDS) {
    const value = text(path(root, ...names));
    if (value && Number.isNaN(parseFloat(value))) {
      warnings.push({
        code: "INVALID_AMOUNT",
        message: `El valor "${value}" en ${field} no es un número.`,
        hint: "Revisa ese monto en el Excel.",
        details: { field, value },
      });
    }
  }
  return warnings;
};

const buildRow = (root, tipoTransaccion) => {
  const fechaEmision = toIsoDate(text(child(root, "FechaEmision")));
  const totalImpuesto = parseFloat(text(path(root, "ResumenFactura", "TotalImpuesto")) || "0");
  const totalComprobante = parseFloat(text(path(root, "ResumenFactura", "TotalComprobante")) || "0");
  const subTotal = totalComprobante - totalImpuesto;
  const tipoCambio = parseFloat(text(path(root, "ResumenFactura", "CodigoTipoMoneda", "TipoCambio")) || "1");

  return {
    NoFactura: text(child(root, "NumeroConsecutivo")),
    TipoTransaccion: tipoTransaccion,
    Proveedor: text(path(root, "Emisor", "Nombre")),
    GrupoFacturacion:
      text(path(root, "ResumenFactura", "CodigoTipoMoneda", "CodigoMoneda")) === "USD"
        ? "Proveedores Locales (USD)"
        : "Proveedores Locales (CRC)",
    TerminoPago: "Contado",
    Fecha: fechaEmision,
    Descripcion: text(path(root, "DetalleServicio", "LineaDetalle", "Detalle"))?.replace("null-", "") || "",
    SubTotal: subTotal,
    Impuesto: totalImpuesto,
    MontoTotal: totalComprobante,
    DividirMonto: subTotal,
    CuentaContable: "600-001-007-003",
    TipoCambioTransaccion: tipoCambio,
    TipoCambioCuentaContable: tipoCambio,
    Sucursal: "",
    Departamento: "",
    UnidadNegocio: "",
  };
};

/**
 * @param {Uint8Array} bytes file content
 * @returns {{ row: object, meta: object, warnings: object[] }} or throws InvoiceFileError
 */
export function parseComprobante(bytes) {
  const content = decodeBytes(bytes);
  assertLooksLikeXml(bytes, content);
  const root = parseXml(content);
  const { rootName, tipoTransaccion } = resolveDocument(root);
  const row = buildRow(root, tipoTransaccion);
  const meta = {
    documentType: rootName,
    version: root.namespaceURI?.match(/\/v(\d+(?:\.\d+)*)\//)?.[1] ?? null,
    clave: text(child(root, "Clave")) || null,
    consecutivo: row.NoFactura || null,
    emisor: row.Proveedor || null,
    emisorId: text(path(root, "Emisor", "Identificacion", "Numero")) || null,
  };
  return { row, meta, warnings: collectWarnings(root) };
}
