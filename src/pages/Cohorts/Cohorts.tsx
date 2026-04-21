import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  ToggleButtonGroup, ToggleButton,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  ViewComfy as CohortIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useCohorts } from './useCohorts';

const WEEK_OPTIONS = [
  { key: 8, label: '8H' },
  { key: 16, label: '16H' },
  { key: 26, label: '26H' },
];

const COLUMNS = [
  { key: 'w1Pct', label: 'W1', tooltip: '7–13 gün sonra aktif' },
  { key: 'w2Pct', label: 'W2', tooltip: '14–20 gün sonra aktif' },
  { key: 'w4Pct', label: 'W4', tooltip: '28–34 gün sonra aktif' },
  { key: 'w8Pct', label: 'W8', tooltip: '56–62 gün sonra aktif' },
  { key: 'w12Pct', label: 'W12', tooltip: '84–90 gün sonra aktif' },
] as const;

function cellColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return 'rgba(0,0,0,0.02)';
  if (pct >= 60) return 'rgba(34,197,94,0.55)';
  if (pct >= 40) return 'rgba(34,197,94,0.35)';
  if (pct >= 25) return 'rgba(201,162,39,0.35)';
  if (pct >= 10) return 'rgba(245,158,11,0.3)';
  if (pct > 0) return 'rgba(239,68,68,0.25)';
  return 'rgba(0,0,0,0.02)';
}

function formatWeek(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function Cohorts() {
  const { isAdmin } = useRole();
  const [weeks, setWeeks] = useState(16);
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useCohorts(weeks);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const cohorts = data?.cohorts || [];
  const summary = data?.summary;

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#FAFAFA', color: '#1E293B', mx: { xs: -2, sm: -3 }, my: -3, py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Cohorts • Retention • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  <CohortIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    Retention Kohortları
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    Haftalık kayıtların 1/2/4/8/12 hafta sonrası aktiflik yüzdeleri
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <ToggleButtonGroup
                size="small"
                value={weeks}
                exclusive
                onChange={(_, v) => { if (typeof v === 'number') setWeeks(v); }}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  '& .MuiToggleButton-root': {
                    color: 'rgba(30,41,59,0.60)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                    '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
                  },
                }}
              >
                {WEEK_OPTIONS.map(o => <ToggleButton key={o.key} value={o.key}>{o.label}</ToggleButton>)}
              </ToggleButtonGroup>
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(0,0,0,0.03)', color: 'rgba(30,41,59,0.80)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(0,0,0,0.06)' }}
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
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(30,41,59,0.85)' }}
            action={<Button size="small" onClick={() => refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Typography sx={{ fontSize: 12 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/auth/admin/cohorts/retention</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {COLUMNS.map(col => {
            const value = summary ? (summary as any)[`avg${col.label}Pct`] : null;
            return (
              <Grid item xs={6} md={2.4} key={col.key}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: 'rgba(201,162,39,0.18)' }}>
                  <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                    Ortalama {col.label}
                  </Typography>
                  {isLoading ? (
                    <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                  ) : (
                    <Typography sx={{
                      fontFamily: 'inherit', fontStyle: 'normal',
                      fontSize: 26, fontWeight: 700,
                      color: value === null || value === undefined ? 'rgba(30,41,59,0.40)' : (value >= 40 ? '#22c55e' : value >= 20 ? '#C9A227' : '#ef4444'),
                      lineHeight: 1.1, mt: 0.5,
                    }}>
                      {value !== null && value !== undefined ? `%${value.toFixed(1)}` : '—'}
                    </Typography>
                  )}
                  <Typography sx={{ mt: 0.5, fontSize: 10, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
                    {col.tooltip}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* Cohort matrix */}
        <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
              Kohort Matrisi — Renk yoğunluğu retention yüzdesiyle orantılı
            </Typography>
          </Box>

          {isLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} variant="rectangular" height={38} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />
              ))}
            </Box>
          ) : cohorts.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
                Yeterli kayıt verisi yok — en az 2 haftalık kayıt geçmişi gerekli
              </Typography>
            </Box>
          ) : (
            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' } }}>
              <TableHead>
                <TableRow>
                  <HeaderCell>Kayıt Haftası</HeaderCell>
                  <HeaderCell align="right">Kohort Büyüklüğü</HeaderCell>
                  {COLUMNS.map(c => (
                    <HeaderCell key={c.key} align="center">
                      <Tooltip title={c.tooltip} arrow>
                        <Box component="span">{c.label}</Box>
                      </Tooltip>
                    </HeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {cohorts.map((row, idx) => (
                  <TableRow key={idx} sx={{ '&:hover .MuiTableCell-root': { bgcolor: 'rgba(201,162,39,0.03)' } }}>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#C9A227', fontWeight: 700 }}>
                      {formatWeek(row.cohortWeek)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                      {row.cohortSize.toLocaleString('tr-TR')}
                    </TableCell>
                    {COLUMNS.map(col => {
                      const value = (row as any)[col.key] as number | null | undefined;
                      return (
                        <TableCell
                          key={col.key}
                          align="center"
                          sx={{
                            bgcolor: cellColor(value),
                            position: 'relative',
                            minWidth: 70,
                          }}
                        >
                          <Typography sx={{
                            fontSize: 12,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: value === null || value === undefined ? 'rgba(30,41,59,0.35)' : '#1E293B',
                          }}>
                            {value === null || value === undefined ? '—' : `%${value.toFixed(1)}`}
                          </Typography>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Legend */}
        <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexWrap: 'wrap' }}>
          <LegendChip color={cellColor(null)} label="veri yok" />
          <LegendChip color={cellColor(5)} label="< %10" />
          <LegendChip color={cellColor(15)} label="%10–24" />
          <LegendChip color={cellColor(30)} label="%25–39" />
          <LegendChip color={cellColor(45)} label="%40–59" />
          <LegendChip color={cellColor(65)} label="≥ %60" />
        </Stack>

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO COHORTS • {summary?.totalCohortSize?.toLocaleString('tr-TR') ?? 0} toplam kullanıcı · {cohorts.length} hafta
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase', bgcolor: 'rgba(0,0,0,0.2)' }}>
      {children}
    </TableCell>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 20, height: 12, borderRadius: 0.5, bgcolor: color, border: '1px solid rgba(0,0,0,0.08)' }} />
      <Typography sx={{ fontSize: 10, color: 'rgba(30,41,59,0.60)' }}>{label}</Typography>
    </Stack>
  );
}
