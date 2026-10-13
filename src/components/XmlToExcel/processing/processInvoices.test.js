import { describe, it, expect, vi } from "vitest";
import { processInvoices } from "./processInvoices";
import { fixtureFile, xmlFile, readWorkbook } from "../../../test/factories";

describe("processInvoices", () => {
  it("keeps the order, names every failed file and only exports valid rows", async () => {
    const names = ["valid-factura-v43-crc.xml", "mensaje-hacienda.xml", "valid-tiquete-v44.xml", "vacio.xml", "campos-faltantes.xml"];
    const { excel, report } = await processInvoices(names.map((n) => fixtureFile(n)));

    expect(report.files.map((f) => [f.index, f.fileName, f.status])).toEqual([
      [0, "valid-factura-v43-crc.xml", "ok"],
      [1, "mensaje-hacienda.xml", "error"],
      [2, "valid-tiquete-v44.xml", "ok"],
      [3, "vacio.xml", "error"],
      [4, "campos-faltantes.xml", "warning"],
    ]);
    expect(report.summary).toEqual({ total: 5, processed: 3, failed: 2, withWarnings: 1 });
    expect(excel.fileName).toBe("resultado.xlsx");
    expect((await readWorkbook(excel.blob)).rows).toHaveLength(3);
  });

  it("warns about the same invoice twice (still exported twice, like before)", async () => {
    const { excel, report } = await processInvoices([
      fixtureFile("valid-factura-v43-crc.xml", "original.xml"),
      fixtureFile("valid-factura-v43-crc.xml", "copia.xml"),
    ]);
    expect(report.files[1].warnings[0]).toMatchObject({ code: "DUPLICATE_DOCUMENT", message: expect.stringContaining('"original.xml"') });
    expect((await readWorkbook(excel.blob)).rows).toHaveLength(2);
  });

  it("returns no Excel when every file fails", async () => {
    const { excel, report } = await processInvoices([fixtureFile("vacio.xml"), fixtureFile("nota-credito.xml")]);
    expect(excel).toBeNull();
    expect(report.summary).toEqual({ total: 2, processed: 0, failed: 2, withWarnings: 0 });
  });

  it("has no limit: 600 files are all processed, reporting progress", async () => {
    const files = Array.from({ length: 600 }, (_, i) =>
      i === 450 ? fixtureFile("malformada-cortada.xml", "rota.xml") : fixtureFile("valid-tiquete-v44.xml", `t${i}.xml`)
    );
    const onProgress = vi.fn();
    const { excel, report } = await processInvoices(files, { onProgress });

    expect(report.summary.total).toBe(600);
    expect(report.summary.processed).toBe(599);
    expect(report.files[450]).toMatchObject({ fileName: "rota.xml", status: "error", error: { code: "INVALID_XML" } });
    expect(onProgress).toHaveBeenCalledTimes(24); // every 25 files
    expect(onProgress).toHaveBeenLastCalledWith(600, 600);
    expect((await readWorkbook(excel.blob)).rows).toHaveLength(599);
  });

  it("a file that cannot be read does not hide the others", async () => {
    const broken = xmlFile("ilegible.xml", "x");
    broken.arrayBuffer = () => Promise.reject(new Error("NotReadableError"));
    const { report } = await processInvoices([broken, fixtureFile("valid-tiquete-v44.xml")]);
    expect(report.files[0].error).toMatchObject({ code: "UNEXPECTED_PARSE_ERROR", details: { errorMessage: "NotReadableError" } });
    expect(report.files[1].status).toBe("ok");
  });
});
