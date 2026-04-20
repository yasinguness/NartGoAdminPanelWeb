import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  ToggleButtonGroup, ToggleButton, Accordion, AccordionSummary, AccordionDetails, TextField, InputAdornment,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  ExpandMore as ExpandIcon,
  Warning as WarnIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Speed as FrequencyIcon,
  DeleteSweep as BulkDeleteIcon,
  Nightlight as NightIcon,
  Public as IpIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRole } from '../../hooks/useRole';
import { anomalyService, type Anomaly, type AnomalyScanResponse } from '../../services/anomaly/anomalyService';

const WINDOWS = [
  { key: 6, label: '6sa' },
  { key: 24, label: '24sa' },
  { key: 72, label: '3G' },
  { key: 168, label: '7G' },
];

const SEVERITY_COLOR: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#64748b',
};

const SEVERITY_LABEL: Record<string, string> = {
  high: 'KRİTİK',
  medium: 'ORTA',
  low: 'DÜŞÜK',
};

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  HIGH_FREQUENCY: { label: 'Yüksek Frekans', icon: <FrequencyIcon sx={{ fontSize: 16 }} />, color: '#ef4444' },
  BULK_DELETION: { label: 'Toplu Silme', icon: <BulkDeleteIcon sx={{ fontSize: 16 }} />, color: '#ef4444' },
  OFF_HOURS: { label: 'Mesai Dışı', icon: <NightIcon sx={{ fontSize: 16 }} />, color: '#f59e0b' },
  IP_DIVERGENCE: { label: 'IP Sapması', icon: <IpIcon sx={{ fontSize: 16 }} />, color: '#f59e0b' },
};

