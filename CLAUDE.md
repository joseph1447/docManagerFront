# docManagerFront

Front (Vite + React 18, JS) de DocManager. Producción en Vercel (`doc-manager-front.vercel.app`, team `wedoitwithai`), se despliega solo al hacer push a `main`.
`vercel.json` manda todas las rutas a `index.html`: sin eso, abrir o recargar `/admin/xml-to-excel` da 404 (lo protege `src/deploy.test.js`).
La API es otro repo: **`C:\Repos\docManagerAPI`** (`github.com/joseph1447/docManagerAPI`, Express en Render).
Herramienta principal para la clienta: **XML → Excel** (`/admin/xml-to-excel`), que convierte facturas y tiquetes electrónicos de Hacienda en un Excel unificado.

## Antes de dar algo por terminado

```bash
npm run check   # lint + pruebas (Vitest) + build. Tiene que pasar completo.
```

- Si cambias la API, corre también `npm test` en `docManagerAPI`.
- Cada bug que arregles lleva una prueba que falle sin el arreglo.
- Para cambios de UI, verifica en el navegador (`npm run dev` con `VITE_API_URL=http://localhost:3000` y la API local con `node server.js`). Para entrar a `/admin/*` sin Google, pon `localStorage.user = '{"name":"QA"}'`.
- `npm run test:watch` mientras desarrollas.

## Pruebas (dónde va cada cosa)

| Archivo | Qué protege |
| --- | --- |
| `src/App.smoke.test.jsx` | Todas las rutas siguen renderizando (Dashboard, Legal, login, XML→Excel). |
| `src/components/XmlToExcel/uploadXmlFiles.test.js` | Cliente HTTP: cada tipo de error (red, timeout, 4xx/5xx, HTML, API vieja). |
| `src/components/XmlToExcel/fileSelection.test.js` | Lista de archivos: duplicados, vacíos, tamaño, tipo, mapeo del reporte por índice. |
| `src/components/XmlToExcel/feedbackReport.test.js` | Texto de «Copiar reporte de errores». |
| `src/components/XmlToExcel/XmlToExcel.test.jsx` | Flujo completo de la pantalla con `fetch` simulado. |

Las fábricas de respuestas de la API están en `src/test/factories.js`; si cambia el contrato, cámbialas ahí primero.

## Contrato con la API: `POST {VITE_API_URL}/upload`

- `multipart/form-data`, campo `files`, header `Accept: application/json`. **Sin límite de cantidad de archivos** (la clienta sube meses completos; no volver a poner tope). Solo hay un tope de 20 MB por archivo, y el front marca esos archivos sin bloquear los demás. El timeout del front crece con la cantidad (`timeoutFor`).
- **200** → `{ report, excel: { fileName, mimeType, base64 }, requestId }`.
- **400 / 413 / 422 / 500** → `{ error: { code, message, hint, details?, fileName? }, report?, requestId }`.
  - 422 `NO_VALID_FILES` incluye `report`: ningún archivo sirvió y cada uno dice por qué.
- `report = { summary: { total, processed, failed, withWarnings }, files: [{ index, fileName, status: "ok"|"warning"|"error", error, warnings[], documentType, version, consecutivo, emisor, clave }] }`.
  - `index` es la posición en que se envió el archivo; el front mapea por índice, no por nombre.
- Sin `Accept: application/json` la API responde el `.xlsx` binario (contrato viejo). El front lo soporta (`report: null`), así que front y API se pueden desplegar en cualquier orden.
- El catálogo de códigos de error está en el `CLAUDE.md` de `docManagerAPI`.

## Reglas para el manejo de errores (la clienta depende de esto)

- Todo error que vea el usuario dice **qué archivo**, **qué pasó** y **cómo resolverlo** (`message` + `hint`), y conserva `code` + `details` para desarrollo.
- Nunca mostrar texto crudo del servidor (HTML, stack) como mensaje principal; va en `details`.
- Los errores por archivo se quedan en la lista (no solo en un toast que desaparece).
- «Copiar reporte de errores» es el canal de feedback: si agregas datos útiles para depurar, agrégalos a `feedbackReport.js`.

## Conocido / pendiente

- En móvil (<768 px) el `SidePanel` fijo tapa ~70 px del contenido de `/admin/*` (`AdminLayout.css` quita el margen pero el panel sigue visible).
- `.env` está versionado; solo tiene variables públicas `VITE_*`. No agregar secretos ahí.
