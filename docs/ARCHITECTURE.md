# Arquitectura del prototipo — Etapa B

Estado: versión piloto autorizada, 3 de septiembre de 2026.

## Producto

La aplicación es una experiencia cartográfica de una sola página. `app/page.tsx` abre el explorador; `components/territory-map.tsx` contiene la integración MapLibre; las fichas, fuentes y el recorrido viven en componentes separados. No utiliza imágenes base ni servicios cartográficos en tiempo de ejecución: carga derivados GeoJSON locales para mantener procedencia, rendimiento y comportamiento predecible.

El núcleo usa cuatro datasets oficiales para cinco temas: S01 costa, S02 localidades, S12 manglar, S13 clase 7 otros humedales y S13 clase 8 cuerpos de agua. El fondo regional S50, áreas geoestadísticas estatales de INEGI, es contexto de navegación y no cuenta como dataset temático. Los puntos de puertos solo intervienen en el criterio reproducible del encuadre; no se publican como capa.

## Separación de datos

- `scripts/prepare_data.py`: verifica hashes originales, reproyecta, selecciona, recorta y simplifica derivados para pantalla.
- `public/data/*.geojson`: resultados derivados; cada objeto conserva fuente, hash original, fila o clave y parámetros de preparación.
- `public/data/preparation.json`: manifiesto de preparación, conteos y hashes de las salidas.
- `public/data/sources.json`: metadatos de los cuatro insumos del núcleo.
- `public/data/metadata-evidence.zip`: copias pequeñas de metadatos y condiciones de reutilización.
- `tests/verify_data.py`: controles enfocados de clases, claves, hashes y conservación de originales.

Los originales continúan fuera de la aplicación, en el directorio `work/` de Etapa A. S13 no se incorpora al paquete de despliegue. La preparación acepta otro directorio mediante `--originals-root` si se entrega un paquete de datos separado con la misma estructura.

## Alcance geográfico

La ventana de auditoría fue `[-89.84502487, 21.24884325, -89.62435775, 21.34922077]`. La visualización usa un ámbito operativo distinto: la envolvente, en UTM 16N, de los polígonos oficiales de Chelem, Chuburná y Progreso y los puntos oficiales de Chuburná/Yucalpetén, ampliada 3 km. El bbox exacto queda en `public/data/config.json` y el método en `preparation.json`.

Este encuadre es una decisión operativa de preparación. Se muestra como **Área preliminar de estudio**, no como Celda Chelem científicamente delimitada; ofrece cobertura parcial de laguna y zona marina. SCI01–SCI03 continúan bloqueando límites e interpretaciones científicamente validados.

## Rendimiento y acceso

Las seis colecciones preparadas pesan aproximadamente 4 MB sin compresión y 1.4 MB con gzip. El código importa MapLibre solo en el cliente y carga todas las colecciones en paralelo. Las fuentes y la lista de localidades tienen rutas de acceso aun si WebGL falla. El despliegue no almacena usuarios ni información personal y no requiere base de datos.
