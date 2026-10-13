import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

/** Reads the "Comprobantes" sheet of a generated Excel (Blob, ArrayBuffer or Buffer). */
export const readWorkbook = async (source) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(source instanceof Blob ? await source.arrayBuffer() : source);
  const sheet = workbook.getWorksheet("Comprobantes");
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) rows.push(row.values.slice(1));
  });
  return { sheetNames: workbook.worksheets.map((ws) => ws.name), headers: sheet.getRow(1).values.slice(1), rows };
};

// XML fixtures: synthetic Hacienda documents (fake data). Add the anonymized XML of every
// failing file a user reports, plus a row in invoiceParser.test.js.
export const FIXTURES_DIR = path.resolve("src/test/fixtures"); // vitest runs from the project root
export const fixturePath = (name) => path.join(FIXTURES_DIR, name);
export const fixtureBytes = (name) => new Uint8Array(fs.readFileSync(fixturePath(name)));
export const allFixtures = () => fs.readdirSync(FIXTURES_DIR).filter((name) => name.endsWith(".xml")).sort();

export const xmlFile = (name, content = "<FacturaElectronica/>", options = {}) =>
  new File([content], name, { type: "text/xml", lastModified: 1700000000000, ...options });

export const fixtureFile = (name, asName = name) => xmlFile(asName, fixtureBytes(name));

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
