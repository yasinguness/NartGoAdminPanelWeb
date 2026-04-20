import { useState, useMemo } from 'react';
import {
  Paper, Box, Typography, Stack, Chip, Skeleton, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  ToggleButtonGroup, ToggleButton, TextField, InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Build as FixIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import type { Mismatch } from '../../../services/reconciliation/reconciliationTypes';
import { formatAge, formatMoney, safeDate, TYPE_COLOR, TYPE_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from './helpers';

interface Props {
  rows?: Mismatch[];
  loading?: boolean;
  onResolve: (mismatch: Mismatch) => void;
}

const FILTERS = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'high', label: 'Kritik' },
  { key: 'medium', label: 'Orta' },
  { key: 'low', label: 'Düşük' },
];

const TYPE_FILTERS = [
  { key: 'ALL', label: 'Tüm tipler' },
  { key: 'STALE_PENDING', label: 'Takılı' },
  { key: 'ORPHANED_CHECKOUT', label: 'Boşta' },
  { key: 'PROVIDER_DB_DRIFT', label: 'Drift' },
  { key: 'DUPLICATE_TRANSACTION', label: 'Mükerrer' },
];

export default function MismatchTable({ rows, loading, onResolve }: Props) {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filtered = useMemo(() => {
    const data = rows || [];
    const q = search.trim().toLowerCase();
    return data.filter(m => {
      if (severityFilter !== 'ALL' && m.severity !== severityFilter) return false;
      if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
      if (q) {
        const hay = [m.paymentId, m.orderId, m.transactionId, m.sessionToken].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, severityFilter, typeFilter, search]);

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleCopy = (text?: string) => {
    if (text) navigator.clipboard?.writeText(text).catch(() => { /* ignore */ });
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
      {/* Filter bar */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <ToggleGroup value={severityFilter} onChange={setSeverityFilter} options={FILTERS} />
        <ToggleGroup value={typeFilter} onChange={setTypeFilter} options={TYPE_FILTERS} />
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Payment/Order/TX ara..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'rgba(243,238,224,0.4)' }} /></InputAdornment>,
          }}
          sx={{
            minWidth: 260,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.03)',
              fontSize: 12,
              color: '#F3EEE0',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
            },
          }}
        />
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ p: 2 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} variant="rectangular" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 1, borderRadius: 0.5 }} />
          ))}
        </Box>
      ) : !rows || rows.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, color: '#22c55e', fontWeight: 700 }}>
            ✓ Hiç uyumsuzluk yok
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.5)', mt: 0.5 }}>
            Son tarama temiz
          </Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
            Filtreyle eşleşen uyumsuzluk yok
          </Typography>
        </Box>
      ) : (
        <>
          <Table size="small" sx={{
            '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.05)', color: '#F3EEE0' },
          }}>
            <TableHead>
              <TableRow>
                <HeaderCell>Severity</HeaderCell>
                <HeaderCell>Tip</HeaderCell>
                <HeaderCell>Payment / Order</HeaderCell>
                <HeaderCell>Durum (DB / Provider)</HeaderCell>
                <HeaderCell align="right">Tutar</HeaderCell>
                <HeaderCell align="center">Yaş</HeaderCell>
                <HeaderCell>Oluşturuldu</HeaderCell>
                <HeaderCell align="center">Aksiyon</HeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map(m => (
                <TableRow key={m.paymentId} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
                  <TableCell>
                    <Chip
                      label={SEVERITY_LABEL[m.severity] || m.severity}
                      size="small"
                      sx={{
                        bgcolor: `${SEVERITY_COLOR[m.severity] || '#64748b'}22`,
                        color: SEVERITY_COLOR[m.severity] || '#64748b',
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: 0.5,
                        height: 20,
                        textTransform: 'uppercase',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: TYPE_COLOR[m.type] || '#F3EEE0' }}>
                      {TYPE_LABEL[m.type] || m.type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.7)' }}>
                          {m.paymentId ? `${m.paymentId.slice(0, 8)}…` : '—'}
                        </Typography>
                        <Tooltip title="Payment ID kopyala" arrow>
                          <IconButton size="small" onClick={() => handleCopy(m.paymentId)} sx={{ p: 0.25 }}>
                            <CopyIcon sx={{ fontSize: 10, color: 'rgba(243,238,224,0.3)' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      {m.orderId && (
                        <Typography sx={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(243,238,224,0.4)' }}>
                          order: {m.orderId.slice(0, 8)}…
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Chip label={m.dbStatus || '—'} size="small" sx={{ fontSize: 9, fontWeight: 700, height: 18, bgcolor: 'rgba(255,255,255,0.06)', color: '#F3EEE0' }} />
                      {m.providerResponseCode && (
                        <Typography sx={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(243,238,224,0.5)' }}>
                          Iyzico: {m.providerResponseCode}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                    {formatMoney(m.dbAmount, m.currency)}
                  </TableCell>
                  <TableCell align="center">
                    <Typography sx={{
                      fontSize: 11,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: (m.ageMinutes ?? 0) > 1440 ? '#ef4444' : (m.ageMinutes ?? 0) > 360 ? '#f59e0b' : 'rgba(243,238,224,0.7)',
                    }}>
                      {formatAge(m.ageMinutes)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.6)' }}>
                    {safeDate(m.createdAt)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Manuel çöz" arrow>
                      <IconButton size="small" onClick={() => onResolve(m)} sx={{ color: '#C9A227' }}>
                        <FixIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
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

function ToggleGroup({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <ToggleButtonGroup
      size="small"
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      sx={{
        bgcolor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        '& .MuiToggleButton-root': {
          color: 'rgba(243,238,224,0.6)',
          fontSize: 10,
          fontWeight: 700,
          px: 1.25,
          py: 0.5,
          border: 'none',
          textTransform: 'none',
          '&.Mui-selected': {
            bgcolor: 'rgba(201,162,39,0.18)',
            color: '#C9A227',
          },
        },
      }}
    >
      {options.map(o => (
        <ToggleButton key={o.key} value={o.key}>{o.label}</ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
