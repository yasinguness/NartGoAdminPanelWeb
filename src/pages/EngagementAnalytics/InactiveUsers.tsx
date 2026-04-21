/**
 * İnaktif Kullanıcılar — filtre + listeleme + bulk push.
 *
 * Endpoint: GET /auth/admin/analytics/inactive-users
 * Bulk push: POST /notifications/admin/push/bulk
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  Box, Stack, Paper, Grid, Typography, Chip, Checkbox, Table, TableHead,
  TableBody, TableRow, TableCell, ToggleButtonGroup, ToggleButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Pagination,
  Skeleton, Alert, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import {
  PersonOff as PersonOffIcon,
  NotificationsActive as NotifyIcon,
} from '@mui/icons-material';
import AdminShell from '../../components/AdminShell';
import { useRole } from '../../hooks/useRole';
import { darkAdmin } from '../../theme/darkAdmin';
import { userEngagementService } from '../../services/engagement/userEngagementService';
import type { InactiveUserDto, BulkPushResponse } from '../../types/engagement';

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

function safeDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return String(iso).slice(0, 10);
  }
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' | 'left' }) {
  return (
    <TableCell align={align} sx={{
      fontSize: 10, fontWeight: 800, letterSpacing: 1,
      color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase',
    }}>
      {children}
    </TableCell>
  );
}

export default function InactiveUsers() {
  const { isAdmin } = useRole();
  const { enqueueSnackbar } = useSnackbar();

  const [days, setDays] = useState<number>(30);
  const [platform, setPlatform] = useState<string>('MOBILE');
  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushDeepLink, setPushDeepLink] = useState('');
  const [lastErrors, setLastErrors] = useState<BulkPushResponse['errors']>([]);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt, error } = useQuery({
    queryKey: ['engagement', 'inactive-users', days, platform, page, size],
    queryFn: () => userEngagementService.getInactiveUsers({ days, platform, page, size }),
    staleTime: 60_000,
    enabled: isAdmin,
  });

  const pushMutation = useMutation({
    mutationFn: (payload: { userIds: string[]; title: string; body: string; deepLink?: string }) =>
      userEngagementService.sendBulkPush(payload),
    onSuccess: (res) => {
      enqueueSnackbar(
        `${res.queued}/${res.totalTargeted} kullanıcıya gönderildi${res.failed > 0 ? ` · ${res.failed} başarısız` : ''}`,
        { variant: res.failed > 0 ? 'warning' : 'success' },
      );
      setLastErrors(res.errors || []);
      setPushOpen(false);
      setPushTitle('');
      setPushBody('');
      setPushDeepLink('');
      setSelected(new Set());
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Push gönderilirken hata oluştu';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const users = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // KPI'ler — sayfada gelen veriden türetilir (server-side distribüsyon ayrı endpoint gerektirir)
  const kpis = useMemo(() => {
    const tot = totalElements;
    const b30 = users.filter(u => u.daysSinceLastLogin > 30).length;
    const b60 = users.filter(u => u.daysSinceLastLogin > 60).length;
    const b90 = users.filter(u => u.daysSinceLastLogin > 90).length;
    return { tot, b30, b60, b90 };
  }, [users, totalElements]);

  const allPageIds = users.map(u => u.userId);
  const allSelectedOnPage = allPageIds.length > 0 && allPageIds.every(id => selected.has(id));

  function toggleAllOnPage() {
    const next = new Set(selected);
    if (allSelectedOnPage) {
      allPageIds.forEach(id => next.delete(id));
    } else {
      allPageIds.forEach(id => next.add(id));
    }
    setSelected(next);
  }

  function toggleOne(userId: string) {
    const next = new Set(selected);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelected(next);
  }

  const canSend =
    selected.size > 0 &&
    pushTitle.trim().length >= 5 &&
    pushBody.trim().length >= 5 &&
    !pushMutation.isPending;

  function openPushDialog() {
    if (selected.size === 0) {
      enqueueSnackbar('Önce en az bir kullanıcı seçin', { variant: 'info' });
      return;
    }
    setPushOpen(true);
  }

  function handleSend() {
    if (!canSend) return;
    pushMutation.mutate({
      userIds: Array.from(selected),
      title: pushTitle.trim(),
      body: pushBody.trim(),
      deepLink: pushDeepLink.trim() || undefined,
    });
  }

  const status = (error as any)?.response?.status;
  const showEmptyAlert = !isLoading && (!!status && (status === 403 || status === 404 || status === 501));

  return (
    <AdminShell
      title="İnaktif Kullanıcılar"
      subtitle="Belirli süredir giriş yapmamış kullanıcılar · retention kampanyası"
      icon={<PersonOffIcon sx={{ fontSize: 26 }} />}
      label="Kullanıcı Etkileşimi • Yalnızca Admin"
      isFetching={isFetching}
      lastUpdatedAt={dataUpdatedAt}
      onRefresh={() => refetch()}
      showEmptyDataAlert={showEmptyAlert}
      emptyDataMessage="/auth/admin/analytics/inactive-users endpoint'ine ulaşılamadı."
      onEmptyDataRetry={() => refetch()}
      actions={
        <Button
          variant="contained"
          startIcon={<NotifyIcon />}
          onClick={openPushDialog}
          disabled={selected.size === 0}
          sx={{
            bgcolor: darkAdmin.status.primary,
            color: '#0F1A14',
            fontWeight: 700,
            fontSize: 12,
            textTransform: 'none',
            '&:hover': { bgcolor: '#B8941F' },
            '&.Mui-disabled': {
              bgcolor: 'rgba(0,0,0,0.08)',
              color: 'rgba(30,41,59,0.4)',
            },
          }}
        >
          Seçili Kullanıcılara Push ({selected.size})
        </Button>
      }
    >
      {/* Filter bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: darkAdmin.bg.card, borderColor: darkAdmin.border.default }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.55)', textTransform: 'uppercase', mb: 0.5 }}>
              İnaktivite Süresi
            </Typography>
            <ToggleButtonGroup
              size="small" exclusive value={days}
              onChange={(_, v) => { if (v !== null) { setDays(Number(v)); setPage(0); } }}
              sx={{
                bgcolor: darkAdmin.bg.surface,
                border: `1px solid ${darkAdmin.border.default}`,
                '& .MuiToggleButton-root': {
                  color: 'rgba(30,41,59,0.65)', fontSize: 11, fontWeight: 700,
                  px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(201,162,39,0.18)',
                    color: darkAdmin.status.primary,
                  },
                },
              }}
            >
              {DAY_OPTIONS.map(d => (
                <ToggleButton key={d} value={d}>{d}g+</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel sx={{ fontSize: 12 }}>Platform</InputLabel>
            <Select
              label="Platform"
              value={platform}
              onChange={(e) => { setPlatform(String(e.target.value)); setPage(0); }}
            >
              <MenuItem value="MOBILE">Mobile (tümü)</MenuItem>
              <MenuItem value="ANDROID">Android</MenuItem>
              <MenuItem value="IOS">iOS</MenuItem>
              <MenuItem value="WEB">Web</MenuItem>
              <MenuItem value="ALL">Tümü (platform filtresi yok)</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Typography sx={{ fontSize: 11, color: darkAdmin.text.secondary }}>
            Toplam <strong>{totalElements.toLocaleString('tr-TR')}</strong> kullanıcı · Sayfa {page + 1}/{Math.max(totalPages, 1)}
          </Typography>
        </Stack>
      </Paper>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: `Toplam İnaktif (${days}g+)`, value: kpis.tot, color: darkAdmin.status.primary },
          { label: '>30 gün bu sayfada', value: kpis.b30, color: darkAdmin.status.warning },
          { label: '>60 gün bu sayfada', value: kpis.b60, color: '#f59e0b' },
          { label: '>90 gün bu sayfada', value: kpis.b90, color: darkAdmin.status.error },
        ].map((c) => (
          <Grid item xs={6} md={3} key={c.label}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, ...darkAdmin.sx.statTile, height: '100%' }}>
              <Typography sx={{ ...darkAdmin.sx.sectionLabel }}>
                {c.label}
              </Typography>
              {isLoading ? (
                <Skeleton variant="text" width="60%" height={36} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
              ) : (
                <Typography sx={{ ...darkAdmin.sx.kpiValue, color: c.color, mt: 0.5 }}>
                  {Number(c.value || 0).toLocaleString('tr-TR')}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Errors from last push (if any) */}
      {lastErrors && lastErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setLastErrors([])}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5 }}>
            {lastErrors.length} kullanıcıya push gönderilemedi:
          </Typography>
          <Box sx={{ maxHeight: 120, overflowY: 'auto', fontSize: 11 }}>
            {lastErrors.slice(0, 10).map((e, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, py: 0.25 }}>
                <code style={{ fontFamily: 'monospace', color: '#64748b' }}>{e.userId.slice(0, 8)}…</code>
                <Typography sx={{ fontSize: 11 }}>{e.reason}</Typography>
              </Box>
            ))}
            {lastErrors.length > 10 && (
              <Typography sx={{ fontSize: 11, color: darkAdmin.text.secondary, mt: 0.5 }}>
                … ve {lastErrors.length - 10} daha
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: darkAdmin.bg.card, borderColor: darkAdmin.border.default, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />
            ))}
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, color: darkAdmin.status.success, fontWeight: 700 }}>
              Bu kriterlerle inaktif kullanıcı bulunamadı.
            </Typography>
          </Box>
        ) : (
          <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: darkAdmin.border.subtle, color: darkAdmin.text.primary } }}>
            <TableHead>
              <TableRow>
                <HeaderCell>
                  <Checkbox
                    size="small"
                    checked={allSelectedOnPage}
                    indeterminate={!allSelectedOnPage && allPageIds.some(id => selected.has(id))}
                    onChange={toggleAllOnPage}
                    sx={{ color: darkAdmin.status.primary, '&.Mui-checked': { color: darkAdmin.status.primary } }}
                  />
                </HeaderCell>
                <HeaderCell>Kullanıcı</HeaderCell>
                <HeaderCell>Email</HeaderCell>
                <HeaderCell align="center">Son Giriş</HeaderCell>
                <HeaderCell align="center">Kaç Gündür</HeaderCell>
                <HeaderCell align="center">Platform</HeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u: InactiveUserDto) => {
                const isSel = selected.has(u.userId);
                return (
                  <TableRow
                    key={u.userId}
                    hover
                    selected={isSel}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' },
                      '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.08) !important' },
                    }}
                    onClick={() => toggleOne(u.userId)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={isSel}
                        onChange={() => toggleOne(u.userId)}
                        sx={{ color: darkAdmin.status.primary, '&.Mui-checked': { color: darkAdmin.status.primary } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>
                      {u.userName || <span style={{ opacity: 0.5 }}>—</span>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: darkAdmin.status.primary }}>
                      {u.userEmail || u.userId.slice(0, 12)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 11, color: darkAdmin.text.secondary }}>
                      {safeDate(u.lastLoginAt)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${u.daysSinceLastLogin}g`}
                        size="small"
                        sx={{
                          bgcolor: u.daysSinceLastLogin > 90 ? 'rgba(220,38,38,0.12)'
                            : u.daysSinceLastLogin > 60 ? 'rgba(245,158,11,0.15)'
                            : u.daysSinceLastLogin > 30 ? 'rgba(201,162,39,0.18)'
                            : 'rgba(100,116,139,0.15)',
                          color: u.daysSinceLastLogin > 90 ? darkAdmin.status.error
                            : u.daysSinceLastLogin > 60 ? '#f59e0b'
                            : u.daysSinceLastLogin > 30 ? darkAdmin.status.primary
                            : darkAdmin.status.neutral,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: 0.3,
                          height: 20,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 10, color: darkAdmin.text.muted, letterSpacing: 1 }}>
                      {u.platform || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, v) => setPage(v - 1)}
            color="standard"
            size="small"
            sx={{
              '& .MuiPaginationItem-root': { fontSize: 12, color: darkAdmin.text.primary },
              '& .Mui-selected': {
                bgcolor: 'rgba(201,162,39,0.18) !important',
                color: `${darkAdmin.status.primary} !important`,
                fontWeight: 700,
              },
            }}
          />
        </Stack>
      )}

      {/* Push dialog */}
      <Dialog open={pushOpen} onClose={() => !pushMutation.isPending && setPushOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Bulk Push Bildirimi
          <Typography sx={{ fontSize: 11, color: darkAdmin.text.secondary, mt: 0.5 }}>
            {selected.size} kullanıcıya gönderilecek
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Başlık"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              fullWidth
              size="small"
              helperText="Min. 5 karakter"
              error={pushTitle.length > 0 && pushTitle.trim().length < 5}
              inputProps={{ maxLength: 80 }}
            />
            <TextField
              label="İçerik"
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
              helperText={`${pushBody.length}/200 · Min. 5 karakter`}
              error={pushBody.length > 0 && pushBody.trim().length < 5}
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              label="Deep Link (opsiyonel)"
              value={pushDeepLink}
              onChange={(e) => setPushDeepLink(e.target.value)}
              fullWidth
              size="small"
              placeholder="nartgo://events/123 veya https://..."
              helperText="Bildirim tıklanınca açılacak URL"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPushOpen(false)} disabled={pushMutation.isPending}>
            İptal
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            variant="contained"
            sx={{
              bgcolor: darkAdmin.status.primary,
              color: '#0F1A14',
              fontWeight: 700,
              '&:hover': { bgcolor: '#B8941F' },
            }}
          >
            {pushMutation.isPending ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminShell>
  );
}
