import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./XmlToExcel.css";

const XmlToExcel = () => {
  const [files, setFiles] = useState([]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/xml": [".xml"],
    },
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Notificar archivos rechazados
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((file) => {
          toast.error(
            `Archivo "${file.file.name}" no es XML. Formato no soportado.`
          );
        });
      }

      // Actualizar solo con archivos válidos
      setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    },
  });

  const handleGenerateExcel = async () => {
    if (files.length === 0) {
      toast.warning("No hay archivos para procesar.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(
        "https://docmanagerapi.onrender.com/upload",
        {
          method: "POST",
          body: formData,
        }
      );

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
    }
  };

  return (
    <div className="tool-container">
      <ToastContainer />
      <h1 className="tool-title">Convertir XML a Excel</h1>
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        <p>Arrastra tus archivos XML aquí o haz clic para seleccionarlos</p>
      </div>
      <ul className="file-list">
        {files.map((file, index) => (
          <li key={index} className="file-item">
            {file.name}
          </li>
        ))}
      </ul>
      {files.length > 0 && (
        <button className="generate-btn" onClick={handleGenerateExcel}>
          Generar Excel Unificado
        </button>
      )}
    </div>
  );
};

export default XmlToExcel;
