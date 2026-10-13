import { memo, useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDropzone } from "react-dropzone";
import { ToastContainer, toast } from "react-toastify";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaRegClock,
  FaTimes,
  FaCopy,
  FaCloudUploadAlt,
} from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import "./XmlToExcel.css";
import { processInvoices, loadExcelJS } from "./processing/processInvoices";
import { addFiles, applyReport, markSent, sendableItems, formatSize } from "./fileSelection";
import { buildFeedbackReport } from "./feedbackReport";

const STATUS = {
  pending: { label: "Pendiente", Icon: FaRegClock },
  processing: { label: "Procesando…", Icon: FaRegClock },
  ok: { label: "Procesado", Icon: FaCheckCircle },
  warning: { label: "Procesado con advertencias", Icon: FaExclamationTriangle },
  error: { label: "Error: no incluido en el Excel", Icon: FaTimesCircle },
};

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const IssueDetails = ({ issue, kind }) => (
  <div className={`issue issue--${kind}`}>
    <p className="issue-message">{issue.message}</p>
    {issue.hint && (
      <p className="issue-hint">
        <strong>Cómo resolverlo:</strong> {issue.hint}
      </p>
    )}
    <details className="issue-technical">
      <summary>Detalle técnico</summary>
      <code>
        {issue.code}
        {issue.details ? ` · ${JSON.stringify(issue.details)}` : ""}
      </code>
    </details>
  </div>
);

IssueDetails.propTypes = {
  issue: PropTypes.shape({
    code: PropTypes.string,
    message: PropTypes.string.isRequired,
    hint: PropTypes.string,
    details: PropTypes.object,
  }).isRequired,
  kind: PropTypes.oneOf(["error", "warning"]).isRequired,
};

// memo: with hundreds of files, progress updates must not re-render every row.
const FileRow = memo(function FileRow({ item, isProcessing, onRemove }) {
  const statusKey = isProcessing && item.status === "pending" ? "processing" : item.status;
  const { label, Icon } = STATUS[statusKey];
  const statusLabel = item.status === "error" && item.origin === "client" ? "Error: no se procesará" : label;

  return (
    <li className={`file-item file-item--${item.status}`} data-testid="file-item">
      <div className="file-row">
        <Icon className="file-status-icon" aria-hidden="true" />
        <div className="file-main">
          <span className="file-name">{item.name}</span>
          <span className="file-meta">
            {formatSize(item.size)}
            {item.meta?.consecutivo && ` · Consecutivo ${item.meta.consecutivo}`}
            {item.meta?.emisor && ` · ${item.meta.emisor}`}
          </span>
        </div>
        <span className={`status-badge status-badge--${item.status}`}>{statusLabel}</span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onRemove(item.id)}
          disabled={isProcessing}
          aria-label={`Quitar ${item.name}`}
          title="Quitar de la lista"
        >
          <FaTimes aria-hidden="true" />
        </button>
      </div>
      {item.error && <IssueDetails issue={item.error} kind="error" />}
      {item.warnings.map((warning, i) => (
        <IssueDetails key={`${warning.code}-${i}`} issue={warning} kind="warning" />
      ))}
    </li>
  );
});

