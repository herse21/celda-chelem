'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeft, ArrowRight, BookOpen, Compass, Layers2, Minus, Plus, Waves, X, LocateFixed, Info, Route, MapPin, Satellite, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TerritoryMap, type MapHandle } from './territory-map';
import { EvidencePanel, AboutPanel } from './evidence-panel';
import { FeatureDetails } from './feature-details';
import { SatelliteMedia } from './satellite-media';
import type { ImageryPlace } from '@/lib/imagery';
import { allVisible, featureName, themes, type MapConfig, type Source, type TerritoryData, type TerritoryFeature, type Visibility } from '@/lib/territory';
import { chapters, openingLines } from '@/lib/guide';

type Panel = 'sources' | 'about' | 'places' | null;
export default function Explorer() {
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [data, setData] = useState<TerritoryData | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(allVisible);
  const [imageryVisible, setImageryVisible] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [selected, setSelected] = useState<TerritoryFeature | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [sourceFocus, setSourceFocus] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const beforeGuide = useRef<Visibility>(allVisible);
  const map = useRef<MapHandle>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function get<T>(name: string): Promise<T> {
      const r = await fetch(`/data/${name}`, { signal: controller.signal });
      if (!r.ok) throw new Error(`No pudimos cargar ${name}.`);
      return r.json() as Promise<T>;
    }
    // Evidence remains available even if the map or WebGL fails.
    get<Source[]>('sources.json').then(setSources).catch(() => {});
    Promise.all([get<MapConfig>('config.json'), Promise.all(['context', ...themes.map(t => t.id)].map(id => get<TerritoryData['context']>(`${id}.geojson`)))]).then(([cfg, collections]) => {
      setConfig(cfg); setData(Object.fromEntries(['context', ...themes.map(t => t.id)].map((id, i) => [id, collections[i]])) as TerritoryData);
    }).catch((e: Error) => { if (e.name !== 'AbortError') setError('No se pudieron cargar los datos. Comprueba tu conexión y vuelve a intentarlo.'); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (opening === null) return;
    const timer = window.setTimeout(() => setOpening(opening < openingLines.length - 1 ? opening + 1 : null), 1600);
    return () => window.clearTimeout(timer);
  }, [opening]);
  function enter() {
    setEntered(true);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setOpening(0);
  }
  function showEvidence(id: string | null = null) { setSourceFocus(id); setSelected(null); setPanel('sources'); }
  function guide(index: number) {
    if (chapter === null) beforeGuide.current = visibility;
    setOpening(null); setEntered(true); setImageryVisible(true); setChapter(index); setLayersOpen(false); setSelected(null); setPanel(null);
    setVisibility(chapters[index].visibility);
    if (chapters[index].place) map.current?.place(chapters[index].place); else map.current?.home();
  }
  function endGuide() { setChapter(null); setVisibility(beforeGuide.current); }
  function selectPlace(id: string) {
    const f = data?.localities.features.find(f => f.id === id);
    setPanel(null); setEntered(true); setImageryVisible(true); setOpening(null); setLayersOpen(false);
    if (chapter !== null) endGuide();
    setVisibility(v => ({ ...v, localities: true }));
    if (f) setSelected(f);
    map.current?.place(id);
  }
  const source = selected ? sources.find(s => s.ID === selected.properties.source_id) : undefined;
  const titles = { sources: 'Cada dato tiene un origen.', about: 'Antes de proponer, comprender.', places: 'Tres localidades. Un litoral.' };
  const descriptions = { sources: 'Cuatro datasets oficiales auditados, utilizables con transformación. Cinco temas.', about: 'Una herramienta de conversación para el Colectivo por la Costa.', places: 'Abre una ficha o sitúa una localidad en el mapa. Polígonos geoestadísticos, no predios.' };
  return <main className={`explorer ${entered ? 'is-entered' : 'is-intro'}`}>
    {config && data && <TerritoryMap ref={map} config={config} data={data} visibility={visibility} imageryVisible={imageryVisible} entered={entered} selected={selected} onSelect={setSelected} onReady={() => setReady(true)} onError={setError} />}
    <div className="map-vignette" aria-hidden="true" />
    <header className="topbar">
      <button className="brand" onClick={() => { setEntered(false); setSelected(null); setOpening(null); if (chapter !== null) endGuide(); }} aria-label="Celda Chelem, inicio"><Waves size={27} strokeWidth={1.5} /><span>CELDAS LITORALES<small>CHELEM · PROTOTIPO</small></span></button>
      <nav aria-label="Navegación principal">
        {entered && <Button variant="ghost" className="nav-button" onClick={() => { if (chapter !== null) endGuide(); setLayersOpen(!layersOpen); }} aria-expanded={layersOpen} aria-label="Capas"><Layers2 /><span>Capas</span></Button>}
        <Button variant="ghost" className="nav-button" onClick={() => showEvidence()} aria-label="Fuentes"><BookOpen /><span>Fuentes</span></Button>
        <Button variant="ghost" className="nav-button" onClick={() => guide(0)} disabled={!ready} aria-label="Entender la celda"><Route /><span>Entender la celda</span></Button>
        <Button variant="ghost" className="nav-button" onClick={() => { setSelected(null); setPanel('about'); }} aria-label="Acerca del proyecto"><Info /><span>Acerca del proyecto</span></Button>
      </nav>
    </header>
    {!entered && <section className="intro" aria-labelledby="hero-title">
      <p className="eyebrow"><span className="live-dot" /> YUCATÁN · MÉXICO</p>
      <h1 id="hero-title">CELDA<br /><span>CHELEM</span></h1>
      <p className="intro-statement">Una nueva forma<br />de leer la costa.</p>
      <p className="intro-copy">Prototipo de integración territorial<br />para el Colectivo por la Costa.</p>
      <Button className="explore-button" disabled={!ready || !!error} onClick={enter}>{ready ? 'EXPLORAR CELDA' : 'PREPARANDO EL TERRITORIO'}<ArrowDownRight size={21} /></Button>
      <div className="intro-note"><span>ÁREA PRELIMINAR DE ESTUDIO</span><p>Yucalpetén — Chelem — Chuburná</p></div>
    </section>}
    {!entered && <div className="intro-coordinates" aria-hidden="true"><span>UNA COSTA.<br />DISTINTAS LECTURAS.</span><div className="vertical-rule" /><small>INFORMACIÓN OFICIAL<br />INTERPRETACIÓN ABIERTA</small></div>}
    {entered && <>
      <div className="territory-heading"><p className="eyebrow">ÁREA PRELIMINAR DE ESTUDIO</p><h1>Chelem<span> / Yucatán</span></h1><Button variant="ghost" className="places-button" onClick={() => { setSelected(null); setPanel('places'); }}><MapPin size={14} /> Explorar localidades <ArrowUpRight size={13} /></Button></div>
      {opening === null && chapter === null && layersOpen && <aside className="layer-panel" aria-label="Capas territoriales"><div className="panel-heading"><span>Leer el territorio</span><Button variant="ghost" size="icon" aria-label="Cerrar capas" onClick={() => setLayersOpen(false)}><X /></Button></div><p className="panel-kicker">5 temas · 4 conjuntos oficiales</p>
        <div className="basemap-choice"><span>Fondo</span><div><Button variant={imageryVisible?'default':'ghost'} onClick={()=>setImageryVisible(true)} aria-pressed={imageryVisible}><Satellite /> Playa real</Button><Button variant={!imageryVisible?'default':'ghost'} onClick={()=>setImageryVisible(false)} aria-pressed={!imageryVisible}><Map /> Técnico</Button></div><small>Imagen satelital disponible, con fecha y proveedor documentados.</small></div>
        {themes.map(theme => <div className="layer-row" key={theme.id}><span className={`legend-swatch ${theme.id === 'coast' ? 'is-line' : ''}`} style={{ '--swatch': theme.color } as CSSProperties} /><div><label htmlFor={`layer-${theme.id}`}>{theme.title}</label><small>{theme.date}</small></div><Switch id={`layer-${theme.id}`} checked={visibility[theme.id]} onCheckedChange={checked => { setVisibility(v => ({ ...v, [theme.id]: checked })); if (selected?.properties.theme === theme.id) setSelected(null); }} aria-label={`Mostrar ${theme.title}`} /></div>)}
        <div className="layer-panel-bottom"><Info size={14} /><p>Geometrías transformadas para visualización. Selecciona un elemento para conocer su origen.</p></div>
      </aside>}
      {chapter !== null && <aside className="guide-panel" aria-label="Entender la celda"><div className="guide-top"><p className="eyebrow">ENTENDER LA CELDA</p><Button variant="ghost" size="icon" aria-label="Cerrar recorrido" onClick={endGuide}><X /></Button></div><div className="guide-progress" aria-label={`Capítulo ${chapter + 1} de 7`}>{chapters.map((c, i) => <button key={c.title} className={i === chapter ? 'active' : ''} onClick={() => guide(i)} aria-label={`Capítulo ${i + 1}: ${c.title}`} aria-current={i === chapter ? 'step' : undefined}><span /></button>)}</div><div aria-live="polite"><p className="chapter-number">0{chapter + 1} / 07</p><h2>{chapters[chapter].title}</h2><SatelliteMedia place={(['chelem','chelem','yucalpeten','chuburna','chelem','progreso','chelem'] as ImageryPlace[])[chapter]} compact /><p className="guide-copy">{chapters[chapter].text}</p><p className="guide-note">{chapters[chapter].note}</p></div>{chapters[chapter].evidence && <Button variant="outline" onClick={() => showEvidence()}>Consultar fuentes <BookOpen /></Button>}<div className="guide-navigation"><Button variant="ghost" size="icon" disabled={chapter === 0} aria-label="Capítulo anterior" onClick={() => guide(chapter - 1)}><ArrowLeft /></Button><Button variant="ghost" onClick={() => chapter === 6 ? endGuide() : guide(chapter + 1)}>{chapter === 6 ? 'Explorar libremente' : 'Siguiente'}<ArrowRight /></Button></div></aside>}
      <fieldset className="map-tools" aria-label="Controles del mapa"><Button variant="ghost" size="icon-lg" aria-label="Acercar" onClick={() => map.current?.zoom(1)}><Plus /></Button><Button variant="ghost" size="icon-lg" aria-label="Alejar" onClick={() => map.current?.zoom(-1)}><Minus /></Button><span /><Button variant="ghost" size="icon-lg" aria-label="Volver al área de Chelem" onClick={() => map.current?.home()}><LocateFixed /></Button><Button variant="ghost" size="icon-lg" aria-label="Orientar al norte" onClick={() => map.current?.north()}><Compass /></Button></fieldset>
      {opening === null && chapter === null && <div className="explore-hint"><span className="live-dot" /> Selecciona el territorio. Abre su evidencia.</div>}
      {opening !== null && <div className="opening-narrative"><p key={opening}>{openingLines[opening]}</p><Button variant="ghost" onClick={() => setOpening(null)}>Ir al mapa <ArrowRight size={15} /></Button></div>}
    </>}
    {error && <div className="map-error" role="alert"><h2>No se pudo abrir el mapa</h2><p>{error}</p><Button onClick={() => window.location.reload()}>Volver a intentar</Button><Button variant="outline" onClick={() => showEvidence()}>Consultar fuentes</Button>{data && <Button variant="outline" onClick={() => setPanel('places')}>Ver localidades</Button>}</div>}
    <footer className="map-footer"><div className="map-attribution">Datos: INEGI · CONABIO <span> / </span>{entered && imageryVisible ? 'Imagen: Esri · Vantor · Earthstar' : 'Preparación: EVEN'}</div></footer>
    <Sheet open={!!panel} onOpenChange={open => { if (!open) setPanel(null); }}><SheetContent className="information-sheet"><SheetHeader><p className="eyebrow">CELDA CHELEM</p><SheetTitle>{titles[panel ?? 'sources']}</SheetTitle><SheetDescription>{descriptions[panel ?? 'sources']}</SheetDescription></SheetHeader><div className="sheet-scroll">{panel === 'sources' ? <EvidencePanel sources={sources} focus={sourceFocus} /> : panel === 'places' ? <div className="place-list">{config?.places.map(p => {const id=p.name==='Chuburná'?'chuburna':p.name.toLowerCase() as ImageryPlace;return <article key={p.id}><SatelliteMedia place={id} compact /><button onClick={() => selectPlace(p.id)}><span><small>LOCALIDAD · INEGI</small>{p.name}</span><ArrowUpRight /></button></article>})}{!config && <p>Las localidades aún no están disponibles. Vuelve a cargar la página.</p>}</div> : <AboutPanel />}</div></SheetContent></Sheet>
    <Sheet modal={false} open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><SheetContent className="feature-sheet"><SheetHeader><p className="eyebrow">LECTURA TERRITORIAL</p><SheetTitle>{selected ? featureName(selected) : 'Elemento'}</SheetTitle><SheetDescription>{selected ? themes.find(t => t.id === selected.properties.theme)?.description : ''}</SheetDescription></SheetHeader>{selected && <div className="sheet-scroll"><FeatureDetails feature={selected} source={source} onEvidence={showEvidence} /></div>}</SheetContent></Sheet>
  </main>;
}