function safeDate(iso?: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

export default function AnomalyDetector() {
  const { isAdmin } = useRole();
  const [hours, setHours] = useState(24);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<AnomalyScanResponse | null>({
    queryKey: ['anomaly-scan', hours],
    queryFn: () => anomalyService.scan(hours),
    staleTime: 60_000,
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const anomalies = data?.anomalies || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return anomalies.filter(a => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (q && !(a.actorEmail || '').toLowerCase().includes(q) && !(a.message || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [anomalies, severityFilter, search]);

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#060C09', color: '#F3EEE0', mx: { xs: -2, sm: -3 }, my: -3, py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Anomaly Detector • Security • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  <ShieldIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#F3EEE0' }}>
                    Anomali Tarayıcı
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(243,238,224,0.65)' }}>
                    Admin audit log'undaki olağan dışı pattern'ler · insider threat koruması
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <ToggleButtonGroup
                size="small"
                value={hours}
                exclusive
                onChange={(_, v) => { if (typeof v === 'number') setHours(v); }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  '& .MuiToggleButton-root': {
                    color: 'rgba(243,238,224,0.6)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                    '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
                  },
                }}
              >
                {WINDOWS.map(w => <ToggleButton key={w.key} value={w.key}>{w.label}</ToggleButton>)}
              </ToggleButtonGroup>
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={isFetching ? 'taranıyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(243,238,224,0.8)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <Tooltip title="Yeniden tara" arrow>
                <IconButton onClick={() => refetch()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {!isLoading && !data && (
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(243,238,224,0.85)' }}
            action={<Button size="small" onClick={() => refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Typography sx={{ fontSize: 12 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/auth/admin/anomalies/scan</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <StatTile label="Toplam Anomali" value={data?.summary?.totalAnomalies ?? 0} color={(data?.summary?.totalAnomalies ?? 0) > 0 ? '#ef4444' : '#22c55e'} loading={isLoading} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Kritik" value={data?.summary?.highSeverity ?? 0} color="#ef4444" loading={isLoading} icon={<ErrorIcon />} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Orta / Düşük" value={(data?.summary?.mediumSeverity ?? 0) + (data?.summary?.lowSeverity ?? 0)} color="#f59e0b" loading={isLoading} icon={<WarnIcon />} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Taranan Event" value={data?.summary?.auditEventsScanned ?? 0} color="#3b82f6" loading={isLoading} icon={<InfoIcon />} />
          </Grid>
        </Grid>

        {/* Filter bar */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            size="small"
            value={severityFilter}
            exclusive
            onChange={(_, v) => v && setSeverityFilter(v)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              '& .MuiToggleButton-root': {
                color: 'rgba(243,238,224,0.6)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
              },
            }}
          >
            <ToggleButton value="ALL">Tümü</ToggleButton>
            <ToggleButton value="high">Kritik</ToggleButton>
            <ToggleButton value="medium">Orta</ToggleButton>
            <ToggleButton value="low">Düşük</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Admin email / mesaj ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'rgba(243,238,224,0.4)' }} /></InputAdornment> }}
            sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', fontSize: 12, color: '#F3EEE0', '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' } } }}
          />
        </Stack>

        {/* Anomalies */}
        {isLoading ? (
          <Stack spacing={1.5}>
            {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={72} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }} />)}
          </Stack>
        ) : anomalies.length === 0 ? (
          <Paper variant="outlined" sx={{ py: 8, textAlign: 'center', bgcolor: '#0A130F', borderColor: 'rgba(34,197,94,0.25)' }}>
            <Typography sx={{ fontSize: 16, color: '#22c55e', fontWeight: 800 }}>
              ✓ Anomali tespit edilmedi
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.5)', mt: 1 }}>
              Son {hours} saatte admin aktivitesi normal seyirde
            </Typography>
          </Paper>
        ) : filtered.length === 0 ? (
          <Paper variant="outlined" sx={{ py: 4, textAlign: 'center', bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)' }}>
            <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
              Filtreyle eşleşen anomali yok
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {filtered.map((a, idx) => <AnomalyCard key={idx} anomaly={a} />)}
          </Stack>
        )}

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(243,238,224,0.3)' }}>
            NARTGO ANOMALY • {anomalies.length} tespit · {data?.summary?.auditEventsScanned ?? 0} event taranan
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const meta = TYPE_META[anomaly.type] || { label: anomaly.type, icon: <WarnIcon sx={{ fontSize: 16 }} />, color: '#C9A227' };
  const severityColor = SEVERITY_COLOR[anomaly.severity] || '#64748b';

  return (
    <Accordion
      sx={{
        bgcolor: '#0A130F',
        border: `1px solid ${severityColor}33`,
        borderLeft: `4px solid ${severityColor}`,
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        '& .MuiAccordionSummary-root:hover': { bgcolor: 'rgba(201,162,39,0.04)' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandIcon sx={{ color: 'rgba(243,238,224,0.5)' }} />}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: `${meta.color}22`, color: meta.color,
          }}>
            {meta.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#F3EEE0' }}>
                {meta.label}
              </Typography>
              <Chip
                label={SEVERITY_LABEL[anomaly.severity] || anomaly.severity}
                size="small"
                sx={{ bgcolor: `${severityColor}22`, color: severityColor, fontSize: 9, fontWeight: 800, letterSpacing: 0.5, height: 18 }}
              />
              {anomaly.actorEmail && (
                <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#C9A227', fontWeight: 700 }}>
                  {anomaly.actorEmail}
                </Typography>
              )}
            </Stack>
            <Typography sx={{ fontSize: 11, color: 'rgba(243,238,224,0.75)' }}>
              {anomaly.message}
            </Typography>
          </Box>
          <Stack sx={{ textAlign: 'right' }}>
            {anomaly.eventCount !== undefined && (
              <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 18, fontWeight: 700, color: severityColor, lineHeight: 1 }}>
                {anomaly.eventCount}
              </Typography>
            )}
            <Typography sx={{ fontSize: 9, color: 'rgba(243,238,224,0.4)' }}>event</Typography>
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(0,0,0,0.15)' }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={3}>
            <InfoRow label="İlk Görülen" value={safeDate(anomaly.firstSeen)} />
            <InfoRow label="Son Görülen" value={safeDate(anomaly.lastSeen)} />
            {anomaly.eventCount !== undefined && <InfoRow label="Event Sayısı" value={String(anomaly.eventCount)} />}
          </Stack>
          {anomaly.sampleDetails && anomaly.sampleDetails.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, color: 'rgba(243,238,224,0.5)', textTransform: 'uppercase', mb: 1 }}>
                Örnekler
              </Typography>
              <Stack spacing={0.5}>
                {anomaly.sampleDetails.map((s, i) => (
                  <Typography key={i} sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(243,238,224,0.7)' }}>
                    · {s}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, color: 'rgba(243,238,224,0.4)', textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#F3EEE0' }}>{value}</Typography>
    </Box>
  );
}

function StatTile({ label, value, color, loading, icon }: { label: string; value: number; color: string; loading?: boolean; icon?: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#0F1A14', borderColor: 'rgba(201,162,39,0.18)' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {icon && <Box sx={{ color }}>{icon}</Box>}
        <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
          {label}
        </Typography>
      </Stack>
      {loading ? (
        <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
      ) : (
        <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 26, fontWeight: 700, color, lineHeight: 1.1, mt: 0.5 }}>
          {value.toLocaleString('tr-TR')}
        </Typography>
      )}
    </Paper>
  );
}
