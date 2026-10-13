// Golden master: the Excel the client receives must be exactly what the original implementation
// (xml2js on the server, frozen in src/test/legacy) produced, now that processing runs in the browser.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import { processInvoices, COLUMNS } from "./processInvoices";
import { allFixtures, fixtureFile, fixturePath, readWorkbook } from "../../../test/factories";

const require = createRequire(import.meta.url);
const legacy = require("../../../test/legacy/facturaService.legacy.cjs");

const legacyRows = async (names) => {
  try {
    const buffer = await legacy.processInvoices(names.map((name) => ({ path: fixturePath(name) })));
    return readWorkbook(buffer);
  } catch {
    return { rows: [] }; // the original threw "No se pudieron procesar los archivos." => nothing exported
  }
};

const newRows = async (names) => {
  const { excel } = await processInvoices(names.map((name) => fixtureFile(name)));
  return excel ? readWorkbook(excel.blob) : { rows: [] };
};

describe("Excel compatibility with the original implementation", () => {
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = () => {}; // the original logs every failed file
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("sheet name and headers are unchanged", async () => {
    const result = await newRows(["valid-factura-v43-crc.xml"]);
    expect(result.sheetNames).toEqual(["Comprobantes"]);
    expect(result.headers).toEqual(COLUMNS.map((c) => c.header));
    expect(result.headers).toEqual((await legacyRows(["valid-factura-v43-crc.xml"])).headers);
  });

  for (const name of allFixtures()) {
    it(`same rows as before for ${name}`, async () => {
      expect((await newRows([name])).rows).toEqual((await legacyRows([name])).rows);
    });
  }

  it("same rows as before for the whole fixtures folder in one batch", async () => {
    expect((await newRows(allFixtures())).rows).toEqual((await legacyRows(allFixtures())).rows);
  });

  it("known values of a valid invoice", async () => {
    const { rows } = await newRows(["valid-factura-v44-usd.xml"]);
    const row = Object.fromEntries(COLUMNS.map((c, i) => [c.key, rows[0][i]]));
    expect(row).toMatchObject({
      NoFactura: "00100001010000004567",
      TipoTransaccion: "FACT",
      GrupoFacturacion: "Proveedores Locales (USD)",
      Descripcion: "Licencia de software anual",
      SubTotal: 200,
      Impuesto: 26,
      MontoTotal: 226,
      TipoCambioTransaccion: 512.35,
    });
  });
});
