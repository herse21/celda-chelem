'use client';

import { ArrowUpRight, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { disclaimer, type Source } from '@/lib/territory';
import { SatelliteMedia } from './satellite-media';

export function EvidencePanel({ sources, focus, state, onRetry }: {
  sources: Source[]; focus: string | null; state: 'loading' | 'ready' | 'error'; onRetry: () => void;
}) {
  const ordered = focus ? [...sources.filter(s => s.ID === focus), ...sources.filter(s => s.ID !== focus)] : sources;
  return <>
    <SatelliteMedia place="chelem" compact />
    <p className="reading-intro">Información pública, preparada para leerla en conjunto. Conservamos el origen, la fecha y los límites de cada dato.</p>
    {state === 'loading' && <output>Cargando las fuentes…</output>}
    {state === 'error' && <div role="alert"><p>No se pudo cargar el catálogo de fuentes.</p><Button variant="outline" onClick={onRetry}><RotateCcw /> Reintentar</Button></div>}
    {ordered.map(s => <details className="source-entry" key={s.ID} id={'source-' + s.ID} open={focus === s.ID || undefined}>
      <summary><span className="source-kicker">{s.ID} <span>{s.Institución}</span><span className="badge official">Oficial</span></span><span className="source-name">{s.Nombre}</span></summary>
      <div className="source-content"><dl className="metadata-list">
        <dt>Fecha del dato</dt><dd>{s.Fecha}</dd>
        <dt>Formato</dt><dd>{s.Tipo} · {s.Formato}</dd>
        <dt>Cobertura original</dt><dd>{s.Cobertura}</dd>
        <dt>Escala / resolución</dt><dd>{s.Resolución}</dd>
        <dt>Consulta</dt><dd>{s.Consulta}</dd>
        <dt>Reutilización</dt><dd>{s.Licencia}</dd>
      </dl><p className="fine-print">{s.Limitaciones}</p>
        <a className="text-link" href={s.URL} target="_blank" rel="noreferrer">Fuente original <ArrowUpRight /></a>
      </div>
    </details>)}
    <details className="source-entry"><summary><span className="source-kicker">S50 <span>INEGI · Contexto</span><span className="badge official">Oficial</span></span><span className="source-name">Áreas geoestadísticas estatales</span></summary><div className="source-content">
      <p>Marco Geoestadístico, diciembre de 2025. Campeche, Quintana Roo y Yucatán. GeoJSON EPSG:6365 preparado para el fondo regional. Consulta: 3 de septiembre de 2026.</p>
      <p className="fine-print">Contexto de navegación, separado de los cuatro conjuntos del núcleo. No define límites jurídicos ni sustituye la costa S01. Simplificación de 20 m; precisión local no certificada. Libre uso INEGI con atribución y declaración de transformaciones.</p>
      <a className="text-link" href="https://www.inegi.org.mx/servicios/catalogounico.html" target="_blank" rel="noreferrer">Documentación del servicio <ArrowUpRight /></a>
    </div></details>
    <details className="reading-details"><summary>Preparación y alcance</summary><p>Selección, reproyección, recorte y simplificación para visualización. El área preparada ofrece cobertura parcial de laguna y zona marina.</p><p>La imagen satelital es contexto visual de varias fechas. No permite medir por sí sola el cambio costero.</p>
      <a className="text-link" href="/data/imagery-sources.json" target="_blank" rel="noreferrer">Registro de imagen <ArrowUpRight /></a>
    </details>
    <div className="evidence-downloads">
      <a href="/data/preparation.json" download className="text-link"><Download /> Registro de preparación</a>
      <a href="/data/metadata-evidence.zip" download className="text-link"><Download /> Metadatos y condiciones</a>
      <a href="/data/research-catalogue.json" download className="text-link"><Download /> Catálogo de Etapa A</a>
    </div>
  </>;
}
export function AboutPanel() {
  return <>
    <SatelliteMedia place="chelem" />
    <p className="body-large">Leer juntos la costa, los ecosistemas y los lugares que habitamos.</p>
    <p>EVEN desarrolla este prototipo para el Colectivo por la Costa. Reúne información pública del corredor Yucalpetén–Chelem–Chuburná y hace visibles sus fuentes, fechas y límites.</p>
    <div className="notice"><span className="badge preliminary">Preliminar</span><p>El área de estudio aún no es una celda científicamente delimitada. Esa definición y las interpretaciones físicas requieren revisión especialista.</p></div>
    <details className="reading-details"><summary>Alcance científico</summary><p>{disclaimer}</p><p>El encuadre de navegación es operativo. La ventana de auditoría, el ámbito de visualización y la delimitación científica son distintos. No se garantiza cobertura completa de la laguna ni de la zona marina.</p></details>
    <details className="reading-details"><summary>Cómo leer los estados</summary><dl className="status-explainer">
      <dt><span className="badge official">Oficial</span></dt><dd>Origen publicado por una institución pública.</dd>
      <dt><span className="badge derived">Derivado</span></dt><dd>Información preparada a partir de fuentes oficiales. La institución no la publicó directamente en esta forma.</dd>
      <dt><span className="badge preliminary">Preliminar</span></dt><dd>Ámbito o interpretación sujeto a revisión científica.</dd>
    </dl></details>
    <p className="fine-print">Las fuentes y fichas de localidades también pueden consultarse sin seleccionar elementos en el mapa. La vista cartográfica requiere WebGL.</p>
    <p className="about-signature">Celda Chelem <span>Prototipo territorial</span></p>
  </>;
}
