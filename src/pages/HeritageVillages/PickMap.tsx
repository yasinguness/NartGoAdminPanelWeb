import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type LatLng = { lat: number; lng: number };
export type Marker = { id: string; name: string; lat: number; lng: number };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const PIN = '<svg width="26" height="34" viewBox="-13 -33 26 34" style="display:block"><path d="M0 0C-3.3-6.8-11-11-11-19.5a11 11 0 1 1 22 0C11-11 3.3-6.8 0 0Z" fill="#b3412a" stroke="#fff" stroke-width="2"/><circle cy="-19.5" r="4.2" fill="#fff"/></svg>';

/**
 * Köy konumu seçici: haritaya tıklayınca ya da iğneyi sürükleyince konum değişir.
 * [focus] her değiştiğinde harita o noktaya gider (arama sonucu seçilince). Yakındaki kayıtlı köyler gri nokta olarak görünür.
 */
export default function PickMap({
  point, nearby, focus, onPick, height = 360,
}: {
  point: LatLng | null;
  nearby: Marker[];
  focus: LatLng | null;
  onPick: (p: LatLng) => void;
  height?: number;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!host.current || map.current) return;
    const m = L.map(host.current, { center: [39, 35], zoom: 6 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(m);
    m.on('click', (e) => pickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(host.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; pin.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!point) { pin.current?.remove(); pin.current = null; return; }
    if (!pin.current) {
      pin.current = L.marker([point.lat, point.lng], {
        draggable: true, zIndexOffset: 1000,
        icon: L.divIcon({ className: '', html: PIN, iconSize: [26, 34], iconAnchor: [13, 34] }),
      }).addTo(m);
      pin.current.on('dragend', () => { const p = pin.current!.getLatLng(); pickRef.current({ lat: p.lat, lng: p.lng }); });
    } else {
      pin.current.setLatLng([point.lat, point.lng]);
    }
  }, [point]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    nearby.forEach((n) => {
      L.circleMarker([n.lat, n.lng], { radius: 6, color: '#fff', weight: 2, fillColor: '#5a6a5f', fillOpacity: 0.9 })
        .bindTooltip(esc(n.name), { direction: 'right', offset: [6, 0] }).addTo(g);
    });
  }, [nearby]);

  useEffect(() => {
    if (focus && map.current) map.current.setView([focus.lat, focus.lng], Math.max(map.current.getZoom(), 14));
  }, [focus]);

  return <div ref={host} style={{ height, width: '100%', borderRadius: 8, border: '1px solid #e4e0d6', cursor: 'crosshair' }} />;
}
