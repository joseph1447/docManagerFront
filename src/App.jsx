import { useState } from "react";
import { useDropzone } from "react-dropzone";
import "./App.css";

const App = () => {
  const [files, setFiles] = useState([]);

  // Configuración de Dropzone
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/xml": [".xml"]
    },
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
    },
  });

  // Renderizado de archivos subidos
  const renderFiles = () =>
    files.map((file, index) => (
      <li key={index} className="file-item">
        {file.name}
      </li>
    ));

    const handleGenerateExcel = async () => {
      if (files.length === 0) {
        alert("No hay archivos para procesar.");
        return;
      }
    
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file); // Usa "files" como clave para múltiples archivos
      });
    
      try {
        const response = await fetch("https://docmanagerapi.onrender.com/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Error al generar el Excel.");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "resultado.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("¡Excel generado exitosamente!");
      } catch (error) {
        console.error("Error:", error);
        alert("Error al procesar los archivos.");
      }
    };
    
    

  return (
    <div className="app-container">
      <h1 className="title">Doc Manager</h1>
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        <p>Arrastra tus archivos XML aquí o haz clic para seleccionarlos</p>
      </div>
      <div className="files-container">
        <h2>Archivos subidos:</h2>
        <ul>{renderFiles()}</ul>
      </div>
      {files.length > 0 && (
        <button className="generate-btn" onClick={handleGenerateExcel}>
          Generar Excel Unificado
        </button>
      )}
    </div>
  );
};

export default App;
