import { useState } from 'react';
import {
  Paper, Box, Stack, Typography, Checkbox, Chip, IconButton, Collapse,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { OrganizerPayout, PayoutBatchRef } from '../../../services/payouts/payoutTypes';
import { formatMoneyFull, formatAge, safeDate, ageHoursFrom } from './helpers';

interface Props {
  organizer: OrganizerPayout;
  selectedBatches: Set<string>;
  onToggleBatch: (batchId: string) => void;
  onSelectAllOrganizerBatches: (ids: string[], selectAll: boolean) => void;
}

export default function OrganizerRow({ organizer, selectedBatches, onToggleBatch, onSelectAllOrganizerBatches }: Props) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const pendingRefs = organizer.pendingBatchRefs || [];
  const allPendingIds = pendingRefs.map(b => b.batchId);
  const allSelected = allPendingIds.length > 0 && allPendingIds.every(id => selectedBatches.has(id));
  const someSelected = allPendingIds.some(id => selectedBatches.has(id));

  const oldestHours = ageHoursFrom(organizer.oldestPendingAt);
  const slaColor = oldestHours > 72 ? '#ef4444' : oldestHours > 24 ? '#f59e0b' : oldestHours > 0 ? '#64748b' : 'rgba(243,238,224,0.5)';

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
      {/* Header row */}
      <Box
        sx={{
          px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(201,162,39,0.04)' },
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <Checkbox
          size="small"
          checked={allSelected}
          indeterminate={!allSelected && someSelected}
          disabled={allPendingIds.length === 0}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onSelectAllOrganizerBatches(allPendingIds, !allSelected)}
          sx={{ color: 'rgba(243,238,224,0.5)', '&.Mui-checked': { color: '#C9A227' }, '&.MuiCheckbox-indeterminate': { color: '#C9A227' } }}
        />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, fontWeight: 700, color: '#F3EEE0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {organizer.displayName}
            </Typography>
            {organizer.failedBatches > 0 && (
              <Chip label={`${organizer.failedBatches} failed`} size="small" sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 9, fontWeight: 800, height: 18 }} />
            )}
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mt: 0.25 }}>
            {organizer.pendingBatches > 0 && (
              <Typography sx={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
                {organizer.pendingBatches} pending
              </Typography>
            )}
            {organizer.approvedBatches > 0 && (
              <Typography sx={{ fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>
                {organizer.approvedBatches} approved
              </Typography>
            )}
            {organizer.paidBatches > 0 && (
              <Typography sx={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>
                {organizer.paidBatches} paid
              </Typography>
            )}
          </Stack>
        </Box>

        {/* Amounts */}
        <Stack direction="row" spacing={3} sx={{ minWidth: 0 }}>
          <AmountCell label="Pending" value={formatMoneyFull(organizer.pendingAmount, organizer.currency)} color="#f59e0b" />
          <AmountCell label="Approved" value={formatMoneyFull(organizer.approvedAmount, organizer.currency)} color="#3b82f6" />
          <AmountCell label="Paid" value={formatMoneyFull(organizer.paidAmount, organizer.currency)} color="#22c55e" />
        </Stack>

        {/* SLA indicator */}
        {organizer.oldestPendingAt && (
          <Box sx={{ textAlign: 'right', minWidth: 90 }}>
            <Typography sx={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, color: 'rgba(243,238,224,0.4)', textTransform: 'uppercase' }}>
              En eski
            </Typography>
            <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: slaColor, fontWeight: 700 }}>
              {safeDate(organizer.oldestPendingAt)}
            </Typography>
          </Box>
        )}

        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }} sx={{ color: 'rgba(243,238,224,0.5)' }}>
          {expanded ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      </Box>

      {/* Expand: batch list */}
      <Collapse in={expanded}>
        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(0,0,0,0.15)' }}>
          {pendingRefs.length === 0 ? (
            <Typography sx={{ py: 2, px: 3, fontSize: 11, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
              Bekleyen batch yok
            </Typography>
          ) : (
            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.05)', color: '#F3EEE0', py: 1 } }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <HeaderCell>Batch ID</HeaderCell>
                  <HeaderCell align="right">Tutar</HeaderCell>
                  <HeaderCell>Durum</HeaderCell>
                  <HeaderCell align="center">Yaş</HeaderCell>
                  <HeaderCell>Tarih</HeaderCell>
                  <HeaderCell align="center" />
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingRefs.map(b => (
                  <BatchRowInner
                    key={b.batchId}
                    batch={b}
                    currency={organizer.currency}
                    selected={selectedBatches.has(b.batchId)}
                    onToggle={() => onToggleBatch(b.batchId)}
                    onOpenSettlement={() => navigate(`/settlement-finance?batchId=${b.batchId}`)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

function AmountCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Typography sx={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, color: 'rgba(243,238,224,0.4)', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color }}>
        {value}
      </Typography>
    </Box>
  );
}

function BatchRowInner({ batch, currency, selected, onToggle, onOpenSettlement }: {
  batch: PayoutBatchRef; currency: string; selected: boolean; onToggle: () => void; onOpenSettlement: () => void;
}) {
  const ageHours = (batch.ageMinutes ?? 0) / 60;
  const ageColor = ageHours > 72 ? '#ef4444' : ageHours > 24 ? '#f59e0b' : 'rgba(243,238,224,0.7)';

  return (
    <TableRow hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.03) !important' } }}>
      <TableCell padding="checkbox">
        <Checkbox
          size="small"
          checked={selected}
          onChange={onToggle}
          sx={{ color: 'rgba(243,238,224,0.5)', '&.Mui-checked': { color: '#C9A227' } }}
        />
      </TableCell>
      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.7)' }}>
        {batch.batchId.slice(0, 8)}…
      </TableCell>
      <TableCell align="right" sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
        {formatMoneyFull(batch.payoutAmount, currency)}
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5}>
          <Chip label={batch.status || '—'} size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }} />
          {batch.payoutStatus && batch.payoutStatus !== 'NOT_STARTED' && batch.payoutStatus !== 'UNASSIGNED' && (
            <Chip label={batch.payoutStatus} size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(243,238,224,0.6)' }} />
          )}
        </Stack>
      </TableCell>
      <TableCell align="center" sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: ageColor }}>
        {formatAge(batch.ageMinutes)}
      </TableCell>
      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.6)' }}>
        {safeDate(batch.transactionDate)}
      </TableCell>
      <TableCell align="center">
        <IconButton size="small" onClick={onOpenSettlement} sx={{ color: 'rgba(201,162,39,0.7)' }}>
          <OpenIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

function HeaderCell({ children, align }: { children?: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
