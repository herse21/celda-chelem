'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowRight, BookOpen, Compass, Layers2, Minus, Plus, X, LocateFixed, Info, Route, MapPin, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TerritoryMap, type MapHandle, type Camera } from './territory-map';
import { IntroTerritory } from './intro-territory';
import { SatelliteMedia } from './satellite-media';
import type { ImageryPlace } from '@/lib/imagery';
import { allVisible, featureName, themes, type MapConfig, type Source, type TerritoryData, type TerritoryFeature, type Visibility } from '@/lib/territory';
import { chapters } from '@/lib/guide';

const EvidencePanel = lazy(() => import('./evidence-panel').then(m => ({ default: m.EvidencePanel })));
const AboutPanel = lazy(() => import('./evidence-panel').then(m => ({ default: m.AboutPanel })));
const FeatureDetails = lazy(() => import('./feature-details').then(m => ({ default: m.FeatureDetails })));
type Panel = 'layers' | 'sources' | 'about' | 'places' | 'feature' | 'guide' | null;
type SourceState = 'loading' | 'ready' | 'error';
const guidePlaces: ImageryPlace[] = ['chelem', 'chelem', 'yucalpeten', 'chuburna', 'chelem', 'progreso', 'chelem'];
const descriptions = {
  layers: 'Elige qué quieres leer en el territorio.',
  sources: 'Cuatro conjuntos oficiales. Cinco temas.',
  about: 'Una base común para comprender la costa.',
  places: 'Tres localidades conectadas por el litoral.',
  feature: 'Origen oficial · geometría preparada para visualización.',
  guide: 'Siete lecturas para comenzar a explorar.',
};
const titles = { layers: 'Capas', sources: 'Fuentes', about: 'Acerca del proyecto', places: 'Localidades', feature: 'Elemento territorial', guide: 'Entender la celda' };
async function getJson<T>(name: string, signal: AbortSignal): Promise<T> {
  const r = await fetch('/data/' + name, { signal });
  if (!r.ok) throw new Error('Información no disponible');
  return r.json() as Promise<T>;
}

