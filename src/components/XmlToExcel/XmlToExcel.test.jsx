import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import XmlToExcel from "./XmlToExcel";
import { xmlFile, jsonResponse, okEntry, errorEntry, successBody, summarize } from "../../test/factories";

const API = "http://api.test";

const setup = (fetchResponse) => {
  const fetchMock = vi.fn();
  if (fetchResponse instanceof Error) fetchMock.mockRejectedValue(fetchResponse);
  else if (fetchResponse) fetchMock.mockResolvedValue(fetchResponse);
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup({ applyAccept: false });
  render(<XmlToExcel apiUrl={API} />);
  const input = screen.getByLabelText("Seleccionar archivos XML");
  return { user, input, fetchMock };
};

const rowFor = (name) => screen.getAllByTestId("file-item").find((li) => within(li).queryByText(name));
// Toasts also use role="alert"; the persistent summary is the one that matters.
const findSummaryAlert = async () =>
  (await screen.findAllByRole("alert")).find((el) => el.classList.contains("run-summary"));
const generate = (user) => user.click(screen.getByRole("button", { name: /Generar Excel/ }));

describe("XmlToExcel", () => {
  it("tells exactly which files failed, why, and how to fix it (client complaint)", async () => {
    const files = [okEntry(0, "factura-001.xml"), errorEntry(1, "respuesta-hacienda.xml", "UNSUPPORTED_DOCUMENT", "Este XML es la respuesta de Hacienda, no la factura.", "Sube el XML de la factura."), errorEntry(2, "cortada.xml", "INVALID_XML", "El archivo no es un XML válido (línea 6, columna 38): parece incompleto.", "Descárgalo de nuevo.", { line: 6 })];
    const { user, input } = setup(jsonResponse(successBody(files)));

    await user.upload(input, [xmlFile("factura-001.xml"), xmlFile("respuesta-hacienda.xml"), xmlFile("cortada.xml")]);
    await generate(user);

    const summary = await screen.findByRole("heading", { name: "Excel generado con 1 de 3 archivos" });
    const summaryBox = summary.closest(".run-summary");
    expect(within(summaryBox).getByText(/2 archivos NO se incluyeron/)).toBeInTheDocument();
    expect(within(summaryBox).getByText("respuesta-hacienda.xml")).toBeInTheDocument();
    expect(within(summaryBox).getByText("cortada.xml")).toBeInTheDocument();

    const hacienda = rowFor("respuesta-hacienda.xml");
    expect(within(hacienda).getByText("Error: no incluido en el Excel")).toBeInTheDocument();
    expect(within(hacienda).getByText("Este XML es la respuesta de Hacienda, no la factura.")).toBeInTheDocument();
    expect(within(hacienda).getByText("Sube el XML de la factura.")).toBeInTheDocument();
    expect(within(hacienda).getByText(/UNSUPPORTED_DOCUMENT/)).toBeInTheDocument();

    expect(within(rowFor("factura-001.xml")).getByText("Procesado")).toBeInTheDocument();
    expect(within(rowFor("cortada.xml")).getByText(/línea 6, columna 38/)).toBeInTheDocument();
  });

  it("downloads the Excel when at least one file succeeds", async () => {
    const { user, input } = setup(jsonResponse(successBody([okEntry(0, "a.xml")])));
    await user.upload(input, [xmlFile("a.xml")]);
    await generate(user);

    expect(await screen.findByRole("heading", { name: "Excel generado con el archivo" })).toBeInTheDocument();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("422: none could be processed -> alert + reason per file, no download", async () => {
    HTMLAnchorElement.prototype.click.mockClear();
    const files = [errorEntry(0, "a.xml", "EMPTY_FILE", "El archivo está vacío."), errorEntry(1, "b.xml", "UNSUPPORTED_DOCUMENT", "Es una Nota de Crédito.")];
    const body = { error: { code: "NO_VALID_FILES", message: "Ninguno de los 2 archivos se pudo procesar.", hint: "Revisa el motivo indicado en cada archivo." }, report: { summary: summarize(files), files }, requestId: "r422" };
    const { user, input } = setup(jsonResponse(body, 422));

    await user.upload(input, [xmlFile("a.xml"), xmlFile("b.xml")]);
    await generate(user);

    const alert = await findSummaryAlert();
    expect(within(alert).getByText("Ningún archivo se pudo procesar")).toBeInTheDocument();
    expect(within(alert).getByText(/Ref: r422/)).toBeInTheDocument();
    expect(within(rowFor("b.xml")).getByText("Es una Nota de Crédito.")).toBeInTheDocument();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it("network failure -> explains it, keeps the files and allows copying a report", async () => {
    const { user, input } = setup(new TypeError("Failed to fetch"));

    await user.upload(input, [xmlFile("a.xml")]);
    await generate(user);

    const alert = await findSummaryAlert();
    expect(within(alert).getByText("No se pudo conectar con el servidor.")).toBeInTheDocument();
    expect(within(alert).getByText(/NETWORK_ERROR/)).toBeInTheDocument();
    expect(within(rowFor("a.xml")).getByText("Pendiente")).toBeInTheDocument();

    // user-event installs a clipboard stub on navigator.
    await user.click(screen.getByRole("button", { name: /Copiar reporte/ }));
    expect(await navigator.clipboard.readText()).toContain("[NETWORK_ERROR] No se pudo conectar con el servidor.");
  });

  it("flags empty / non-XML files before uploading and never sends them", async () => {
    const { user, input, fetchMock } = setup(jsonResponse(successBody([okEntry(0, "ok.xml")])));
    await user.upload(input, [xmlFile("vacio.xml", ""), new File(["%PDF"], "factura.pdf", { type: "application/pdf" }), xmlFile("ok.xml")]);

    expect(await within(rowFor("vacio.xml")).findByText("El archivo está vacío (0 bytes).")).toBeInTheDocument();
    expect(within(rowFor("factura.pdf")).getByText("No es un archivo .xml.")).toBeInTheDocument();
    expect(within(rowFor("factura.pdf")).getByText("Error: no se enviará")).toBeInTheDocument();

    await generate(user);
    const sent = fetchMock.mock.calls[0][1].body.getAll("files").map((f) => f.name);
    expect(sent).toEqual(["ok.xml"]);
    expect(await screen.findByText(/2 archivos no se enviaron/)).toBeInTheDocument();
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
    const files = [okEntry(0, "a.xml"), errorEntry(1, "b.xml", "INVALID_XML", "x")];
    const { user, input } = setup(jsonResponse(successBody(files)));
    await user.upload(input, [xmlFile("a.xml"), xmlFile("b.xml")]);
    await generate(user);

    await user.click(await screen.findByRole("button", { name: "Quitar archivos con error" }));
    expect(screen.getAllByTestId("file-item")).toHaveLength(1);
    expect(rowFor("a.xml")).toBeTruthy();
  });
});