FileRow.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    size: PropTypes.number.isRequired,
    status: PropTypes.oneOf(Object.keys(STATUS)).isRequired,
    origin: PropTypes.oneOf(["client", "processed", null]),
    error: PropTypes.object,
    warnings: PropTypes.array.isRequired,
    meta: PropTypes.object,
  }).isRequired,
  isProcessing: PropTypes.bool.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const RunSummary = ({ lastRun, items }) => {
  const failedItems = items.filter((item) => item.status === "error");
  const notSent = failedItems.filter((item) => item.origin === "client").length;

  if (lastRun.error) {
    const { error } = lastRun;
    const title = error.code === "NO_VALID_FILES" ? "Ningún archivo se pudo procesar" : "No se pudo generar el Excel";
    return (
      <div className="run-summary run-summary--error" role="alert">
        <h2>{title}</h2>
        <p>{error.message}</p>
        {error.hint && (
          <p>
            <strong>Cómo resolverlo:</strong> {error.hint}
          </p>
        )}
        {failedItems.length > 0 && <p>El motivo de cada archivo aparece en la lista de abajo.</p>}
        <p className="run-summary-ref">Código: {error.code}</p>
      </div>
    );
  }

  const { total, processed, failed, withWarnings } = lastRun.summary;
  const kind = failed > 0 ? "error" : withWarnings > 0 ? "warning" : "success";
  return (
    <div className={`run-summary run-summary--${kind}`} role="status">
      <h2>
        {failed > 0
          ? `Excel generado con ${processed} de ${total} archivos`
          : `Excel generado con ${total === 1 ? "el archivo" : `los ${total} archivos`}`}
      </h2>
      {failed > 0 && (
        <>
          <p>
            <strong>
              {failed === 1 ? "1 archivo NO se incluyó" : `${failed} archivos NO se incluyeron`} en el Excel:
            </strong>
          </p>
          <ul className="run-summary-list">
            {failedItems
              .filter((item) => item.origin === "processed")
              .map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>: {item.error?.message}
                </li>
              ))}
          </ul>
        </>
      )}
      {withWarnings > 0 && (
        <p>
          {withWarnings === 1 ? "1 archivo se incluyó" : `${withWarnings} archivos se incluyeron`} con advertencias; revisa
          esas filas en el Excel.
        </p>
      )}
      {notSent > 0 && (
        <p>
          {notSent === 1 ? "1 archivo no se procesó" : `${notSent} archivos no se procesaron`} por errores detectados al
          agregarlos.
        </p>
      )}
    </div>
  );
};

RunSummary.propTypes = {
  lastRun: PropTypes.shape({
    error: PropTypes.object,
    summary: PropTypes.object,
  }).isRequired,
  items: PropTypes.array.isRequired,
};

