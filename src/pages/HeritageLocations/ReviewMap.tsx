import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CandidateSource, ReviewDetail } from '../../services/heritageReviewService';

export const SOURCE_COLOR: Record<CandidateSource, string> = {
  geo: '#2b5b8c', web: '#8a6210', uye: '#6a4c93', osm: '#2f7a46', kayit: '#14231a',
};
const SATELLITE_URL = import.meta.env.VITE_HERITAGE_SATELLITE_URL as string | undefined;
const SATELLITE_ATTRIBUTION = import.meta.env.VITE_HERITAGE_SATELLITE_ATTRIBUTION as string | undefined;
export const satelliteConfigured = Boolean(SATELLITE_URL && SATELLITE_ATTRIBUTION);

export type LatLng = { lat: number; lng: number };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function distanceM(a: LatLng, b: LatLng) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * İnceleme haritası: gerçek zemin (OSM ya da yapılandırılmışsa uydu) üzerine
 * tasarımdaki katmanlar. Kayıt değişince görünüm adaylarla birlikte sığdırılır;
 * nokta taşınınca görünüm değişmez (admin bağlamı kaybetmesin).
 */
export default function ReviewMap({
  detail, original, point, moving, satellite, onPick,
}: {
  detail: ReviewDetail | null;
  original: LatLng | null;
  point: LatLng | null;
  moving: boolean;
  satellite: boolean;
  onPick: (p: LatLng) => void;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const fittedFor = useRef<string | null>(null);
  const pickRef = useRef(onPick);
  const movingRef = useRef(moving);
  pickRef.current = onPick;
  movingRef.current = moving;

  useEffect(() => {
    if (!host.current || map.current) return;
    const m = L.map(host.current, { center: [39, 35], zoom: 6, zoomControl: false, attributionControl: true });
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.control.scale({ position: 'bottomright', imperial: false, maxWidth: 120 }).addTo(m);
    m.on('click', (e) => { if (movingRef.current) pickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    layers.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(host.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m) return;
    tiles.current?.remove();
    tiles.current = satellite && satelliteConfigured
      ? L.tileLayer(SATELLITE_URL!, { attribution: SATELLITE_ATTRIBUTION!, maxZoom: 19 })
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 });
    tiles.current.addTo(m);
  }, [satellite]);

  useEffect(() => {
    const m = map.current, g = layers.current;
    if (!m || !g) return;
    g.clearLayers();
    if (!detail) return;

    // İlçe sınırları
    const boundary = (b: ReviewDetail['boundaries']['record'], color: string, label: string) => {
      if (!b) return;
      const layer = L.geoJSON(b.geometry as GeoJSON.MultiPolygon, { interactive: false, style: { color, weight: 1.8, fill: false, dashArray: '8 4 2 4' } }).addTo(g);
      layer.bindTooltip(`${label}: ${esc(b.name)}`, { permanent: true, direction: 'center', className: 'bndLbl', opacity: 1 });
    };
    boundary(detail.boundaries?.record, '#6a4c93', 'Kayıt ilçesi');
    boundary(detail.boundaries?.point, '#2b5b8c', 'Noktanın ilçesi');

    // Komşu kayıtlar
    detail.nearby.forEach((n) => {
      L.marker([n.latitude, n.longitude], { interactive: false, icon: L.divIcon({ className: '', html: '<div class="nearIc"></div>', iconSize: [12, 12], iconAnchor: [6, 6] }) })
        .bindTooltip(`${esc(n.name)} · ${n.distance >= 1000 ? (n.distance / 1000).toFixed(1).replace('.', ',') + ' km' : n.distance + ' m'}`, { permanent: true, direction: 'right', className: 'nearLbl', offset: [6, 0] })
        .addTo(g);
    });

    // Adaylar: pinle ya da birbiriyle çakışanlar yelpaze gibi açılır
    const seen = new Map<string, number>();
    detail.candidates.forEach((c) => {
      const key = `${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`;
      const i = seen.get(key) ?? 0; seen.set(key, i + 1);
      const underPin = point && distanceM(point, { lat: c.latitude, lng: c.longitude }) < 15;
      const dx = underPin || i > 0 ? 16 + i * 16 : 0, dy = underPin || i > 0 ? 14 : 0;
      L.marker([c.latitude, c.longitude], {
        interactive: false,
        icon: L.divIcon({ className: '', html: `<div class="candIc" style="background:${SOURCE_COLOR[c.src]};transform:translate(${dx}px,${dy}px)">${c.n}</div>`, iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).addTo(g);
    });

    // Taşınan nokta: eski yerden yeni yere kesikli çizgi
    if (original && point && distanceM(original, point) > 1) {
      const d = Math.round(distanceM(original, point));
      L.polyline([[original.lat, original.lng], [point.lat, point.lng]], { color: '#14231a', weight: 1.4, dashArray: '4 3', opacity: .75, interactive: false })
        .bindTooltip(`${d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : d + ' m'} taşındı`, { permanent: true, direction: 'center', className: 'ghostLbl', opacity: 1 })
        .addTo(g);
      L.circleMarker([original.lat, original.lng], { radius: 5, color: '#b3412a', weight: 1.6, dashArray: '2 2', fill: false, interactive: false }).addTo(g);
    }

    // İncelenen nokta
    if (point) {
      L.marker([point.lat, point.lng], {
        interactive: false, zIndexOffset: 1000,
        icon: L.divIcon({
          className: '', iconSize: [0, 0], iconAnchor: [0, 0],
          html: `<div class="pinIc"><span class="pulse"></span><svg width="20" height="27" viewBox="-10 -26 20 27"><path d="M0 0C-2.6-5.4-9-8.8-9-15.5a9 9 0 1 1 18 0C9-8.8 2.6-5.4 0 0Z" fill="#b3412a" stroke="#fff" stroke-width="1.6"/><circle cy="-15.5" r="3.4" fill="#fff"/></svg><span class="pinLbl">${esc(detail.name)}</span></div>`,
        }),
      }).addTo(g);
    }

    if (fittedFor.current !== detail.id) {
      fittedFor.current = detail.id;
      const pts: L.LatLngExpression[] = [];
      if (point) pts.push([point.lat, point.lng]);
      detail.candidates.forEach((c) => { if (c.distance >= 0 && c.distance < 5000) pts.push([c.latitude, c.longitude]); });
      detail.nearby.forEach((n) => pts.push([n.latitude, n.longitude]));
      if (pts.length === 1) m.setView(pts[0], 15);
      else if (pts.length > 1) m.fitBounds(L.latLngBounds(pts).pad(0.35), { maxZoom: 16 });
      else if (detail.boundaries?.record) m.fitBounds(L.geoJSON(detail.boundaries.record.geometry as GeoJSON.MultiPolygon).getBounds());
    }
  }, [detail, original, point]);

  return <div ref={host} className={`leafletHost${moving ? ' moving' : ''}`} aria-hidden="true" />;
}
