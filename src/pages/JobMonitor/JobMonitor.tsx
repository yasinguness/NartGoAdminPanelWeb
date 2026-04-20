import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody,
  ToggleButtonGroup, ToggleButton, TextField, InputAdornment,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  Schedule as JobIcon,
  ExpandMore as ExpandIcon,
  Search as SearchIcon,
  FiberManualRecord as HealthDot,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useJobMonitor } from './useJobMonitor';
import type { ScheduledJob, ServiceJobs } from '../../services/jobMonitor/jobMonitorTypes';

const TYPE_COLOR: Record<string, string> = {
  cron: '#3b82f6',
  fixedRate: '#22c55e',
  fixedDelay: '#C9A227',
};

const TYPE_FILTERS = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'cron', label: 'Cron' },
  { key: 'fixedRate', label: 'Fixed Rate' },
  { key: 'fixedDelay', label: 'Fixed Delay' },
];

function formatInterval(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(0)}sn`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(0)}dk`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}sa`;
  return `${(ms / 86_400_000).toFixed(1)}g`;
}

function shortName(runnable?: string): string {
  if (!runnable) return '—';
  const m = runnable.match(/([a-zA-Z0-9_.]+\.[a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);
  if (m) {
    const parts = m[1].split('.');
    return `${parts[parts.length - 1]}.${m[2]}()`;
  }
  return runnable.slice(0, 80);
}

export default function JobMonitor() {
  const { isAdmin } = useRole();
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useJobMonitor();
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const services = data?.services || [];

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.map(svc => {
      const filterJobs = (jobs: ScheduledJob[], type: string) => {
        if (typeFilter !== 'ALL' && typeFilter !== type) return [];
        if (!q) return jobs;
        return jobs.filter(j => (j.runnable || '').toLowerCase().includes(q));
      };
      return {
        ...svc,
        cron: filterJobs(svc.cron || [], 'cron'),
        fixedRate: filterJobs(svc.fixedRate || [], 'fixedRate'),
        fixedDelay: filterJobs(svc.fixedDelay || [], 'fixedDelay'),
      };
    }).map(svc => ({
      ...svc,
      visibleJobCount: svc.cron.length + svc.fixedRate.length + svc.fixedDelay.length,
    })).filter(svc => svc.visibleJobCount > 0 || svc.status !== 'up');
  }, [services, typeFilter, search]);

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

  const downServices = services.filter(s => s.status !== 'up').length;

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
                  Job Monitor • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  <JobIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#F3EEE0' }}>
                    Scheduled Jobs
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(243,238,224,0.65)' }}>
                    Actuator/scheduledtasks aggregator · {data?.totalJobs ?? 0} job · {data?.activeServices ?? 0}/{services.length} servis up
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(243,238,224,0.8)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <Tooltip title="Yenile" arrow>
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
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#f59e0b' }}>BACKEND YANIT VERMEDİ</Typography>
              <Typography sx={{ fontSize: 12 }}>
                <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/admin/ops/jobs</code> endpoint'ine ulaşılamadı. Mikroservislerde <code style={{ fontSize: 11 }}>management.endpoints.web.exposure.include: scheduledtasks</code> ayarını kontrol edin.
              </Typography>
            </Stack>
          </Alert>
        )}

        {downServices > 0 && (
          <Alert severity="error" icon={false} sx={{ mb: 3, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F3EEE0' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#ef4444', mb: 0.5 }}>
              {downServices} SERVİS ULAŞILAMIYOR
            </Typography>
            <Typography sx={{ fontSize: 12 }}>
              {services.filter(s => s.status !== 'up').map(s => s.serviceName).join(', ')} — scheduledtasks endpoint'i expose edilmemiş veya servis kapalı.
            </Typography>
          </Alert>
        )}

        {/* Stats cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <StatCard label="Toplam Job" value={data?.totalJobs ?? 0} color="#C9A227" loading={isLoading} />
          <StatCard label="Aktif Servis" value={`${data?.activeServices ?? 0} / ${services.length}`} color="#22c55e" loading={isLoading} />
          <StatCard label="Cron Jobs" value={services.reduce((s, v) => s + (v.cron?.length || 0), 0)} color="#3b82f6" loading={isLoading} />
          <StatCard label="Rate/Delay Jobs" value={services.reduce((s, v) => s + (v.fixedRate?.length || 0) + (v.fixedDelay?.length || 0), 0)} color="#8b5cf6" loading={isLoading} />
        </Grid>

        {/* Filters */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            size="small"
            value={typeFilter}
            exclusive
            onChange={(_, v) => v && setTypeFilter(v)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              '& .MuiToggleButton-root': {
                color: 'rgba(243,238,224,0.6)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
              },
            }}
          >
            {TYPE_FILTERS.map(f => <ToggleButton key={f.key} value={f.key}>{f.label}</ToggleButton>)}
          </ToggleButtonGroup>

          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Job adı ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'rgba(243,238,224,0.4)' }} /></InputAdornment> }}
            sx={{
              minWidth: 280,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.03)', fontSize: 12, color: '#F3EEE0',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
              },
            }}
          />
        </Stack>

        {/* Service accordions */}
        {isLoading ? (
          <Stack spacing={1.5}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" height={60} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />)}
          </Stack>
        ) : filteredServices.length === 0 ? (
          <Paper variant="outlined" sx={{ py: 6, textAlign: 'center', bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)' }}>
            <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
              Kriterlerle eşleşen job yok
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1}>
            {filteredServices.map(svc => (
              <ServiceAccordion key={svc.serviceName} service={svc} />
            ))}
          </Stack>
        )}

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(243,238,224,0.3)' }}>
            NARTGO OPS • Spring Actuator aggregator
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function StatCard({ label, value, color, loading }: { label: string; value: number | string; color: string; loading?: boolean }) {
  return (
    <Grid item xs={6} md={3}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#0F1A14', borderColor: 'rgba(201,162,39,0.18)' }}>
        <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        ) : (
          <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 26, fontWeight: 700, color, lineHeight: 1.1, mt: 0.5 }}>
            {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
          </Typography>
        )}
      </Paper>
    </Grid>
  );
}

function ServiceAccordion({ service }: { service: ServiceJobs & { visibleJobCount?: number } }) {
  const allJobs = [
    ...service.cron.map(j => ({ ...j, _type: 'cron' as const })),
    ...service.fixedRate.map(j => ({ ...j, _type: 'fixedRate' as const })),
    ...service.fixedDelay.map(j => ({ ...j, _type: 'fixedDelay' as const })),
  ];
  const healthColor = service.status === 'up' ? '#22c55e' : '#ef4444';

  return (
    <Accordion
      defaultExpanded={false}
      sx={{
        bgcolor: '#0A130F',
        border: '1px solid rgba(201,162,39,0.12)',
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        '& .MuiAccordionSummary-root:hover': { bgcolor: 'rgba(201,162,39,0.04)' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandIcon sx={{ color: 'rgba(243,238,224,0.5)' }} />}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
          <HealthDot sx={{ fontSize: 10, color: healthColor }} />
          <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 16, fontWeight: 700, color: '#F3EEE0' }}>
            {service.serviceName}
          </Typography>
          {service.status !== 'up' && (
            <Chip label="DOWN" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 9, fontWeight: 800, height: 18 }} />
          )}
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1.5}>
            {service.cron.length > 0 && <TypeChip type="cron" count={service.cron.length} />}
            {service.fixedRate.length > 0 && <TypeChip type="fixedRate" count={service.fixedRate.length} />}
            {service.fixedDelay.length > 0 && <TypeChip type="fixedDelay" count={service.fixedDelay.length} />}
            {allJobs.length === 0 && service.status === 'up' && (
              <Typography sx={{ fontSize: 11, color: 'rgba(243,238,224,0.5)', fontStyle: 'italic' }}>job yok</Typography>
            )}
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {service.error && (
          <Box sx={{ p: 2, bgcolor: 'rgba(239,68,68,0.08)' }}>
            <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#ef4444' }}>
              Error: {service.error}
            </Typography>
          </Box>
        )}
        {allJobs.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
              Kayıtlı scheduled task yok
            </Typography>
          </Box>
        ) : (
          <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.05)', color: '#F3EEE0', py: 1 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.15)' }}>
                <HeaderCell>Tip</HeaderCell>
                <HeaderCell>Method</HeaderCell>
                <HeaderCell>Expression / Interval</HeaderCell>
                <HeaderCell align="right">İlk Gecikme</HeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allJobs.map((j, idx) => (
                <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.03) !important' } }}>
                  <TableCell>
                    <Chip
                      label={j._type}
                      size="small"
                      sx={{
                        bgcolor: `${TYPE_COLOR[j._type] || '#64748b'}22`,
                        color: TYPE_COLOR[j._type] || '#64748b',
                        fontSize: 9, fontWeight: 700, letterSpacing: 0.5, height: 18,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                    <Tooltip title={j.runnable || ''} arrow>
                      <Box component="span">{shortName(j.runnable)}</Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#C9A227' }}>
                    {j.expression ? j.expression : formatInterval(j.intervalMs)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.5)' }}>
                    {formatInterval(j.initialDelayMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

function TypeChip({ type, count }: { type: string; count: number }) {
  return (
    <Chip
      label={`${type}: ${count}`}
      size="small"
      sx={{
        bgcolor: `${TYPE_COLOR[type] || '#64748b'}22`,
        color: TYPE_COLOR[type] || '#64748b',
        fontSize: 10, fontWeight: 700, height: 20,
      }}
    />
  );
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
