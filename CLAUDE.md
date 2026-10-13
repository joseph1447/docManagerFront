# docManagerFront

Front (Vite + React 18, JS) de DocManager. Producción en Vercel (`doc-manager-front.vercel.app`, team `wedoitwithai`), se despliega solo al hacer push a `main`.
`vercel.json` manda todas las rutas a `index.html`: sin eso, abrir o recargar `/admin/xml-to-excel` da 404 (lo protege `src/deploy.test.js`).
La API es otro repo: **`C:\Repos\docManagerAPI`** (Express en Render, plan gratis). La usan el chatbot, las criptos y el login; **XML → Excel ya no la usa**.
Herramienta principal para la clienta: **XML → Excel** (`/admin/xml-to-excel`), que convierte facturas y tiquetes electrónicos de Hacienda en un Excel unificado.

## XML → Excel se procesa en el navegador

Desde 2026-10 los XML no se suben a ningún servidor: se leen con `DOMParser` y el Excel se arma con ExcelJS en la compu de la clienta. Motivo: Render gratis se duerme a los 15 min y un upload grande con la API dormida se quedaba colgado 5 min. Además no hay límite de cantidad (600 facturas ≈ 1 s en Chrome/Firefox, ≈ 5 s en Safari).

- `src/components/XmlToExcel/processing/invoiceParser.js`: lee un XML → fila del Excel + metadatos + advertencias, o lanza `InvoiceFileError` con `code`, `message`, `hint`, `details`.
- `src/components/XmlToExcel/processing/processInvoices.js`: procesa el lote, arma el reporte por archivo (`{ summary, files: [{ index, fileName, status, error, warnings, ... }] }`) y el Excel. `COLUMNS` es lo que recibe la contabilidad de la clienta: no tocar sin que ella lo pida.
- ExcelJS (~270 KB gzip) se carga con `import()` solo en esta página.
- **Sin límite de cantidad de archivos**: no volver a poner tope. Solo un tope de 50 MB por archivo para que un archivo gigante agregado por error no congele la pestaña.
- `POST /upload` de la API sigue existiendo pero el front no lo llama.

## Antes de dar algo por terminado

```bash
npm run check   # lint + pruebas (Vitest) + build. Tiene que pasar completo.
```

- Cada bug que arregles lleva una prueba que falle sin el arreglo.
- Para cambios de UI, verifica en el navegador (`npm run dev`). Para entrar a `/admin/*` sin Google: `localStorage.user = '{"name":"QA"}'`.
- Los mensajes de error del XML cambian según el navegador (Chrome/Safari, Firefox en inglés o español). Si tocas `describeParserError`, agrega el texto real a la tabla de su prueba.
- `npm run test:watch` mientras desarrollas.

## Pruebas (dónde va cada cosa)

| Archivo | Qué protege |
| --- | --- |
| `src/App.smoke.test.jsx` | Todas las rutas siguen renderizando (Dashboard, Legal, login, XML→Excel). |
| `src/deploy.test.js` | `vercel.json` sigue mandando las rutas a la SPA. |
| `processing/invoiceParser.test.js` | Un caso por fixture (estado y código), detección de PDF/ZIP/HTML, codificaciones y mensajes de cada navegador. |
| `processing/processInvoices.test.js` | Lote: orden, resumen, duplicados, 600 archivos, progreso. |
| `processing/excelCompat.test.js` | **El Excel no cambia**: compara fila por fila contra la implementación original (xml2js) congelada en `src/test/legacy/`. No editar ese archivo. Si esta prueba falla, cambiaste lo que recibe la clienta. |
| `fileSelection.test.js` | Lista de archivos: duplicados, vacíos, tamaño, tipo, mapeo del reporte por índice. |
| `feedbackReport.test.js` | Texto de «Copiar reporte de errores». |
| `XmlToExcel.test.jsx` | Flujo completo de la pantalla con XML reales; verifica que no se contacta ningún servidor. |

`fetch` está simulado por defecto en `src/test/setup.js`: ninguna prueba sale a internet.

## Cuando la clienta reporta un XML que falla

1. Pide el XML y el texto de «Copiar reporte de errores» (trae la versión desplegada y el detalle técnico).
2. Anonimízalo (nombres, cédulas, montos) y guárdalo en `src/test/fixtures/`.
3. Agrega una fila a `CASES` en `processing/invoiceParser.test.js` con el estado y código esperados. Debe fallar.
4. Arregla `invoiceParser.js` hasta que pase, sin romper `excelCompat`.

## Códigos de error por archivo

Error (el archivo NO entra al Excel): `EMPTY_FILE`, `NOT_XML` (PDF/ZIP/HTML con extensión .xml), `INVALID_XML` (`details.line/column/parserMessage`), `UNSUPPORTED_DOCUMENT` (MensajeHacienda, notas de crédito/débito, FE compra/exportación u otro XML; `details.rootElement`), `INVALID_DATE`, `UNEXPECTED_PARSE_ERROR` (si aparece, convertirlo en un caso con su propio código).
Advertencia (SÍ entra, como antes): `MISSING_FIELDS`, `INVALID_AMOUNT`, `DUPLICATE_DOCUMENT`.
Al agregar archivos: `EMPTY_FILE`, `FILE_TOO_LARGE`, `NOT_XML_EXTENSION`. General: `NO_VALID_FILES`, `EXCEL_GENERATION_FAILED` (p. ej. no cargó ExcelJS tras un deploy: recargar).

## Reglas para el manejo de errores (la clienta depende de esto)

- Todo error que vea el usuario dice **qué archivo**, **qué pasó** y **cómo resolverlo** (`message` + `hint`), y conserva `code` + `details` para desarrollo.
- Los errores por archivo se quedan en la lista (no solo en un toast que desaparece).
- «Copiar reporte de errores» es el canal de feedback: si agregas datos útiles para depurar, agrégalos a `feedbackReport.js`.

## Conocido / pendiente

- `Fecha` usa `toISOString()` (UTC): una factura emitida después de las 18:00 hora de Costa Rica sale con la fecha del día siguiente. Se mantiene igual que antes a propósito (lo fija `excelCompat`); corregirlo es un cambio visible para la clienta.
- Notas de crédito/débito no se procesan todavía (`UNSUPPORTED_DOCUMENT`).
- En móvil (<768 px) el `SidePanel` fijo tapa ~70 px del contenido de `/admin/*`.
- `.env` está versionado; solo tiene variables públicas `VITE_*`. No agregar secretos ahí.
