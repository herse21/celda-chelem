'use client';
import { ExternalLink, Satellite } from 'lucide-react';
import { closestImagery, imagery, imageryService, type ImageryPlace } from '@/lib/imagery';
function tilePoint([lon,lat]:[number,number],z:number) {
  const n=2**z, x=(lon+180)/360*n, rad=lat*Math.PI/180, y=(1-Math.asinh(Math.tan(rad))/Math.PI)/2*n;
  return { x:Math.floor(x), y:Math.floor(y), fx:x-Math.floor(x), fy:y-Math.floor(y) };
}
export function geometryCenter(geometry: { coordinates?: unknown }): [number,number] | null {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  function visit(value:unknown) {
    if (!Array.isArray(value)) return;
    if (value.length>=2 && typeof value[0]==='number' && typeof value[1]==='number') { minX=Math.min(minX,value[0]);maxX=Math.max(maxX,value[0]);minY=Math.min(minY,value[1]);maxY=Math.max(maxY,value[1]); return; }
    value.forEach(visit);
  }
  visit(geometry.coordinates);
  return Number.isFinite(minX) ? [(minX+maxX)/2,(minY+maxY)/2] : null;
}
export function SatelliteMedia({ place='chelem', coordinates, title, compact=false }: { place?:ImageryPlace; coordinates?:[number,number]; title?:string; compact?:boolean }) {
  const center=coordinates ?? imagery[place].coordinates, nearest=coordinates ? closestImagery(coordinates) : imagery[place], z=16, t=tilePoint(center,z);
  return <figure className={`satellite-media ${compact?'is-compact':''}`}>
    <div className="satellite-window">
      <div className="satellite-grid" style={{left:`calc(50% - ${t.fx*256}px)`,top:`calc(50% - ${t.fy*256}px)`}}>
        {[0,1].flatMap(dy=>[0,1].map(dx=><img // oxlint-disable-line next/no-img-element -- provider-served map tiles must retain their native grid and URL
          key={`${dx}-${dy}`} aria-hidden="true" alt="" src={`${imageryService}/tile/${z}/${t.y+dy}/${t.x+dx}`} />))}
      </div><span className="satellite-crosshair"><Satellite /></span><span className="satellite-live">IMAGEN REAL</span>
    </div>
    <figcaption><span><b>{title ?? nearest.name}</b> · {coordinates ? `referencia temporal próxima: ${nearest.name}, ${nearest.capture}` : `captura ${nearest.capture}`}</span><span>{nearest.source} · {nearest.sensor} · {nearest.resolution}</span><a href={`${imageryService}?f=pjson`} target="_blank" rel="noreferrer">Esri World Imagery <ExternalLink /></a></figcaption>
  </figure>;
}
