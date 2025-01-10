import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./XmlToExcel.css";

const XmlToExcel = () => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/xml": [".xml"],
    },
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((file) => {
          toast.error(
            `Archivo "${file.file.name}" no es XML. Formato no soportado.`
          );
        });
      }
      setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    },
  });

  const handleGenerateExcel = async () => {
    if (files.length === 0) {
      toast.warning("No hay archivos para procesar.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Error desconocido al generar el Excel.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "resultado.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("¡Excel generado exitosamente!");
    } catch (error) {
      console.error("Error al procesar los archivos:", error);
      toast.error(
        `Error al procesar los archivos: ${error.message || "Desconocido"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFiles = () => {
    setFiles([]);
    toast.info("Archivos eliminados.");
  };

  return (
    <div className="tool-container">
      <ToastContainer />
      <h1 className="tool-title">Convertir XML a Excel</h1>
      {files.length === 0 ? (
        <div {...getRootProps({ className: "dropzone" })}>
          <input {...getInputProps()} />
          <p>Arrastra tus archivos XML aquí o haz clic para seleccionarlos</p>
        </div>
      ) : (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={index} className="file-item">
              <span className="file-icon">📄</span>
              <span className="file-name">{file.name}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="button-container">
        {files.length > 0 && (
          <>
            <button
              className="generate-btn"
              onClick={handleGenerateExcel}
              disabled={isLoading}
            >
              {isLoading ? "Procesando..." : "Generar Excel Unificado"}
            </button>
            <button className="clear-btn" onClick={handleClearFiles}>
              Limpiar Archivos
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default XmlToExcel;
