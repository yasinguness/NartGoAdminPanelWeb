import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody, ToggleButtonGroup, ToggleButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  Gavel as FraudIcon,
  Flag as FlagIcon,
  OpenInNew as OpenIcon,
  Remove as UnflagIcon,
} from '@mui/icons-material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useRole } from '../../hooks/useRole';
import { fraudService, type FraudOverviewResponse, type FraudFlagRequest, type SuspiciousCustomer, type FlaggedCustomer } from '../../services/fraud/fraudService';

const SEVERITY_COLOR: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#64748b',
};

function safeDate(iso?: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

export default function FraudDetection() {
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [view, setView] = useState<'SUSPICIOUS' | 'FLAGGED'>('SUSPICIOUS');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flagEmail, setFlagEmail] = useState('');
  const [flagReason, setFlagReason] = useState('');

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<FraudOverviewResponse | null>({
    queryKey: ['fraud', 'overview'],
    queryFn: () => fraudService.overview(),
    staleTime: 60_000,
  });

  const flagMutation = useMutation({
    mutationFn: (req: FraudFlagRequest) => fraudService.flag(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fraud'] }),
  });

  const unflagMutation = useMutation({
    mutationFn: (id: string) => fraudService.unflag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fraud'] }),
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const openFlagDialog = (email?: string, reason?: string) => {
    setFlagEmail(email || '');
    setFlagReason(reason || '');
    setDialogOpen(true);
  };

  const handleFlag = async () => {
    try {
      await flagMutation.mutateAsync({ email: flagEmail.trim(), reason: flagReason.trim() });
      enqueueSnackbar(`${flagEmail} fraud olarak işaretlendi`, { variant: 'success' });
      setDialogOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Flag başarısız', { variant: 'error' });
    }
  };

  const handleUnflag = async (flagged: FlaggedCustomer) => {
    if (!window.confirm(`${flagged.email} için flag kaldırılsın mı?`)) return;
    try {
      await unflagMutation.mutateAsync(flagged.id);
      enqueueSnackbar('Flag kaldırıldı', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Kaldırma başarısız', { variant: 'error' });
    }
  };

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

  const highRisk = (data?.suspicious || []).filter(s => s.severity === 'high').length;

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
                  Fraud Detection • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  <FraudIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#F3EEE0' }}>
                    Fraud Tespiti
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(243,238,224,0.65)' }}>
                    Sipariş pattern analizi · flag yönetimi · 3+ iade / 5+ başarısız tespiti
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <ToggleButtonGroup
                size="small" value={view} exclusive onChange={(_, v) => v && setView(v)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  '& .MuiToggleButton-root': {
                    color: 'rgba(243,238,224,0.6)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                    '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
                  },
                }}
              >
                <ToggleButton value="SUSPICIOUS">Şüpheli Adaylar</ToggleButton>
                <ToggleButton value="FLAGGED">Flag'liler</ToggleButton>
              </ToggleButtonGroup>
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
              <Button
                variant="contained" size="small" startIcon={<FlagIcon />}
                onClick={() => openFlagDialog()}
                sx={{ bgcolor: '#ef4444', color: '#fff', fontWeight: 800, '&:hover': { bgcolor: '#dc2626' } }}
              >
                Manuel Flag
              </Button>
            </Stack>
          </Stack>
        </Box>

        {!isLoading && !data && (
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(243,238,224,0.85)' }}
            action={<Button size="small" onClick={() => refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Typography sx={{ fontSize: 12 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/tickets/admin/fraud/overview</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <StatTile label="Flag'li Kullanıcı" value={data?.flaggedCount ?? 0} color={(data?.flaggedCount ?? 0) > 0 ? '#ef4444' : '#64748b'} loading={isLoading} />
          <StatTile label="Şüpheli Aday" value={data?.suspiciousCount ?? 0} color="#f59e0b" loading={isLoading} />
          <StatTile label="Yüksek Risk" value={highRisk} color="#ef4444" loading={isLoading} hint="Hemen incele" />
          <StatTile label="Son 3 Ay" value="Analiz Penceresi" color="#3b82f6" loading={false} asString />
        </Grid>

        {/* Table */}
        <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
          {view === 'SUSPICIOUS' ? (
            <SuspiciousView
              rows={data?.suspicious || []}
              loading={isLoading}
              onFlag={(s) => openFlagDialog(s.email, s.riskReason)}
              onOpenUser={(email) => navigate(`/users?q=${encodeURIComponent(email)}`)}
            />
          ) : (
            <FlaggedView
              rows={data?.flagged || []}
              loading={isLoading}
              onUnflag={handleUnflag}
              onOpenUser={(email) => navigate(`/users?q=${encodeURIComponent(email)}`)}
            />
          )}
        </Paper>

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(243,238,224,0.3)' }}>
            NARTGO FRAUD • {data?.flaggedCount ?? 0} flag'li · {data?.suspiciousCount ?? 0} şüpheli
          </Typography>
        </Box>

        {/* Flag dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
          PaperProps={{ sx: { bgcolor: '#0A130F', color: '#F3EEE0', border: '1px solid rgba(239,68,68,0.25)' } }}>
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 20, fontWeight: 700 }}>
              Kullanıcıyı Fraud Olarak İşaretle
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            <Stack spacing={2}>
              <TextField
                fullWidth size="small" label="Email" type="email"
                value={flagEmail} onChange={e => setFlagEmail(e.target.value)}
                sx={fieldSx}
              />
              <TextField
                fullWidth size="small" label="Neden (audit log için zorunlu)"
                value={flagReason} onChange={e => setFlagReason(e.target.value)}
                multiline minRows={3} required
                sx={fieldSx}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', px: 3, py: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={flagMutation.isPending} sx={{ color: 'rgba(243,238,224,0.6)', fontWeight: 700 }}>
              İptal
            </Button>
            <Button
              variant="contained" startIcon={<FlagIcon sx={{ fontSize: 14 }} />}
              onClick={handleFlag}
              disabled={!flagEmail.trim() || flagReason.trim().length < 3 || flagMutation.isPending}
              sx={{ bgcolor: '#ef4444', color: '#fff', fontWeight: 800, '&:hover': { bgcolor: '#dc2626' } }}
            >
              {flagMutation.isPending ? 'Kaydediliyor…' : 'Flag Et'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

function SuspiciousView({ rows, loading, onFlag, onOpenUser }: {
  rows: SuspiciousCustomer[]; loading?: boolean; onFlag: (s: SuspiciousCustomer) => void; onOpenUser: (email: string) => void;
}) {
  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 1, borderRadius: 0.5 }} />)}
      </Box>
    );
  }
  if (rows.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 14, color: '#22c55e', fontWeight: 700 }}>✓ Şüpheli kullanıcı yok</Typography>
      </Box>
    );
  }
  return (
    <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.05)', color: '#F3EEE0' } }}>
      <TableHead>
        <TableRow>
          <HeaderCell>Email</HeaderCell>
          <HeaderCell align="center">Severity</HeaderCell>
          <HeaderCell>Sebep</HeaderCell>
          <HeaderCell align="center">Toplam</HeaderCell>
          <HeaderCell align="center">İade / %</HeaderCell>
          <HeaderCell align="center">Fail / %</HeaderCell>
          <HeaderCell align="center">Aksiyon</HeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((s, idx) => (
          <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
            <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#C9A227' }}>{s.email}</TableCell>
            <TableCell align="center">
              <Chip label={s.severity.toUpperCase()} size="small" sx={{ bgcolor: `${SEVERITY_COLOR[s.severity] || '#64748b'}22`, color: SEVERITY_COLOR[s.severity] || '#64748b', fontSize: 9, fontWeight: 800, letterSpacing: 0.5, height: 18 }} />
            </TableCell>
            <TableCell sx={{ fontSize: 11, color: 'rgba(243,238,224,0.75)', maxWidth: 320 }}>
              <Typography sx={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.riskReason}
              </Typography>
            </TableCell>
            <TableCell align="center" sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>{s.totalOrders}</TableCell>
            <TableCell align="center" sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>
              {s.refundedCount} / %{s.refundRatePct?.toFixed(1) ?? 0}
            </TableCell>
            <TableCell align="center" sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
              {s.failedCount} / %{s.failRatePct?.toFixed(1) ?? 0}
            </TableCell>
            <TableCell align="center">
              <Stack direction="row" justifyContent="center" spacing={0.5}>
                <Tooltip title="Kullanıcıyı aç" arrow>
                  <IconButton size="small" onClick={() => onOpenUser(s.email)} sx={{ color: 'rgba(201,162,39,0.7)' }}>
                    <OpenIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Flag et" arrow>
                  <IconButton size="small" onClick={() => onFlag(s)} sx={{ color: '#ef4444' }}>
                    <FlagIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FlaggedView({ rows, loading, onUnflag, onOpenUser }: {
  rows: FlaggedCustomer[]; loading?: boolean; onUnflag: (f: FlaggedCustomer) => void; onOpenUser: (email: string) => void;
}) {
  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 1, borderRadius: 0.5 }} />)}
      </Box>
    );
  }
  if (rows.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, color: 'rgba(243,238,224,0.5)' }}>Flag'li kullanıcı yok</Typography>
      </Box>
    );
  }
  return (
    <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.05)', color: '#F3EEE0' } }}>
      <TableHead>
        <TableRow>
          <HeaderCell>Email</HeaderCell>
          <HeaderCell>Neden</HeaderCell>
          <HeaderCell>Flag'leyen</HeaderCell>
          <HeaderCell>Tarih</HeaderCell>
          <HeaderCell align="center">Aksiyon</HeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(f => (
          <TableRow key={f.id} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
            <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>{f.email}</TableCell>
            <TableCell sx={{ fontSize: 11, color: 'rgba(243,238,224,0.75)', maxWidth: 360 }}>
              <Typography sx={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.reason}</Typography>
            </TableCell>
            <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: '#C9A227' }}>{f.flaggedByEmail}</TableCell>
            <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.6)' }}>{safeDate(f.flaggedAt)}</TableCell>
            <TableCell align="center">
              <Stack direction="row" justifyContent="center" spacing={0.5}>
                <Tooltip title="Kullanıcıyı aç" arrow>
                  <IconButton size="small" onClick={() => onOpenUser(f.email)} sx={{ color: 'rgba(201,162,39,0.7)' }}>
                    <OpenIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Flag kaldır" arrow>
                  <IconButton size="small" onClick={() => onUnflag(f)} sx={{ color: 'rgba(34,197,94,0.7)' }}>
                    <UnflagIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatTile({ label, value, color, loading, hint, asString }: { label: string; value: number | string; color: string; loading?: boolean; hint?: string; asString?: boolean }) {
  return (
    <Grid item xs={6} md={3}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#0F1A14', borderColor: 'rgba(201,162,39,0.18)' }}>
        <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        ) : (
          <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: asString ? 14 : 26, fontWeight: 700, color, lineHeight: 1.1, mt: 0.5 }}>
            {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
          </Typography>
        )}
        {hint && <Typography sx={{ mt: 0.5, fontSize: 9, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>{hint}</Typography>}
      </Paper>
    </Grid>
  );
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}

const fieldSx = {
  '& .MuiInputLabel-root': { color: 'rgba(243,238,224,0.6)', fontSize: 12 },
  '& .MuiInputLabel-root.Mui-focused': { color: '#C9A227' },
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.03)', fontSize: 12, color: '#F3EEE0',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
    '&:hover fieldset': { borderColor: 'rgba(201,162,39,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#C9A227' },
  },
};
