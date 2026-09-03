# Imagen real del territorio

Actualización del 3 de septiembre de 2026.

## Decisión de integración

La portada conserva la representación técnica solicitada. Una vez dentro del explorador, el fondo predeterminado utiliza **Esri World Imagery** y puede recorrerse, acercarse y alejarse con las capas oficiales encima. Todas las secciones internas —recorrido, localidades, fichas, fuentes y acerca del proyecto— incluyen una ventana satelital del sitio al que se refieren.

No se copiaron capturas ni teselas de Google Maps o Google Earth. La integración oficial de Google requiere habilitar facturación, una clave de API, sesiones por cliente, atribución dinámica y obedecer restricciones de almacenamiento y reutilización. El prototipo usa el servicio cartográfico documentado de Esri directamente en tiempo de visualización; las imágenes no se guardan en el despliegue.

## Comprobación puntual de actualidad

El 3 de septiembre de 2026 se consultó el metadato `identify` de World Imagery en cuatro puntos. El registro completo está en `public/data/imagery-sources.json`.

| Sitio | Fecha de captura publicada | Proveedor / sensor | Resolución publicada | Exactitud publicada |
|---|---:|---|---:|---:|
| Chelem | 13-02-2025 | Vantor / WorldView-3 | 0.31 m | 5 m |
| Chuburná | 23-03-2025 | Vantor / WorldView-3 | 0.31 m | 5 m |
| Progreso | 14-04-2025 | Vantor / GeoEye-2 | 0.34 m | 5 m |
| Yucalpetén | 21-09-2023 | Vantor / WorldView-2 | 0.5 m | 5 m |

La fecha cambia según el punto: World Imagery es un mosaico de múltiples capturas, no una vista en vivo ni una serie temporal homogénea. La resolución y exactitud son metadatos del proveedor y no demuestran precisión equivalente para identificar la línea de costa. La imagen se usa como contexto visual y no se emplea para medir erosión, comparar años ni derivar nuevos polígonos.

Atribución visible: Esri, Vantor, Earthstar Geographics y GIS User Community. Servicio: `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer`.
