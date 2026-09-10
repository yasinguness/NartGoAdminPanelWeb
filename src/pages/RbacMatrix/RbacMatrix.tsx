import { useMemo, useState } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  Security as RbacIcon,
  CheckCircle as CheckIcon,
  Cancel as DenyIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useRbac } from './useRbac';
import { ROLE_ROUTE_MAP, ROLES } from '../../config/roles';

type ViewMode = 'MATRIX' | 'BREAKDOWN' | 'AUDIT';

const ALL_ROLES = Object.values(ROLES);

function safeDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function RbacMatrix() {
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('MATRIX');
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useRbac();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

  const routes = ROLE_ROUTE_MAP;
  const recentChanges = data?.recentRoleChanges || [];

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
                  RBAC Matrix • Security • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  <RbacIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    RBAC Matrisi
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    Rol × Yetki matrisi · rol dağılımı · son rol değişimleri
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <ToggleButtonGroup
                size="small"
                value={view}
                exclusive
                onChange={(_, v) => v && setView(v)}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  '& .MuiToggleButton-root': {
                    color: 'rgba(30,41,59,0.60)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                    '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
                  },
                }}
              >
                <ToggleButton value="MATRIX">Matris</ToggleButton>
                <ToggleButton value="BREAKDOWN">Rol Dağılımı</ToggleButton>
                <ToggleButton value="AUDIT">Audit</ToggleButton>
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

        {/* Top stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <StatTile label="Toplam Kullanıcı" value={data?.totalUsers ?? 0} color="#C9A227" loading={isLoading} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Rol Sayısı" value={ALL_ROLES.length} color="#3b82f6" loading={isLoading} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Korunan Route" value={routes.length} color="#8b5cf6" loading={isLoading} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile
              label="30G Rol Değişimi"
              value={data?.roleChangeCountLast30d ?? 0}
              color={(data?.roleChangeCountLast30d ?? 0) > 10 ? '#ef4444' : '#22c55e'}
              loading={isLoading}
              hint="USER_ROLE_ADDED + USER_ROLE_REMOVED"
            />
          </Grid>
        </Grid>

        {/* MATRIX VIEW */}
        {view === 'MATRIX' && (
          <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                Rol × Route Erişim Matrisi
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'rgba(30,41,59,0.50)', fontStyle: 'normal', mt: 0.5 }}>
                Kaynak: <code style={{ fontFamily: 'monospace' }}>config/roles.ts → ROLE_ROUTE_MAP</code>
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader sx={{
                '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' },
                minWidth: 900,
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{
                      position: 'sticky', left: 0, zIndex: 2,
                      bgcolor: '#FFFFFF !important',
                      fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase',
                      minWidth: 240,
                    }}>
                      Route
                    </TableCell>
                    {ALL_ROLES.map(r => (
                      <TableCell
                        key={r}
                        align="center"
                        sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase', bgcolor: 'rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}
                      >
                        {r.replace('ROLE_', '').replace('EVENT_ORGANIZATOR', 'EVENT_ORG')}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routes.map(route => {
                    const allowedRoles = route.roles.map(String);
                    return (
                      <TableRow key={route.path} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.03) !important' } }}>
                        <TableCell sx={{
                          position: 'sticky', left: 0, zIndex: 1,
                          bgcolor: '#FFFFFF',
                          fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#C9A227',
                        }}>
                          <Box>
                            {route.path}
                          </Box>
                          {route.description && (
                            <Typography sx={{ fontSize: 9, color: 'rgba(30,41,59,0.50)', fontStyle: 'normal', fontWeight: 400 }}>
                              {route.description}
                            </Typography>
                          )}
                        </TableCell>
                        {ALL_ROLES.map(r => {
                          const granted = allowedRoles.includes(r);
                          return (
                            <TableCell key={r} align="center" sx={{ minWidth: 56, py: 1 }}>
                              {granted ? (
                                <Tooltip title={`${r} → ${route.path}`} arrow>
                                  <CheckIcon sx={{ fontSize: 18, color: '#22c55e' }} />
                                </Tooltip>
                              ) : (
                                <DenyIcon sx={{ fontSize: 14, color: 'rgba(239,68,68,0.2)' }} />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        )}

        {/* BREAKDOWN VIEW */}
        {view === 'BREAKDOWN' && (
          <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                Rol Bazlı Kullanıcı Dağılımı
              </Typography>
            </Box>
            {isLoading ? (
              <Box sx={{ p: 2 }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />)}
              </Box>
            ) : !data?.rolesBreakdown || data.rolesBreakdown.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
                  Rol verisi yok
                </Typography>
              </Box>
            ) : (
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' } }}>
                <TableHead>
                  <TableRow>
                    <HeaderCell>Rol</HeaderCell>
                    <HeaderCell align="right">Kullanıcı Sayısı</HeaderCell>
                    <HeaderCell align="center">Oran</HeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rolesBreakdown.map(r => (
                    <TableRow key={r.roleName} hover>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#C9A227', fontSize: 12 }}>
                          {r.roleName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                        {r.userCount.toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell align="center" sx={{ minWidth: 180 }}>
                        {r.percentOfTotal !== undefined && (
                          <Stack spacing={0.5}>
                            <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                              %{r.percentOfTotal.toFixed(2)}
                            </Typography>
                            <LinearProgress
                              variant="determinate" value={Math.min(100, r.percentOfTotal)}
                              sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.05)', '& .MuiLinearProgress-bar': { bgcolor: '#C9A227' } }}
                            />
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}

        {/* AUDIT VIEW */}
        {view === 'AUDIT' && (
          <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <HistoryIcon sx={{ fontSize: 16, color: '#C9A227' }} />
              <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                Son Rol Değişimleri · USER_ROLE_ADDED / USER_ROLE_REMOVED
              </Typography>
            </Stack>
            {isLoading ? (
              <Box sx={{ p: 2 }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />)}
              </Box>
            ) : recentChanges.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
                  Kayıtlı rol değişimi yok
                </Typography>
              </Box>
            ) : (
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' } }}>
                <TableHead>
                  <TableRow>
                    <HeaderCell>Tarih</HeaderCell>
                    <HeaderCell>Admin</HeaderCell>
                    <HeaderCell>Aksiyon</HeaderCell>
                    <HeaderCell>Hedef</HeaderCell>
                    <HeaderCell>Detay</HeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentChanges.map((c, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.60)' }}>
                        {safeDate(c.createdAt)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#C9A227', fontWeight: 700 }}>
                        {c.actorEmail || '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.action || '—'}
                          size="small"
                          sx={{
                            bgcolor: c.action === 'USER_ROLE_ADDED' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: c.action === 'USER_ROLE_ADDED' ? '#22c55e' : '#ef4444',
                            fontSize: 9, fontWeight: 800, letterSpacing: 0.5, height: 20,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: '#1E293B' }}>
                        {c.targetEmail || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.60)', maxWidth: 300 }}>
                        <Typography sx={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.details || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'right' }}>
              <Button size="small" onClick={() => navigate('/audit-log?action=USER_ROLE_ADDED')} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>
                Tüm Audit Log'u Gör →
              </Button>
            </Box>
          </Paper>
        )}

        {(!isLoading && !data) && (
          <Alert severity="info" icon={false} sx={{ mt: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(30,41,59,0.85)' }}
            action={<Button size="small" onClick={() => refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Typography sx={{ fontSize: 12 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/auth/admin/rbac/overview</code> endpoint'ine ulaşılamadı. Matris yine görüntüleniyor (frontend config'inden).
            </Typography>
          </Alert>
        )}

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO RBAC • {routes.length} korumalı route · {ALL_ROLES.length} rol
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function StatTile({ label, value, color, loading, hint }: { label: string; value: number | string; color: string; loading?: boolean; hint?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: 'rgba(201,162,39,0.18)' }}>
      <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
      ) : (
        <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 26, fontWeight: 700, color, lineHeight: 1.1, mt: 0.5 }}>
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </Typography>
      )}
      {hint && <Typography sx={{ mt: 0.5, fontSize: 9, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>{hint}</Typography>}
    </Paper>
  );
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
