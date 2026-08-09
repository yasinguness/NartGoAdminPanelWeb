import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api';

/**
 * NartLive operasyon görünümü — konum paylaşmış TÜM kullanıcılar (aktif +
 * pasif, herkese açık + özel) harita ve liste olarak. Yalnız admin gözü;
 * üye-yüzü gizlilik filtreleri burada bilinçli olarak uygulanmaz.
 */

interface AdminUserLocation {
  userEmail: string;
  displayName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  live: boolean;
  isPublic: boolean;
  showTrace: boolean;
  lastUpdatedAt?: string | null;
  expiresAt?: string | null;
}

const LIVE_COLOR = '#2e7d32';
const PASSIVE_COLOR = '#757575';

function relative(ts?: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export default function NartLiveUsers() {
  const [rows, setRows] = useState<AdminUserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/content/admin/nartlive/locations');
      const data: AdminUserLocation[] = res.data?.data ?? res.data ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? 'NartLive konumları yüklenemedi.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Harita init — bir kez.
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: [39.0, 35.0], // Türkiye merkezi
      zoom: 6,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Marker'ları veriye göre çiz.
  useEffect(() => {
    const layer = markersRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    const points: L.LatLng[] = [];
    rows.forEach((r) => {
      if (r.latitude == null || r.longitude == null) return;
      const color = r.live ? LIVE_COLOR : PASSIVE_COLOR;
      const marker = L.circleMarker([r.latitude, r.longitude], {
        radius: r.live ? 9 : 7,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: r.live ? 0.95 : 0.7,
      });
      marker.bindPopup(
        `<b>${r.displayName ?? r.userEmail}</b><br/>` +
          `${r.userEmail}<br/>` +
          `${r.live ? '🟢 Şu an yayında' : `⚪ Son paylaşım: ${relative(r.lastUpdatedAt)}`}<br/>` +
          `${r.isPublic ? 'Herkese açık' : 'Yakın çevre'} · İz: ${r.showTrace ? 'açık' : 'kapalı'}`,
      );
      marker.addTo(layer);
      points.push(L.latLng(r.latitude, r.longitude));
    });

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 10 });
    }
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter(
          (r) =>
            r.userEmail.toLowerCase().includes(q) ||
            (r.displayName ?? '').toLowerCase().includes(q),
        )
      : rows;
    // Canlılar üstte, sonra son paylaşıma göre yeniden eskiye.
    return [...base].sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      return (b.lastUpdatedAt ?? '').localeCompare(a.lastUpdatedAt ?? '');
    });
  }, [rows, query]);

  const liveCount = rows.filter((r) => r.live).length;
  const publicCount = rows.filter((r) => r.isPublic).length;
  const traceOffCount = rows.filter((r) => !r.showTrace).length;

  const focusRow = (r: AdminUserLocation) => {
    if (r.latitude == null || r.longitude == null || !mapRef.current) return;
    mapRef.current.setView([r.latitude, r.longitude], 12);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            NartLive Kullanıcıları
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konum paylaşmış tüm kullanıcılar — kullanıcı başına en son konum. Bu operasyon
            görünümüdür; üye-yüzü gizlilik filtreleri burada uygulanmaz.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip label={`Toplam: ${rows.length}`} />
        <Chip color="success" label={`Şu an yayında: ${liveCount}`} />
        <Chip label={`Herkese açık: ${publicCount}`} />
        <Chip label={`İz kapalı: ${traceOffCount}`} />
      </Stack>

      <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
        <div ref={mapDivRef} style={{ height: 420, width: '100%' }} />
      </Paper>

      <Paper variant="outlined">
        <Box sx={{ p: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="İsim veya e-posta ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Box>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">Kayıt yok.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Kullanıcı</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Son paylaşım</TableCell>
                  <TableCell>Görünürlük</TableCell>
                  <TableCell>Son iz</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.userEmail}
                    hover
                    sx={{ cursor: r.latitude != null ? 'pointer' : 'default' }}
                    onClick={() => focusRow(r)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.displayName ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.userEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.live ? (
                        <Chip size="small" color="success" label="Yayında" />
                      ) : (
                        <Chip size="small" label="Pasif" />
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {relative(r.lastUpdatedAt)}
                    </TableCell>
                    <TableCell>{r.isPublic ? 'Herkese açık' : 'Yakın çevre'}</TableCell>
                    <TableCell>{r.showTrace ? 'Açık' : 'Kapalı'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
