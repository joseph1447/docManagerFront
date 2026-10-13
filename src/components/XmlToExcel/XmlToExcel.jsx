import { useEffect, useState } from "react";
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
  FaInfoCircle,
} from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import "./XmlToExcel.css";
import { uploadXmlFiles, MAX_FILES, MAX_FILE_SIZE_MB } from "./uploadXmlFiles";
import { addFiles, applyReport, markSent, sendableItems, formatSize } from "./fileSelection";
import { buildFeedbackReport } from "./feedbackReport";

const SLOW_SERVER_MS = 8000;

const STATUS = {
  pending: { label: "Pendiente", Icon: FaRegClock },
  processing: { label: "Procesando…", Icon: FaRegClock },
  sent: { label: "Enviado", Icon: FaInfoCircle },
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

const toPlainError = (error) => ({
  code: error.code || "CLIENT_ERROR",
  message: error.message,
  hint: error.hint || null,
  status: error.status || null,
  details: error.details || null,
});

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

const FileRow = ({ item, isProcessing, onRemove }) => {
  const statusKey = isProcessing && item.status === "pending" ? "processing" : item.status;
  const { label, Icon } = STATUS[statusKey];
  const statusLabel = item.status === "error" && item.origin === "client" ? "Error: no se enviará" : label;

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
};

FileRow.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    size: PropTypes.number.isRequired,
    status: PropTypes.oneOf(Object.keys(STATUS)).isRequired,
    origin: PropTypes.oneOf(["client", "server", null]),
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
        <p className="run-summary-ref">
          Código: {error.code}
          {error.status ? ` · HTTP ${error.status}` : ""}
          {lastRun.requestId ? ` · Ref: ${lastRun.requestId}` : ""}
        </p>
      </div>
    );
  }

  if (lastRun.legacyApi) {
    return (
      <div className="run-summary run-summary--info" role="status">
        <h2>Excel generado</h2>
        <p>El servidor no devolvió el detalle por archivo, así que no se puede saber si alguno se omitió.</p>
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
              .filter((item) => item.origin === "server")
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
          {notSent === 1 ? "1 archivo no se envió" : `${notSent} archivos no se enviaron`} por errores detectados antes de
          subirlos.
        </p>
      )}
      {lastRun.requestId && <p className="run-summary-ref">Ref: {lastRun.requestId}</p>}
    </div>
  );
};

RunSummary.propTypes = {
  lastRun: PropTypes.shape({
    error: PropTypes.object,
    summary: PropTypes.object,
    requestId: PropTypes.string,
    legacyApi: PropTypes.bool,
  }).isRequired,
  items: PropTypes.array.isRequired,
};

const XmlToExcel = ({ apiUrl = import.meta.env.VITE_API_URL }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  useEffect(() => {
    if (!isLoading) return undefined;
    const timer = setTimeout(() => setIsSlow(true), SLOW_SERVER_MS);
    return () => {
      clearTimeout(timer);
      setIsSlow(false);
    };
  }, [isLoading]);

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

  const toSend = sendableItems(items);
  const hasIssues = items.some((item) => item.status === "error" || item.status === "warning");
  const errorCount = items.filter((item) => item.status === "error").length;

  const handleGenerateExcel = async () => {
    if (toSend.length === 0) {
      toast.warning(items.length ? "Ningún archivo válido para enviar: revisa los errores de la lista." : "No hay archivos para procesar.");
      return;
    }

    const sentIds = toSend.map((item) => item.id);
    setIsLoading(true);
    setLastRun(null);
    setItems((prev) => markSent(prev, sentIds, "pending"));

    try {
      const { excel, report, requestId } = await uploadXmlFiles(toSend.map((item) => item.file), { baseUrl: apiUrl });
      downloadBlob(excel.blob, excel.fileName);

      if (!report) {
        setItems((prev) => markSent(prev, sentIds, "sent"));
        setLastRun({ legacyApi: true, requestId });
        toast.success("¡Excel generado!");
        return;
      }

      setItems((prev) => applyReport(prev, sentIds, report));
      setLastRun({ summary: report.summary, requestId });
      const { failed, processed, total } = report.summary;
      if (failed > 0) {
        toast.warning(`Excel generado con ${processed} de ${total} archivos. ${failed} con error: revisa la lista.`);
      } else {
        toast.success("¡Excel generado exitosamente!");
      }
    } catch (error) {
      console.error(`[XmlToExcel] ${error.code || error.name}: ${error.message}`, error);
      if (error.report) {
        setItems((prev) => applyReport(prev, sentIds, error.report));
      } else {
        setItems((prev) => markSent(prev, sentIds, "pending"));
      }
      setLastRun({ error: toPlainError(error), summary: error.report?.summary ?? null, requestId: error.requestId ?? null });
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = (id) => setItems((prev) => prev.filter((item) => item.id !== id));

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
    const report = buildFeedbackReport({ items, lastRun, apiUrl });
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
        <small>
          Máximo {MAX_FILES} archivos de {MAX_FILE_SIZE_MB} MB cada uno.
        </small>
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

      {isLoading && isSlow && (
        <p className="slow-hint" role="status">
          El servidor está tardando más de lo normal. Si estaba inactivo puede tardar hasta un minuto en despertar; no
          cierres esta página.
        </p>
      )}

      <div className="button-container">
        {items.length > 0 && (
          <>
            <button
              type="button"
              className="generate-btn"
              onClick={handleGenerateExcel}
              disabled={isLoading || toSend.length === 0}
            >
              {isLoading ? `Procesando ${toSend.length} archivo${toSend.length === 1 ? "" : "s"}…` : "Generar Excel Unificado"}
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

XmlToExcel.propTypes = {
  apiUrl: PropTypes.string,
};

export default XmlToExcel;
