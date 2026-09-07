'use client';

import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { featureName, themes, type Source, type TerritoryFeature } from '@/lib/territory';
import { geometryBounds, populationLabel } from '@/lib/view';
import { SatelliteMedia } from './satellite-media';

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value : 'Información pendiente de integrar';
export function FeatureDetails({ feature, source, onEvidence }: { feature: TerritoryFeature; source?: Source; onEvidence: (id: string) => void }) {
  const p = feature.properties;
  const locality = p.theme === 'localities';
  const theme = themes.find(t => t.id === p.theme);
  const relations = p.relations as Record<string, number> | undefined;
  const bounds = geometryBounds(feature.geometry);
  const center: [number, number] | undefined = bounds ? [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2] : undefined;
  return <>
    {locality && <div className="primary-fact"><strong>{populationLabel(p.population_2020)}</strong><span>Habitantes · Censo 2020</span></div>}
    {center && <SatelliteMedia coordinates={center} bounds={bounds ?? undefined} title={featureName(feature)} compact />}
    <div className="feature-source"><span>Fuente: {source?.Institución ?? (String(p.source_id).startsWith('S0') ? 'INEGI' : 'CONABIO')}</span><span className="badge derived">Derivado</span></div>
    <p className="feature-description">{theme?.description}</p>
    <p className="scope-note">{theme?.limitation}</p>
    {locality && <details className="reading-details"><summary>Coincidencias cartográficas</summary>
      <p>Geometrías preparadas que intersectan el polígono de esta localidad.</p>
      <dl className="relation-list">{themes.filter(t => t.id !== 'localities').map(t => <div key={t.id}><dt>{t.title}</dt><dd>{relations?.[t.id] ?? 'Pendiente'}</dd></div>)}</dl>
      <p className="fine-print">Conteo derivado por intersección geométrica, incluidos contactos de borde. No mide superficie, abundancia, cobertura completa ni condición actual.</p>
      <p className="fine-print">Infraestructura, riesgos y ordenamiento no están integrados. Su ausencia aquí no implica ausencia en el territorio. No se incluyen datos catastrales.</p>
    </details>}
    <details className="reading-details"><summary>Origen y preparación</summary>
      <dl className="metadata-list">
        <dt>Origen</dt><dd><span className="badge official">Oficial</span> · {text(p.source_id)}</dd>
        <dt>Fecha</dt><dd>{text(p.date)}</dd>
        {locality && <><dt>Clave INEGI</dt><dd>{text(p.cvegeo)}</dd></>}
        {typeof p.Clase === 'number' && <><dt>Clase original</dt><dd>{p.Clase} · {text(p.Descrip)}</dd></>}
        <dt>Identificador</dt><dd className="mono">{text(p.record_id)}</dd>
        <dt>Recorte</dt><dd>{p.clipped ? 'Intersección con el encuadre operativo' : 'Geometría dentro del encuadre'}</dd>
        <dt>Simplificación</dt><dd>{typeof p.simplification_m === 'number' ? p.simplification_m + ' m, preservando topología' : 'Información pendiente de integrar'}</dd>
        {typeof p.source_row === 'number' && <><dt>Fila original</dt><dd>{p.source_row} (índice desde 0)</dd></>}
        <dt>SHA-256 original</dt><dd className="mono">{text(p.source_hash)}</dd>
      </dl>
      <p className="fine-print">Geometría seleccionada, recortada y simplificada por EVEN para visualización. No es un nuevo dato publicado por la institución.</p>
    </details>
    <Button className="source-button" onClick={() => onEvidence(String(p.source_id))}>Ver fuente y evidencia <ArrowUpRight /></Button>
    {source && <a className="text-link" href={source.URL} target="_blank" rel="noreferrer">Abrir fuente original <ArrowUpRight /></a>}
  </>;
}
