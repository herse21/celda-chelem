# Celda Chelem — prototipo interactivo

Prototipo territorial de EVEN para el Colectivo por la Costa, desarrollado después de la autorización expresa de la Etapa B. Integra cuatro datasets oficiales auditados y utilizables con transformación para representar cinco temas: costa de referencia, localidades, manglar 2020, otros humedales 2020 y cuerpos de agua 2020.

## Uso

La experiencia abre con una vista regional y un acercamiento progresivo al área preliminar. En el mapa se pueden activar temas, seleccionar geometrías, abrir fichas trazables, consultar fuentes y seguir el recorrido **Entender la celda**. Chelem, Chuburná y Progreso también están disponibles como lista, de modo que las fichas no dependan exclusivamente del mapa.

No incluye límites científicos de celda/subcelda, cambio histórico, tasas de erosión, riesgo calculado, predicciones, catastro ni recomendaciones de obra. Ordenamiento e infraestructura permanecen como ampliaciones condicionadas.

## Reproducción

Requisitos de preparación: Python 3.12 con Shapely 2.1.2, PyProj 3.7.2 y PyShp 3.1.6. Requisitos de la aplicación: Node 22.13 o posterior y pnpm.

```sh
work/venv/bin/python celda-chelem/scripts/prepare_data.py
cd celda-chelem
pnpm install
pnpm dev
```

Si los originales están en otro paquete:

```sh
python scripts/prepare_data.py --originals-root /ruta/al/paquete
```

Ese directorio debe conservar `work/originals`, `work/extracted`, `work/dinamica_riesgos`, `work/stage_b/originals`, `evidence/download_manifest.json` e `inputs/`. La preparación aborta si cambió el hash de un original o aparece una geometría seleccionada inválida.

## Verificación

```sh
python tests/verify_data.py
pnpm lint
pnpm build
```

Consulta [arquitectura y preparación](docs/ARCHITECTURE.md), [entrega científica](docs/SCIENTIFIC_HANDOFF.md) y el [registro de preparación](docs/DATA_PREPARATION.json). La investigación, auditoría y originales se conservan en la entrega de Etapa A.

## Imagen del territorio

El explorador muestra Esri World Imagery después de la portada y mantiene los cinco temas oficiales encima. Las ventanas visuales de cada sección se centran en Chelem, Chuburná, Progreso, Yucalpetén o en el objeto seleccionado. Consulta [procedencia y fechas de imagen](docs/IMAGERY.md) y el registro legible por máquina en `public/data/imagery-sources.json`.

La imagen es un mosaico de múltiples fechas. No se presenta como vista en vivo ni se utiliza para una comparación histórica o una medición científica.

## Colaboración

El código se publica para colaboración bajo licencia MIT; las fuentes y las imágenes conservan sus propias condiciones, detalladas en [DATA_LICENSES.md](DATA_LICENSES.md). Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de proponer cambios y utiliza issues y pull requests para mantener trazabilidad técnica y científica.

La navegación está limitada al litoral de Yucatán y no permite alejarse hasta una vista mundial. Este límite de interfaz es operativo y no constituye una delimitación científica de celda.