const XmlToExcel = () => {
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const isLoading = progress !== null;

  // Download the Excel library while the user picks the files.
  useEffect(() => {
    loadExcelJS().catch(() => {});
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/xml": [".xml"] },
    disabled: isLoading,
    onDrop: (acceptedFiles, rejectedFiles) => {
      const result = addFiles(items, acceptedFiles, rejectedFiles);
      const previousIds = new Set(items.map((item) => item.id));
      const newErrors = result.items.filter((item) => item.status === "error" && !previousIds.has(item.id)).length;
      setItems(result.items);
      result.notices.forEach((notice) => toast.info(notice));
      if (newErrors > 0) {
        toast.warning(newErrors === 1 ? "1 archivo tiene un problema; revisa el detalle en la lista." : `${newErrors} archivos tienen problemas; revisa el detalle en la lista.`);
      }
    },
  });

  const toProcess = sendableItems(items);
  const hasIssues = items.some((item) => item.status === "error" || item.status === "warning");
  const errorCount = items.filter((item) => item.status === "error").length;

  const handleGenerateExcel = async () => {
    if (toProcess.length === 0) {
      toast.warning(items.length ? "Ningún archivo válido para procesar: revisa los errores de la lista." : "No hay archivos para procesar.");
      return;
    }

    const processedIds = toProcess.map((item) => item.id);
    setProgress({ done: 0, total: toProcess.length });
    setLastRun(null);
    setItems((prev) => markSent(prev, processedIds, "pending"));

    try {
      const { excel, report } = await processInvoices(
        toProcess.map((item) => item.file),
        { onProgress: (done, total) => setProgress({ done, total }) }
      );
      setItems((prev) => applyReport(prev, processedIds, report));
      const { failed, processed, total } = report.summary;

      if (!excel) {
        setLastRun({
          summary: report.summary,
          error: {
            code: "NO_VALID_FILES",
            message: total === 1 ? "El archivo no se pudo procesar." : `Ninguno de los ${total} archivos se pudo procesar.`,
            hint: "Revisa el motivo indicado en cada archivo.",
            details: null,
          },
        });
        toast.error("Ningún archivo se pudo procesar: revisa la lista.");
        return;
      }

      downloadBlob(excel.blob, excel.fileName);
      setLastRun({ summary: report.summary });
      if (failed > 0) {
        toast.warning(`Excel generado con ${processed} de ${total} archivos. ${failed} con error: revisa la lista.`);
      } else {
        toast.success("¡Excel generado exitosamente!");
      }
    } catch (error) {
      // Not a file problem (those are in the report): e.g. the Excel library failed to load.
      console.error("[XmlToExcel] EXCEL_GENERATION_FAILED", error);
      setItems((prev) => markSent(prev, processedIds, "pending"));
      setLastRun({
        error: {
          code: "EXCEL_GENERATION_FAILED",
          message: "No se pudo generar el Excel en el navegador.",
          hint: "Recarga la página e intenta de nuevo. Si continúa, usa «Copiar reporte de errores» y envíalo a soporte.",
          details: { errorName: error.name, errorMessage: error.message },
        },
      });
      toast.error("No se pudo generar el Excel.");
    } finally {
      setProgress(null);
    }
  };

  const handleRemove = useCallback((id) => setItems((prev) => prev.filter((item) => item.id !== id)), []);

  const handleRemoveFailed = () => {
    setItems((prev) => prev.filter((item) => item.status !== "error"));
    toast.info("Se quitaron los archivos con error.");
  };

  const handleClearFiles = () => {
    setItems([]);
    setLastRun(null);
    toast.info("Archivos eliminados.");
  };

  const handleCopyReport = async () => {
    const report = buildFeedbackReport({ items, lastRun });
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Reporte copiado. Pégalo en el correo o chat de soporte.");
    } catch {
      downloadBlob(new Blob([report], { type: "text/plain;charset=utf-8" }), "reporte-errores-xml.txt");
      toast.info("No se pudo copiar al portapapeles; se descargó el reporte como archivo de texto.");
    }
  };

  return (
    <div className="tool-container xml-tool">
      <ToastContainer />
      <h1 className="tool-title">Convertir XML a Excel</h1>
      <p className="tool-subtitle">
        Sube facturas y tiquetes electrónicos de Hacienda (XML) y descarga un Excel unificado.
      </p>

      <div
        {...getRootProps({
          className: `dropzone${items.length ? " dropzone--compact" : ""}${isDragActive ? " dropzone--active" : ""}`,
        })}
      >
        <input {...getInputProps()} aria-label="Seleccionar archivos XML" />
        <FaCloudUploadAlt className="dropzone-icon" aria-hidden="true" />
        <p>
          {items.length
            ? "Arrastra más archivos XML o haz clic para agregarlos"
            : "Arrastra tus archivos XML aquí o haz clic para seleccionarlos"}
        </p>
        <small>Sin límite de archivos. Se procesan en tu computadora: no se suben a ningún servidor.</small>
      </div>

      {lastRun && <RunSummary lastRun={lastRun} items={items} />}

      {items.length > 0 && (
        <>
          <p className="file-count">
            {items.length === 1 ? "1 archivo" : `${items.length} archivos`}
            {errorCount > 0 && ` · ${errorCount} con error`}
          </p>
          <ul className="file-list" aria-label="Archivos seleccionados">
            {items.map((item) => (
              <FileRow key={item.id} item={item} isProcessing={isLoading} onRemove={handleRemove} />
            ))}
          </ul>
        </>
      )}

      <div className="button-container">
        {items.length > 0 && (
          <>
            <button
              type="button"
              className="generate-btn"
              onClick={handleGenerateExcel}
              disabled={isLoading || toProcess.length === 0}
            >
              {isLoading ? `Procesando ${progress.done} de ${progress.total}…` : "Generar Excel Unificado"}
            </button>
            {errorCount > 0 && (
              <button type="button" className="secondary-btn" onClick={handleRemoveFailed} disabled={isLoading}>
                Quitar archivos con error
              </button>
            )}
            <button type="button" className="clear-btn" onClick={handleClearFiles} disabled={isLoading}>
              Limpiar Archivos
            </button>
          </>
        )}
        {(hasIssues || lastRun?.error) && (
          <button type="button" className="secondary-btn" onClick={handleCopyReport}>
            <FaCopy aria-hidden="true" /> Copiar reporte de errores
          </button>
        )}
      </div>
    </div>
  );
};

export default XmlToExcel;
