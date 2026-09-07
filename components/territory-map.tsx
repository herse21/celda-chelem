'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Map as LibreMap, Marker, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { themes, type MapConfig, type TerritoryData, type TerritoryFeature, type Visibility } from '@/lib/territory';
import { geometryBounds, type Bounds } from '@/lib/view';
import { imageryService } from '@/lib/imagery';

export type Camera = { center: [number, number]; zoom: number; bearing: number };
export type MapHandle = { home: () => void; zoom: (delta: number) => void; north: () => void; place: (id: string) => void; capture: () => Camera | undefined; restore: (camera: Camera) => void };
type Props = {
  config: MapConfig; data: TerritoryData; visibility: Visibility; imageryVisible: boolean; entered: boolean; selected: TerritoryFeature | null; panelOpen: boolean;
  onSelect: (feature: TerritoryFeature | null) => void; onReady: () => void; onError: (message: string) => void;
  onZoom: (min: boolean, max: boolean) => void; onImageryError: () => void;
};
const motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
const MAP_MIN_ZOOM = 10;
function interfaceNavigationBounds(config: MapConfig): Bounds {
  const [west, south, east, north] = config.operational_bounds;
  const lonPadding = Math.max(0.018, (east - west) * 0.12);
  const latPadding = Math.max(0.012, (north - south) * 0.12);
  return [west - lonPadding, south - latPadding, east + lonPadding, north + latPadding];
}
export const TerritoryMap = forwardRef<MapHandle, Props>(function TerritoryMap(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  const markers = useRef<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { latest.current = props; }, [props]);
  function padding() {
    const w = host.current?.clientWidth ?? window.innerWidth;
    const h = host.current?.clientHeight ?? window.innerHeight;
    const mobile = w < 768;
    const open = latest.current.panelOpen;
    return { top: Math.min(mobile ? 150 : 160, h * .27), left: mobile ? 24 : 88,
      right: !mobile && open ? Math.min(456, w * .43) : mobile ? 24 : 64,
      bottom: Math.min(mobile ? open ? h * .60 + 16 : 156 : 84, h * .64) };
  }
  function fit(bounds: Bounds, animate = true) {
    map.current?.fitBounds(bounds, { padding: padding(), duration: animate ? motion() : 0, maxZoom: 14, essential: false });
  }
  useImperativeHandle(ref, () => ({
    home: () => fit(props.config.focus_bounds),
    zoom: delta => { const m = map.current; if (m) m.zoomTo(Math.min(m.getMaxZoom(), Math.max(m.getMinZoom(), m.getZoom() + delta)), { duration: motion() ? 220 : 0 }); },
    north: () => map.current?.easeTo({ bearing: 0, pitch: 0, duration: motion() ? 300 : 0 }),
    place: id => { const p = props.config.places.find(p => p.id === id); if (p) fit(p.bounds); },
    capture: () => { const m = map.current; return m ? { center: m.getCenter().toArray() as [number, number], zoom: m.getZoom(), bearing: m.getBearing() } : undefined; },
    restore: camera => map.current?.easeTo({ ...camera, padding: { top: 0, left: 0, right: 0, bottom: 0 }, duration: motion() }),
  }));
  useEffect(() => {
    let cancelled = false, frame = 0;
    let observer: ResizeObserver | undefined;
    const timeout = window.setTimeout(() => {
      if (!cancelled && !map.current?.getLayer('selection')) latest.current.onError('El mapa está tardando más de lo esperado. Puedes reintentar o consultar las fuentes.');
    }, 20000);
    import('maplibre-gl').then(({ Map, Marker, ScaleControl }) => {
      if (cancelled || !host.current) return;
      const m = new Map({
        container: host.current,
        style: { version: 8, sources: {}, layers: [{ id: 'sea', type: 'background', paint: { 'background-color': '#dbe6e4' } }] },
        bounds: props.config.focus_bounds, fitBoundsOptions: { padding: padding() },
        maxBounds: interfaceNavigationBounds(props.config), minZoom: MAP_MIN_ZOOM, maxZoom: 16,
        renderWorldCopies: false, attributionControl: false, dragRotate: false, pitchWithRotate: false,
        canvasContextAttributes: { antialias: false }, fadeDuration: 180,
      });
      map.current = m;
      m.touchZoomRotate.disableRotation();
      m.getCanvas().setAttribute('aria-label', 'Mapa de Chelem. Usa las flechas para desplazarte, más y menos para ampliar o reducir.');
      m.addControl(new ScaleControl({ maxWidth: 88, unit: 'metric' }), 'bottom-right');
      m.on('load', () => {
        if (cancelled) return;
        m.addSource('satellite', { type: 'raster', tiles: [imageryService + '/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Esri, Vantor, Earthstar Geographics y GIS User Community' });
        m.addLayer({ id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: latest.current.imageryVisible ? 'visible' : 'none' }, paint: { 'raster-opacity': 1, 'raster-fade-duration': 180 } });
        m.addSource('context', { type: 'geojson', data: props.data.context, maxzoom: 12 });
        m.addLayer({ id: 'context', type: 'fill', source: 'context', paint: { 'fill-color': '#e0dccf', 'fill-opacity': latest.current.imageryVisible ? 0 : 1 } });
        m.addLayer({ id: 'context-edge', type: 'line', source: 'context', paint: { 'line-color': '#a8afa3', 'line-width': .7, 'line-opacity': .35 } });
        for (const id of ['water', 'wetlands', 'mangrove', 'localities', 'coast'] as const) {
          const theme = themes.find(t => t.id === id)!;
          m.addSource(id, { type: 'geojson', data: props.data[id], promoteId: 'record_id', maxzoom: 15 });
          if (id === 'coast') {
            m.addLayer({ id, type: 'line', source: id, paint: { 'line-color': theme.color, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.1, 13, 2, 16, 3], 'line-opacity': .94 } });
            m.addLayer({ id: 'coast-hit', type: 'line', source: id, paint: { 'line-width': 18, 'line-opacity': 0 } });
          } else {
            m.addLayer({ id, type: 'fill', source: id, paint: { 'fill-color': theme.color, 'fill-opacity': .2, 'fill-opacity-transition': { duration: 150 } } });
            m.addLayer({ id: id + '-edge', type: 'line', source: id, paint: { 'line-color': theme.color, 'line-width': id === 'localities' ? 1.25 : .7, 'line-opacity': .8 } });
          }
        }
        m.addSource('selection', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        m.addLayer({ id: 'selection-halo', type: 'line', source: 'selection', paint: { 'line-color': '#172a2d', 'line-width': 5, 'line-opacity': .65 } });
        m.addLayer({ id: 'selection', type: 'line', source: 'selection', paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 1 } });
        const hits = ['coast-hit', 'localities', 'mangrove', 'wetlands', 'water'];
        const originals = new globalThis.Map(Object.values(props.data).flatMap(collection => collection.features.map(f => [f.id, f] as const)));
        m.on('click', event => {
          if (!latest.current.entered) return;
          const hit = m.queryRenderedFeatures(event.point, { layers: hits }).find(f => latest.current.visibility[f.properties.theme as keyof Visibility]);
          latest.current.onSelect(hit ? originals.get(hit.properties.record_id) ?? null : null);
        });
        m.on('mousemove', event => {
          if (frame || !latest.current.entered) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            if (!cancelled) m.getCanvas().style.cursor = m.queryRenderedFeatures(event.point, { layers: hits }).length ? 'pointer' : '';
          });
        });
        for (const place of props.config.places) {
          const button = document.createElement('button');
          button.className = 'place-label'; button.textContent = place.name; button.setAttribute('aria-label', 'Explorar ' + place.name);
          button.addEventListener('click', event => {
            event.stopPropagation();
            const f = originals.get(place.id);
            if (f) latest.current.onSelect(f);
          });
          markers.current.push(new Marker({ element: button, anchor: 'bottom', offset: [0, -8] }).setLngLat(place.coordinates).addTo(m));
        }
        const labels = () => markers.current.forEach(marker => {
          marker.getElement().style.display = m.getZoom() >= 9.4 && latest.current.entered && latest.current.visibility.localities ? 'block' : 'none';
        });
        const zoom = () => { labels(); latest.current.onZoom(m.getZoom() <= m.getMinZoom() + .02, m.getZoom() >= m.getMaxZoom() - .02); };
        m.on('zoomend', zoom); zoom();
        setLoaded(true); latest.current.onReady(); window.clearTimeout(timeout);
      });
      m.on('error', event => {
        if ('sourceId' in event && event.sourceId === 'satellite') latest.current.onImageryError();
        else if (!m.getLayer('selection')) latest.current.onError('No se pudo iniciar la cartografía en este navegador. Las fuentes y localidades siguen disponibles.');
      });
      m.on('webglcontextlost', () => latest.current.onError('El navegador interrumpió la vista del mapa. Vuelve a intentarlo para recuperarla.'));
      observer = new ResizeObserver(() => m.resize());
      observer.observe(host.current);
    }).catch(() => latest.current.onError('Este navegador no pudo iniciar el mapa. Puedes consultar las fuentes y localidades.'));
    return () => { cancelled = true; clearTimeout(timeout); cancelAnimationFrame(frame); observer?.disconnect(); markers.current.forEach(m => m.remove()); markers.current = []; map.current?.remove(); map.current = null; };
    // Prepared inputs are immutable for each map lifecycle; live state uses latest.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m) return;
    for (const theme of themes) {
      for (const id of [theme.id, theme.id + '-edge', theme.id + '-hit'])
        if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', props.visibility[theme.id] ? 'visible' : 'none');
      if (theme.id !== 'coast') m.setPaintProperty(theme.id, 'fill-opacity', props.imageryVisible ? theme.id === 'localities' ? .045 : theme.id === 'water' ? .15 : .3 : theme.id === 'localities' ? .12 : .65);
    }
    markers.current.forEach(marker => { marker.getElement().style.display = props.entered && props.visibility.localities && m.getZoom() >= 9.4 ? 'block' : 'none'; });
    m.setLayoutProperty('satellite', 'visibility', props.imageryVisible ? 'visible' : 'none');
    m.setPaintProperty('context', 'fill-opacity', props.imageryVisible ? 0 : 1);
  }, [props.visibility, props.imageryVisible, props.entered, loaded]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    if (props.entered) fit(props.config.focus_bounds);
  }, [props.entered, props.config.focus_bounds, loaded]);
  useEffect(() => {
    if (!loaded) return;
    void (map.current?.getSource('selection') as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: props.selected ? [props.selected] : [] } as FeatureCollection);
    if (props.selected) { const bounds = geometryBounds(props.selected.geometry); if (bounds) fit(bounds); }
  }, [props.selected, loaded]);
  return <div ref={host} className="map-canvas" aria-label="Mapa interactivo de datos oficiales del corredor Chelem" aria-hidden={!props.entered} />;
});
