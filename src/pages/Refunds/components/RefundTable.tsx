import { useState, useMemo } from 'react';
import {
  Paper, Box, Typography, Stack, Chip, Skeleton, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  ToggleButtonGroup, ToggleButton, TextField, InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Build as ActionIcon,
  OpenInNew as OpenIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { RefundItem } from '../../../services/refunds/refundTypes';
import { formatAge, formatMoneyFull, safeDate, STATUS_COLOR, STATUS_LABEL } from './helpers';

interface Props {
  rows?: RefundItem[];
  loading?: boolean;
  onAction: (item: RefundItem) => void;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'PENDING', label: 'Bekleyen' },
  { key: 'PROCESSING', label: 'İşleniyor' },
  { key: 'COMPLETED', label: 'Tamamlandı' },
  { key: 'FAILED', label: 'Başarısız' },
];

export default function RefundTable({ rows, loading, onAction, statusFilter, onStatusFilter }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter(r => {
      const hay = [r.refundId, r.paymentId, r.orderId, r.eventId, r.transactionId, r.reason].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
      {/* Filter bar */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <ToggleButtonGroup
          size="small"
          value={statusFilter}
          exclusive
          onChange={(_, v) => v && onStatusFilter(v)}
          sx={{
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            '& .MuiToggleButton-root': {
              color: 'rgba(243,238,224,0.6)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
              '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
            },
          }}
        >
          {STATUS_FILTERS.map(f => <ToggleButton key={f.key} value={f.key}>{f.label}</ToggleButton>)}
        </ToggleButtonGroup>

        <Box sx={{ flex: 1 }} />

        <TextField
          size="small"
          placeholder="Refund/Payment/Order/TX ara..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'rgba(243,238,224,0.4)' }} /></InputAdornment>,
          }}
          sx={{
            minWidth: 280,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.03)', fontSize: 12, color: '#F3EEE0',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
            },
          }}
        />
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ p: 2 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 1, borderRadius: 0.5 }} />
          ))}
        </Box>
      ) : !rows || rows.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, color: '#22c55e', fontWeight: 700 }}>
            ✓ Hiç iade kaydı yok
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
            Filtreyle eşleşen iade yok
          </Typography>
        </Box>
      ) : (
        <>
          <Table size="small" sx={{
            '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.05)', color: '#F3EEE0' },
          }}>
            <TableHead>
              <TableRow>
                <HeaderCell>Durum</HeaderCell>
                <HeaderCell>Refund / Payment</HeaderCell>
                <HeaderCell align="right">Tutar</HeaderCell>
                <HeaderCell>Sebep</HeaderCell>
                <HeaderCell align="center">Yaş</HeaderCell>
                <HeaderCell>Tarih</HeaderCell>
                <HeaderCell align="center">Aksiyon</HeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map(r => (
                <TableRow key={r.refundId} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        label={STATUS_LABEL[r.status] || r.status}
                        size="small"
                        sx={{
                          bgcolor: `${STATUS_COLOR[r.status] || '#64748b'}22`,
                          color: STATUS_COLOR[r.status] || '#64748b',
                          fontSize: 9, fontWeight: 800, letterSpacing: 0.5, height: 20,
                        }}
                      />
                      {r.slaBreach && (
                        <Tooltip title="SLA ihlali (48sa üstü)" arrow>
                          <WarnIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.7)' }}>
                        refund: {r.refundId.slice(0, 8)}…
                      </Typography>
                      {r.paymentId && (
                        <Typography sx={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(243,238,224,0.4)' }}>
                          pay: {r.paymentId.slice(0, 8)}…
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>
                    −{formatMoneyFull(r.amount, r.currency)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, color: 'rgba(243,238,224,0.7)', maxWidth: 280 }}>
                    <Typography sx={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.reason || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography sx={{
                      fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                      color: r.slaBreach ? '#ef4444' : (r.ageHours ?? 0) > 24 ? '#f59e0b' : 'rgba(243,238,224,0.7)',
                    }}>
                      {formatAge(r.ageHours)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.6)' }}>
                    {safeDate(r.refundDate)}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" justifyContent="center">
                      {r.eventId && (
                        <Tooltip title="Etkinliği aç" arrow>
                          <IconButton size="small" onClick={() => navigate(`/event-console/${r.eventId}`)} sx={{ color: 'rgba(201,162,39,0.7)' }}>
                            <OpenIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="İade aksiyonu" arrow>
                        <IconButton size="small" onClick={() => onAction(r)} sx={{ color: '#C9A227' }}>
                          <ActionIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Sayfa başı"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            sx={{
              color: 'rgba(243,238,224,0.7)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              '& .MuiSelect-icon': { color: 'rgba(243,238,224,0.5)' },
            }}
          />
        </>
      )}
    </Paper>
  );
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
