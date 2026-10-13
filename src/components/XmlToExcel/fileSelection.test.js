import { describe, it, expect } from "vitest";
import { addFiles, applyReport, sendableItems, markSent, formatSize } from "./fileSelection";
import { MAX_FILE_SIZE_MB } from "./uploadXmlFiles";
import { xmlFile, okEntry, errorEntry } from "../../test/factories";

describe("addFiles", () => {
  it("adds valid files as pending", () => {
    const { items, notices } = addFiles([], [xmlFile("a.xml"), xmlFile("b.xml")]);
    expect(items.map((i) => [i.name, i.status])).toEqual([["a.xml", "pending"], ["b.xml", "pending"]]);
    expect(notices).toEqual([]);
  });

  it("ignores the same file dropped twice and says which one", () => {
    const first = addFiles([], [xmlFile("a.xml")]);
    const { items, notices } = addFiles(first.items, [xmlFile("a.xml")]);
    expect(items).toHaveLength(1);
    expect(notices[0]).toContain('"a.xml" ya estaba en la lista');
  });

  it("keeps empty and oversized files in the list as client errors that will not be sent", () => {
    const big = xmlFile("grande.xml");
    Object.defineProperty(big, "size", { value: MAX_FILE_SIZE_MB * 1024 * 1024 + 1 });
    const { items } = addFiles([], [xmlFile("vacio.xml", ""), big, xmlFile("ok.xml")]);

    expect(items.map((i) => [i.name, i.status, i.error?.code ?? null])).toEqual([
      ["vacio.xml", "error", "EMPTY_FILE"],
      ["grande.xml", "error", "FILE_TOO_LARGE"],
      ["ok.xml", "pending", null],
    ]);
    expect(sendableItems(items).map((i) => i.name)).toEqual(["ok.xml"]);
  });

  it("shows files rejected by the dropzone (wrong type) with a clear reason", () => {
    const pdf = new File(["%PDF"], "factura.pdf", { type: "application/pdf" });
    const { items } = addFiles([], [], [{ file: pdf, errors: [{ code: "file-invalid-type", message: "File type must be application/xml" }] }]);
    expect(items[0]).toMatchObject({ name: "factura.pdf", status: "error", origin: "client" });
    expect(items[0].error).toMatchObject({ code: "NOT_XML_EXTENSION", message: "No es un archivo .xml." });
  });

  it("has no limit on the number of files", () => {
    const many = Array.from({ length: 1500 }, (_, i) => xmlFile(`f${i}.xml`));
    const { items, notices } = addFiles([], many);
    expect(sendableItems(items)).toHaveLength(1500);
    expect(notices).toEqual([]);
  });

  it("groups duplicate notices into one message", () => {
    const files = [xmlFile("a.xml"), xmlFile("b.xml"), xmlFile("c.xml")];
    const first = addFiles([], files);
    const { items, notices } = addFiles(first.items, files);
    expect(items).toHaveLength(3);
    expect(notices).toEqual(["3 archivos ya estaban en la lista; no se agregaron de nuevo."]);
  });
});

describe("applyReport", () => {
  it("maps API entries to the items that were sent, by index", () => {
    const { items } = addFiles([], [xmlFile("vacio.xml", ""), xmlFile("a.xml"), xmlFile("b.xml")]);
    const sentIds = sendableItems(items).map((i) => i.id);
    const report = {
      files: [okEntry(0, "a.xml"), errorEntry(1, "b.xml", "UNSUPPORTED_DOCUMENT", "Es la respuesta de Hacienda")],
    };

    const updated = applyReport(items, sentIds, report);
    expect(updated.map((i) => [i.name, i.status, i.origin])).toEqual([
      ["vacio.xml", "error", "client"],
      ["a.xml", "ok", "server"],
      ["b.xml", "error", "server"],
    ]);
    expect(updated[1].meta.consecutivo).toBe("00100001010000000000");
    expect(updated[2].error.message).toBe("Es la respuesta de Hacienda");
  });

  it("markSent resets previous results of the files being re-sent", () => {
    const { items } = addFiles([], [xmlFile("a.xml")]);
    const processed = applyReport(items, [items[0].id], { files: [errorEntry(0, "a.xml", "INVALID_XML", "x")] });
    const reset = markSent(processed, [items[0].id], "pending");
    expect(reset[0]).toMatchObject({ status: "pending", error: null, origin: null });
  });
});

it("formatSize", () => {
  expect(formatSize(512)).toBe("512 B");
  expect(formatSize(2048)).toBe("2.0 KB");
  expect(formatSize(3 * 1024 * 1024)).toBe("3.0 MB");
});