export default function Explorer() {
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [context, setContext] = useState<TerritoryData['context'] | null>(null);
  const [localities, setLocalities] = useState<TerritoryData['localities'] | null>(null);
  const [data, setData] = useState<TerritoryData | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceState, setSourceState] = useState<SourceState>('loading');
  const [error, setError] = useState('');
  const [metadataError, setMetadataError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [requestedMap, setRequestedMap] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(allVisible);
  const [imageryVisible, setImageryVisible] = useState(true);
  const [imageryError, setImageryError] = useState(false);
  const [selected, setSelected] = useState<TerritoryFeature | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [returnPanel, setReturnPanel] = useState<Panel>(null);
  const [sourceFocus, setSourceFocus] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [zoomState, setZoomState] = useState({ min: false, max: false });
  const beforeGuide = useRef<{ visibility: Visibility; imagery: boolean; camera?: Camera } | null>(null);
  const map = useRef<MapHandle>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const enteredOnce = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    let disposed = false;
    getJson<Source[]>('sources.json', controller.signal).then(s => { setSources(s); setSourceState('ready'); }).catch(() => { if (!disposed) setSourceState('error'); });
    getJson<TerritoryData['context']>('context.geojson', controller.signal).then(setContext).catch(() => { if (!disposed) setMetadataError(true); });
    Promise.all([getJson<MapConfig>('config.json', controller.signal), getJson<TerritoryData['localities']>('localities.geojson', controller.signal)])
      .then(([c, l]) => { setConfig(c); setLocalities(l); })
      .catch(() => { if (!disposed) setMetadataError(true); });
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  useEffect(() => {
    if (!requestedMap || !context || !localities || !config) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    let disposed = false;
    Promise.all(['coast', 'mangrove', 'wetlands', 'water'].map(id => getJson<TerritoryData['coast']>(id + '.geojson', controller.signal)))
      .then(([coast, mangrove, wetlands, water]) => setData({ context, localities, coast, mangrove, wetlands, water }))
      .catch(() => { if (!disposed) setError('No se pudieron cargar las capas. Comprueba tu conexión e inténtalo de nuevo.'); })
      .finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [requestedMap, context, localities, config, attempt]);
  useEffect(() => {
    if (entered && !enteredOnce.current) { enteredOnce.current = true; heading.current?.focus(); }
  }, [entered]);
  const onReady = useCallback(() => setReady(true), []);
  const onMapError = useCallback((message: string) => setError(message), []);
  const onZoom = useCallback((min: boolean, max: boolean) => setZoomState({ min, max }), []);
  const onImageryError = useCallback(() => setImageryError(true), []);

  function enter() { setEntered(true); setRequestedMap(true); }
  function finishGuide(restoreCamera = true) {
    const previous = beforeGuide.current;
    setChapter(null); beforeGuide.current = null;
    if (previous) { setVisibility(previous.visibility); setImageryVisible(previous.imagery); if (restoreCamera && previous.camera) map.current?.restore(previous.camera); }
  }
  function closePanel() {
    if (panel === 'guide' || returnPanel === 'guide') finishGuide();
    setPanel(null); setReturnPanel(null); setSelected(null);
  }
  function openPanel(next: Panel) {
    if (chapter !== null) finishGuide(false);
    setSelected(null); setReturnPanel(null); setPanel(panel === next ? null : next);
  }
  function home() {
    finishGuide(false); setPanel(null); setReturnPanel(null); setSelected(null);
    setEntered(false); enteredOnce.current = false;
  }
  function showEvidence(id: string | null = null) {
    setSourceFocus(id);
    setReturnPanel(panel === 'feature' || panel === 'guide' ? panel : null);
    setPanel('sources');
  }
  function guide(index: number) {
    if (chapter === null) beforeGuide.current = { visibility, imagery: imageryVisible, camera: map.current?.capture() };
    enter(); setChapter(index); setPanel('guide'); setReturnPanel(null); setSelected(null); setImageryVisible(true);
    setVisibility(chapters[index].visibility);
    const place = chapters[index].place;
    if (place) map.current?.place(place); else map.current?.home();
  }
  function selectFeature(feature: TerritoryFeature | null) {
    if (!feature) { if (panel === 'feature') { setPanel(null); setSelected(null); } return; }
    if (chapter !== null) finishGuide(false);
    setSelected(feature); setPanel('feature'); setReturnPanel(null);
  }
  function selectPlace(id: string) {
    const feature = localities?.features.find(f => f.id === id);
    if (!feature) return;
    if (chapter !== null) finishGuide(false);
    enter(); setImageryVisible(true); setVisibility(v => ({ ...v, localities: true }));
    selectFeature(feature);
  }
  function retry() {
    setError(''); setMetadataError(false); setSourceState('loading'); setData(null); setReady(false); setImageryError(false); setAttempt(n => n + 1);
  }
  const activeCount = themes.filter(t => visibility[t.id]).length;
  const mapError = error || (metadataError ? 'No se pudo cargar la información inicial. Comprueba tu conexión.' : '');
  const currentChapter = chapter === null ? null : chapters[chapter];
  const source = selected ? sources.find(s => s.ID === selected.properties.source_id) : undefined;
  const panelTitle = panel === 'feature' && selected ? featureName(selected) : titles[panel ?? 'sources'];
  const panelIsMap = panel === 'layers' || panel === 'feature' || panel === 'guide';
  const chapterPlace = chapter === null ? 'chelem' : guidePlaces[chapter];

  return <main className={'explorer ' + (entered ? 'is-entered' : 'is-intro') + (panel ? ' has-panel' : '')}>
    <a className="skip-link" href="#primary-navigation">Ir a los controles</a>
    {!entered && <IntroTerritory context={context} config={config} />}
    {config && data && <TerritoryMap key={attempt} ref={map} config={config} data={data} visibility={visibility}
      imageryVisible={imageryVisible} entered={entered} selected={selected} panelOpen={!!panel}
      onSelect={selectFeature} onReady={onReady} onError={onMapError} onZoom={onZoom} onImageryError={onImageryError} />}
    <header className="topbar">
      <button className="brand" onClick={home} aria-label="Celda Chelem, inicio">CELDA <span>CHELEM</span><small>Prototipo territorial</small></button>
      <nav className="utility-nav" aria-label="Información del proyecto">
        <Button variant="ghost" onClick={() => showEvidence()} aria-label="Fuentes"><BookOpen /><span>Fuentes</span></Button>
        <Button variant="ghost" onClick={() => openPanel('about')} aria-label="Acerca del proyecto"><Info /><span>Acerca</span></Button>
      </nav>
    </header>
    {!entered && <section className="intro" aria-labelledby="hero-title">
      <p className="eyebrow">YUCATÁN · MÉXICO</p>
      <h1 id="hero-title">Celda<br /><em>Chelem.</em></h1>
      <p className="intro-statement">Una nueva forma de leer la costa.</p>
      <Button className="explore-button" onClick={enter}>Explorar el territorio <ArrowUpRight /></Button>
      <p className="intro-note">Área preliminar de estudio</p>
    </section>}
    {entered && <>
      <div className="territory-heading">
        <p className="eyebrow">Área preliminar de estudio</p>
        <h1 ref={heading} tabIndex={-1}>Chelem <span>/ Yucatán</span></h1>
      </div>
      <nav ref={navigation} id="primary-navigation" className="map-nav" aria-label="Exploración" tabIndex={-1}>
        <Button variant="ghost" onClick={() => openPanel('layers')} aria-expanded={panel === 'layers'}><Layers2 /><span>Capas</span><span className="layer-count" aria-label={activeCount + ' capas activas'}>{activeCount}</span></Button>
        <Button variant="ghost" onClick={() => openPanel('places')} aria-expanded={panel === 'places'}><MapPin /><span>Localidades</span></Button>
        <Button variant="ghost" onClick={() => panel === 'guide' ? closePanel() : guide(0)} aria-expanded={panel === 'guide'} disabled={!ready}><Route /><span>Recorrido</span></Button>
      </nav>
      <fieldset className="map-tools" aria-label="Controles del mapa" disabled={!ready || !!mapError}>
        <Button variant="ghost" size="icon" aria-label="Acercar" title="Acercar" disabled={zoomState.max} onClick={() => map.current?.zoom(1)}><Plus /></Button>
        <Button variant="ghost" size="icon" aria-label="Alejar" title="Alejar" disabled={zoomState.min} onClick={() => map.current?.zoom(-1)}><Minus /></Button>
        <Button variant="ghost" size="icon" aria-label="Volver al área de Chelem" title="Volver a Chelem" onClick={() => { setSelected(null); if (panel === 'feature') setPanel(null); map.current?.home(); }}><LocateFixed /></Button>
        <Button variant="ghost" size="icon" aria-label="Orientar al norte" title="Orientar al norte" onClick={() => map.current?.north()}><Compass /></Button>
      </fieldset>
      {!panel && ready && !mapError && <p className="map-hint">{activeCount ? 'Selecciona un lugar o una capa para conocer su origen.' : 'Sin capas activas. Abre Capas para añadir una lectura.'}</p>}
      {!ready && !mapError && <output className="map-loading"><span className="loading-line" /><span className="loading-title">Preparando el territorio</span><small>Cargando cartografía oficial</small></output>}
      {mapError && <section className="map-error" role="alert"><h2>El territorio sigue aquí.</h2><p>{mapError}</p><Button onClick={retry}><RotateCcw /> Volver a intentar</Button><Button variant="ghost" onClick={() => showEvidence()}>Consultar fuentes <ArrowRight /></Button><Button variant="ghost" onClick={() => openPanel('places')}>Ver localidades <ArrowRight /></Button></section>}
      {imageryError && imageryVisible && !mapError && <output className="imagery-alert"><span>La imagen satelital no está disponible.</span><Button variant="ghost" onClick={() => setImageryVisible(false)}>Ver cartografía</Button></output>}
    </>}
    <footer className="map-footer">
      {!entered && <span>Celda Chelem <span className="footer-separator">/</span> Prototipo territorial</span>}
      <button onClick={() => showEvidence()} aria-label="Consultar atribución y fuentes">Datos: INEGI · CONABIO{entered && imageryVisible ? ' / © Esri · Vantor · Earthstar' : ''}</button>
    </footer>
    <Sheet open={!!panel} modal={!panelIsMap} onOpenChange={open => { if (!open) closePanel(); }}>
      <SheetContent showCloseButton={false} className={'explorer-sheet ' + (panelIsMap ? 'is-map-panel ' : '') + (panel === 'guide' ? 'guide-sheet' : '')}
        initialFocus={exitRef} finalFocus={() => navigation.current?.querySelector('button') ?? document.querySelector<HTMLButtonElement>('.brand')}>
        <SheetHeader>
          <div className="sheet-topline">
            {returnPanel ? <Button variant="ghost" onClick={() => { setPanel(returnPanel); setReturnPanel(null); }}><ArrowLeft /> {returnPanel === 'guide' ? 'Al recorrido' : returnPanel === 'layers' ? 'A las capas' : 'A la ficha'}</Button> : <p className="eyebrow">Celda Chelem</p>}
            <SheetClose render={<Button ref={exitRef} variant="ghost" size="icon" aria-label="Cerrar panel" title="Volver al mapa" />}><X /></SheetClose>
          </div>
          <SheetTitle>{panelTitle}</SheetTitle>
          <SheetDescription>{descriptions[panel ?? 'sources']}</SheetDescription>
        </SheetHeader>
        <div key={panel === 'feature' ? selected?.id : panel} className="sheet-scroll">
          <Suspense fallback={<output className="subtle-status">Cargando información…</output>}>
            {panel === 'layers' && <>
              <fieldset className="basemap-choice" aria-label="Fondo del mapa">
                <Button variant="ghost" aria-pressed={imageryVisible} onClick={() => setImageryVisible(true)}>Satélite</Button>
                <Button variant="ghost" aria-pressed={!imageryVisible} onClick={() => setImageryVisible(false)}>Cartografía</Button>
              </fieldset>
              <div className="layers-list">{themes.map(theme => <div className="layer-item" key={theme.id}>
                <div className="layer-row">
                  <span className={'legend-swatch ' + (theme.id === 'coast' ? 'is-line' : '')} style={{ '--swatch': theme.color } as CSSProperties} />
                  <label id={'label-' + theme.id} htmlFor={'layer-' + theme.id}>{theme.title}</label>
                  <Switch id={'layer-' + theme.id} aria-labelledby={'label-' + theme.id} checked={visibility[theme.id]}
                    onCheckedChange={checked => { setVisibility(v => ({ ...v, [theme.id]: checked })); if (selected?.properties.theme === theme.id) setSelected(null); }} />
                </div>
                <details className="layer-details"><summary aria-label={'Acerca de ' + theme.title.toLowerCase()}><Info /></summary><p>{theme.description}</p><p>{theme.date} · {theme.source}</p><span className="badge derived">Derivado</span><p>{theme.limitation}</p><button className="text-link" onClick={() => { setSourceFocus(theme.source.split(' ·')[0]); setReturnPanel('layers'); setPanel('sources'); }}>Ver fuente <ArrowUpRight /></button></details>
              </div>)}</div>
              <p className="fine-print">5 temas de 4 conjuntos oficiales. Geometrías transformadas para visualización.</p>
              <SatelliteMedia place="chelem" compact />
            </>}
            {panel === 'sources' && <EvidencePanel sources={sources} focus={sourceFocus} state={sourceState} onRetry={() => { setSourceState('loading'); setAttempt(n => n + 1); }} />}
            {panel === 'about' && <AboutPanel />}
            {panel === 'places' && <div className="place-list">{config?.places.map(p => <article key={p.id}>
              <button className="place-action" onClick={() => selectPlace(p.id)}><span>{p.name}<small>Localidad · INEGI</small></span><ArrowUpRight /></button>
              <SatelliteMedia place={p.name === 'Chuburná' ? 'chuburna' : p.name.toLowerCase() as ImageryPlace} coordinates={p.coordinates} bounds={p.bounds} title={p.name} compact />
            </article>)}{!config && <output>{metadataError ? 'Información no disponible. Comprueba tu conexión.' : 'Cargando localidades…'}</output>}</div>}
            {panel === 'feature' && selected && <FeatureDetails feature={selected} source={source} onEvidence={showEvidence} />}
            {panel === 'guide' && currentChapter && chapter !== null && <>
              <div className="guide-progress" aria-label={'Capítulo ' + (chapter + 1) + ' de ' + chapters.length}>
                {chapters.map((c, i) => <button key={c.title} className={i === chapter ? 'active' : ''} onClick={() => guide(i)} aria-label={'Capítulo ' + (i + 1) + ': ' + c.title} aria-current={i === chapter ? 'step' : undefined}><span /></button>)}
              </div>
              <div className="chapter-content" key={chapter} aria-live="polite">
                <p className="chapter-number">{String(chapter + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}</p>
                <h2>{currentChapter.title}</h2><p className="guide-copy">{currentChapter.text}</p>
                <SatelliteMedia place={chapterPlace} compact />
                <details className="reading-details"><summary>Alcance de esta lectura</summary><p>{currentChapter.note}</p></details>
                {currentChapter.evidence && <Button variant="ghost" onClick={() => showEvidence()}>Consultar fuentes <BookOpen /></Button>}
              </div>
            </>}
          </Suspense>
        </div>
        {panel === 'guide' && chapter !== null && <div className="guide-navigation">
          <Button variant="ghost" aria-label="Capítulo anterior" disabled={chapter === 0} onClick={() => guide(chapter - 1)}><ArrowLeft /><span>Anterior</span></Button>
          <Button onClick={() => chapter === chapters.length - 1 ? closePanel() : guide(chapter + 1)}>{chapter === chapters.length - 1 ? 'Explorar' : 'Siguiente'}<ArrowRight /></Button>
        </div>}
      </SheetContent>
    </Sheet>
  </main>;
}
