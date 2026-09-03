'use client';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { themes, type Source, type TerritoryFeature } from '@/lib/territory';
export function FeatureDetails({ feature, source, onEvidence }: { feature: TerritoryFeature; source?: Source; onEvidence: (id: string) => void }) {
  const p = feature.properties;
  const locality = p.theme === 'localities';
  const relations = (p.relations ?? {}) as Record<string, number>;
  return <><div className="badge-row"><span className="badge official" title="Dato publicado por una institución pública">ORIGEN OFICIAL</span><span className="badge derived" title="Información preparada a partir de fuentes oficiales. No corresponde a un dato publicado directamente por la institución.">DERIVADO</span></div>
    <dl className="feature-meta"><dt>Fuente</dt><dd>{source?.Institución} · {typeof p.source_id === 'string' ? p.source_id : ''}</dd><dt>Fecha</dt><dd>{typeof p.date === 'string' ? p.date : ''}</dd>{locality && <><dt>Población 2020</dt><dd>{Number(p.population_2020).toLocaleString('es-MX')} habitantes</dd><dt>Clave INEGI</dt><dd>{typeof p.cvegeo === 'string' ? p.cvegeo : ''}</dd></>}{typeof p.Clase === 'number' && <><dt>Clase original</dt><dd>{p.Clase} · {typeof p.Descrip === 'string' ? p.Descrip : ''}</dd></>}<dt>Identificador</dt><dd className="mono">{typeof p.record_id === 'string' ? p.record_id : ''}</dd></dl>
    <div className="notice"><b>Alcance de esta lectura</b><p>{themes.find(t => t.id === p.theme)?.limitation}</p></div>
    {locality && <section className="territory-relations"><h3>Coincidencias cartográficas</h3><p>En el polígono de esta localidad intersectan estas geometrías preparadas:</p><dl className="feature-meta">{themes.filter(t => t.id !== 'localities').map(t => <div className="relation-row" key={t.id}><dt>{t.title}</dt><dd>{relations[t.id] ?? 0}</dd></div>)}</dl><p className="fine-print">Conteo derivado por intersección geométrica, incluidos contactos de borde. No mide superficie, abundancia, cobertura completa ni condición actual.</p><h3>Lecturas pendientes</h3><p className="fine-print">Infraestructura, riesgos y ordenamiento no están integrados en esta ficha. Su ausencia aquí no implica ausencia en el territorio. No se incluyen datos catastrales.</p></section>}
    <details className="trace-details"><summary>Cómo se preparó este elemento</summary><dl className="feature-meta"><dt>Recorte</dt><dd>{p.clipped ? 'Intersección con el encuadre operativo' : 'Geometría dentro del encuadre'}</dd><dt>Simplificación</dt><dd>{typeof p.simplification_m === 'number' ? p.simplification_m : ''} m, preservando topología</dd>{typeof p.source_row === 'number' && <><dt>Fila original</dt><dd>{p.source_row} (índice desde 0)</dd></>}<dt>SHA-256 original</dt><dd className="mono">{typeof p.source_hash === 'string' ? p.source_hash : ''}</dd></dl></details>
    <p className="fine-print">Geometría seleccionada, recortada y simplificada por EVEN para visualización. Esta preparación no es un nuevo dato publicado por la institución.</p>
    <Button className="source-button" onClick={() => onEvidence(String(p.source_id))}>Ver evidencia y fuente <ArrowUpRight /></Button>
    {source && <a className="text-link" href={source.URL} target="_blank" rel="noreferrer">Abrir fuente original <ArrowUpRight size={16} /></a>}
  </>;
}
