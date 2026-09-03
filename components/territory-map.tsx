'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Map as LibreMap, Marker, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { themes, type MapConfig, type TerritoryData, type TerritoryFeature, type Visibility } from '@/lib/territory';

export type MapHandle = { home: () => void; zoom: (delta: number) => void; north: () => void; place: (id: string) => void };
type Props = { config: MapConfig; data: TerritoryData; visibility: Visibility; imageryVisible: boolean; entered: boolean; selected: TerritoryFeature | null; onSelect: (feature: TerritoryFeature | null) => void; onReady: () => void; onError: (message: string) => void };
export const TerritoryMap = forwardRef<MapHandle, Props>(function TerritoryMap(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const callbacks = useRef(props);
  const markers = useRef<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { callbacks.current = props; }, [props]);
  const duration = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1800;
  const fit = (bounds: [number, number, number, number], animate = true, opening = false) => {
    const narrow = window.innerWidth < 760;
    const height = host.current?.clientHeight ?? window.innerHeight;
    map.current?.fitBounds(bounds, { padding: { top: Math.min(narrow ? 170 : 140, height * .25), right: 60, bottom: Math.min(narrow ? 270 : 100, height * .34), left: narrow ? 36 : Math.min(360, window.innerWidth * .3) }, duration: animate ? (opening && duration() ? 5800 : duration()) : 0, maxZoom: 13, essential: false });
  };
  useImperativeHandle(ref, () => ({ home: () => fit(props.config.focus_bounds), zoom: delta => map.current?.zoomTo((map.current?.getZoom() ?? 10) + delta, { duration: 300 }), north: () => map.current?.easeTo({ bearing: 0, pitch: 0, duration: 400 }), place: id => { const p = props.config.places.find(p => p.id === id); if (p) fit(p.bounds); } }));
  useEffect(() => {
    let cancelled = false;
    import('maplibre-gl').then(({ Map, Marker, ScaleControl }) => {
      if (cancelled || !host.current) return;
      const m = new Map({ container: host.current, style: { version: 8, sources: {}, layers: [{ id: 'sea', type: 'background', paint: { 'background-color': '#091d2b' } }] }, bounds: props.config.overview_bounds, fitBoundsOptions: { padding: { top: 120, bottom: 60, left: window.innerWidth < 760 ? 0 : 330, right: 0 } }, minZoom: 5.2, maxZoom: 15, attributionControl: false, dragRotate: false, pitchWithRotate: false, canvasContextAttributes: { antialias: true } });
      map.current = m;
      m.addControl(new ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-right');
      m.on('load', () => {
        if (cancelled) return;
        m.addSource('satellite', { type: 'raster', tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Esri, Vantor, Earthstar Geographics y GIS User Community' });
        m.addLayer({ id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' }, paint: { 'raster-opacity': .92, 'raster-saturation': -.18, 'raster-contrast': .08 } });
        m.addSource('context', { type: 'geojson', data: props.data.context });
        m.addLayer({ id: 'context', type: 'fill', source: 'context', paint: { 'fill-color': '#243536', 'fill-opacity': 1 } });
        m.addLayer({ id: 'context-edge', type: 'line', source: 'context', paint: { 'line-color': '#466162', 'line-width': .7, 'line-opacity': .45 } });
        for (const id of ['water', 'wetlands', 'mangrove', 'localities', 'coast'] as const) {
          const theme = themes.find(t => t.id === id)!;
          m.addSource(id, { type: 'geojson', data: props.data[id], promoteId: 'record_id' });
          if (id === 'coast') {
            m.addLayer({ id, type: 'line', source: id, minzoom: 8, paint: { 'line-color': theme.color, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 13, 2.2, 15, 3], 'line-opacity': .94 } });
            m.addLayer({ id: 'coast-hit', type: 'line', source: id, minzoom: 8, paint: { 'line-color': theme.color, 'line-width': 15, 'line-opacity': 0 } });
          } else {
            m.addLayer({ id, type: 'fill', source: id, minzoom: 8, paint: { 'fill-color': theme.color, 'fill-opacity': id === 'localities' ? .3 : id === 'water' ? .54 : .72 } });
            m.addLayer({ id: `${id}-edge`, type: 'line', source: id, minzoom: 10, paint: { 'line-color': theme.color, 'line-width': id === 'localities' ? 1.3 : .65, 'line-opacity': .65 } });
          }
        }
        m.addSource('selection', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        m.addLayer({ id: 'selection', type: 'line', source: 'selection', paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-opacity': .95 } });
        const hits = ['coast-hit', 'localities', 'mangrove', 'wetlands', 'water'];
        m.on('click', event => {
          if (!callbacks.current.entered) return;
          const hit = m.queryRenderedFeatures(event.point, { layers: hits }).find(f => callbacks.current.visibility[f.properties.theme as keyof Visibility]);
          if (!hit) { callbacks.current.onSelect(null); return; }
          const original = props.data[hit.properties.theme as keyof Visibility].features.find(f => f.id === hit.properties.record_id);
          if (original) callbacks.current.onSelect(original);
        });
        m.on('mousemove', event => { if (callbacks.current.entered) m.getCanvas().style.cursor = m.queryRenderedFeatures(event.point, { layers: hits }).length ? 'pointer' : ''; });
        for (const place of props.config.places) {
          const button = document.createElement('button'); button.className = 'place-label'; button.textContent = place.name; button.setAttribute('aria-label', `Explorar ${place.name}`);
          button.addEventListener('click', event => { event.stopPropagation(); const f = props.data.localities.features.find(f => f.id === place.id); if (f) callbacks.current.onSelect(f); });
          const marker = new Marker({ element: button, anchor: 'bottom', offset: [0, -6] }).setLngLat(place.coordinates).addTo(m); markers.current.push(marker);
        }
        const labels = () => markers.current.forEach(marker => { marker.getElement().style.display = m.getZoom() >= 9.4 && callbacks.current.entered && callbacks.current.visibility.localities ? 'block' : 'none'; });
        m.on('zoom', labels); labels(); setLoaded(true); callbacks.current.onReady();
      });
      m.on('error', event => { if (!m.isStyleLoaded()) callbacks.current.onError(event.error?.message ?? 'No se pudo iniciar la cartografía.'); });
    }).catch(error => props.onError(error instanceof Error ? error.message : 'Tu navegador no pudo iniciar el mapa.'));
    return () => { cancelled = true; markers.current.forEach(m => m.remove()); markers.current = []; map.current?.remove(); map.current = null; };
  // Map lifecycle uses immutable prepared inputs; live callbacks and controls are refs/effects.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!loaded || !map.current) return;
    for (const theme of themes) for (const id of [theme.id, `${theme.id}-edge`, `${theme.id}-hit`]) if (map.current.getLayer(id)) map.current.setLayoutProperty(id, 'visibility', props.visibility[theme.id] ? 'visible' : 'none');
    markers.current.forEach(m => { m.getElement().style.display = props.entered && props.visibility.localities && (map.current?.getZoom() ?? 0) >= 9.4 ? 'block' : 'none'; });
    const showImagery=props.entered && props.imageryVisible;
    map.current.setLayoutProperty('satellite','visibility',showImagery?'visible':'none');
    map.current.setPaintProperty('context','fill-opacity',showImagery?0:1);
    map.current.setPaintProperty('context-edge','line-opacity',showImagery ? .2 : .45);
  }, [props.visibility, props.entered, props.imageryVisible, loaded]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    if (props.entered) fit(props.config.focus_bounds, true, true);
    else map.current.fitBounds(props.config.overview_bounds, { padding: { top: 120, bottom: 60, left: window.innerWidth < 760 ? 0 : 330, right: 0 }, duration: duration() });
  }, [props.entered, props.config.focus_bounds, props.config.overview_bounds, loaded]);
  useEffect(() => { if (loaded) void (map.current?.getSource('selection') as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: props.selected ? [props.selected] : [] } as FeatureCollection); }, [props.selected, loaded]);
  return <div ref={host} className="map-canvas" aria-label="Mapa interactivo de datos oficiales del corredor Chelem" />;
});
