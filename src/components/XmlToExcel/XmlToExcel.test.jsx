// Full screen flow with real fixture XMLs processed in the (jsdom) browser. No server involved.
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import XmlToExcel from "./XmlToExcel";
import * as processing from "./processing/processInvoices";
import { xmlFile, fixtureFile } from "../../test/factories";

const setup = () => {
  const user = userEvent.setup({ applyAccept: false });
  render(<XmlToExcel />);
  return { user, input: screen.getByLabelText("Seleccionar archivos XML") };
};

const rowFor = (name) => screen.getAllByTestId("file-item").find((li) => within(li).queryByText(name));
// Toasts also use role="alert"; the persistent summary is the one that matters.
const findSummaryAlert = async () =>
  (await screen.findAllByRole("alert")).find((el) => el.classList.contains("run-summary"));
const generate = (user) => user.click(screen.getByRole("button", { name: /Generar Excel/ }));

describe("XmlToExcel", () => {
  it("tells exactly which files failed, why, and how to fix it (client complaint)", async () => {
    const { user, input } = setup();
    await user.upload(input, [
      fixtureFile("valid-factura-v43-crc.xml", "factura-001.xml"),
      fixtureFile("mensaje-hacienda.xml", "respuesta-hacienda.xml"),
      fixtureFile("malformada-cortada.xml", "cortada.xml"),
    ]);
    await generate(user);

    const summary = await screen.findByRole("heading", { name: "Excel generado con 1 de 3 archivos" });
    const summaryBox = summary.closest(".run-summary");
    expect(within(summaryBox).getByText(/2 archivos NO se incluyeron/)).toBeInTheDocument();
    expect(within(summaryBox).getByText("respuesta-hacienda.xml")).toBeInTheDocument();
    expect(within(summaryBox).getByText("cortada.xml")).toBeInTheDocument();

    const hacienda = rowFor("respuesta-hacienda.xml");
    expect(within(hacienda).getByText("Error: no incluido en el Excel")).toBeInTheDocument();
    expect(within(hacienda).getByText(/es la respuesta de Hacienda/)).toBeInTheDocument();
    expect(within(hacienda).getByText(/Sube el de la factura/)).toBeInTheDocument();
    expect(within(hacienda).getByText(/UNSUPPORTED_DOCUMENT/)).toBeInTheDocument();

    expect(within(rowFor("factura-001.xml")).getByText("Procesado")).toBeInTheDocument();
    expect(within(rowFor("factura-001.xml")).getByText(/Consecutivo 00100001010000000123/)).toBeInTheDocument();
    expect(within(rowFor("cortada.xml")).getByText(/línea 6, columna 38/)).toBeInTheDocument();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("never contacts a server", async () => {
    const { user, input } = setup();
    await user.upload(input, [fixtureFile("valid-tiquete-v44.xml")]);
    await generate(user);
    await screen.findByRole("heading", { name: "Excel generado con el archivo" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("none could be processed -> alert + reason per file, no download", async () => {
    HTMLAnchorElement.prototype.click.mockClear();
    const { user, input } = setup();
    await user.upload(input, [fixtureFile("fecha-invalida.xml"), fixtureFile("nota-credito.xml")]);
    await generate(user);

    const alert = await findSummaryAlert();
    expect(within(alert).getByText("Ningún archivo se pudo procesar")).toBeInTheDocument();
    expect(within(alert).getByText("Ninguno de los 2 archivos se pudo procesar.")).toBeInTheDocument();
    expect(within(rowFor("nota-credito.xml")).getByText(/Nota de Crédito/)).toBeInTheDocument();
    expect(within(rowFor("fecha-invalida.xml")).getByText(/"15\/03\/2024" no es una fecha válida/)).toBeInTheDocument();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it("if the Excel cannot be generated, explains it, keeps the files and allows copying a report", async () => {
    const spy = vi.spyOn(processing, "processInvoices").mockRejectedValueOnce(new Error("Failed to fetch dynamically imported module"));
    const { user, input } = setup();
    await user.upload(input, [fixtureFile("valid-tiquete-v44.xml", "a.xml")]);
    await generate(user);

    const alert = await findSummaryAlert();
    expect(within(alert).getByText("No se pudo generar el Excel en el navegador.")).toBeInTheDocument();
    expect(within(alert).getByText(/Recarga la página/)).toBeInTheDocument();
    expect(within(rowFor("a.xml")).getByText("Pendiente")).toBeInTheDocument();

    // user-event installs a clipboard stub on navigator.
    await user.click(screen.getByRole("button", { name: /Copiar reporte/ }));
    const report = await navigator.clipboard.readText();
    expect(report).toContain("[EXCEL_GENERATION_FAILED]");
    expect(report).toContain("Failed to fetch dynamically imported module");
    spy.mockRestore();
  });

  it("flags empty / non-XML files when added and never processes them", async () => {
    const spy = vi.spyOn(processing, "processInvoices");
    const { user, input } = setup();
    await user.upload(input, [xmlFile("vacio.xml", ""), new File(["%PDF"], "factura.pdf", { type: "application/pdf" }), fixtureFile("valid-tiquete-v44.xml", "ok.xml")]);

    expect(await within(rowFor("vacio.xml")).findByText("El archivo está vacío (0 bytes).")).toBeInTheDocument();
    expect(within(rowFor("factura.pdf")).getByText("No es un archivo .xml.")).toBeInTheDocument();
    expect(within(rowFor("factura.pdf")).getByText("Error: no se procesará")).toBeInTheDocument();

    await generate(user);
    expect(spy.mock.calls[0][0].map((f) => f.name)).toEqual(["ok.xml"]);
    expect(await screen.findByText(/2 archivos no se procesaron/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it("lets the user keep adding files and remove individual ones", async () => {
    const { user, input } = setup();
    await user.upload(input, [xmlFile("a.xml")]);
    await user.upload(screen.getByLabelText("Seleccionar archivos XML"), [xmlFile("b.xml"), xmlFile("a.xml")]);

    expect(await screen.findAllByTestId("file-item")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Quitar a.xml" }));
    expect(screen.getAllByTestId("file-item")).toHaveLength(1);
    expect(rowFor("b.xml")).toBeTruthy();
  });

  it("'Quitar archivos con error' leaves only the good ones", async () => {
    const { user, input } = setup();
    await user.upload(input, [fixtureFile("valid-tiquete-v44.xml", "a.xml"), fixtureFile("malformada-etiqueta.xml", "b.xml")]);
    await generate(user);

    await user.click(await screen.findByRole("button", { name: "Quitar archivos con error" }));
    expect(screen.getAllByTestId("file-item")).toHaveLength(1);
    expect(rowFor("a.xml")).toBeTruthy();
  });
});
