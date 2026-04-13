/**
 * TicketFilters — Arama + durum filtresi + yenile + toplu iptal
 */
import {
  Box, TextField, InputAdornment, FormControl, Select, MenuItem,
  Tooltip, IconButton, Button, Typography, CircularProgress,
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { TicketStatus } from '../../../types/tickets/ticketTypes';

const STATUS_OPTIONS: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: TicketStatus.ACTIVE, label: 'Aktif' },
  { value: TicketStatus.CHECKED_IN, label: 'Giriş Yapıldı' },
  { value: TicketStatus.USED, label: 'Kullanıldı' },
  { value: TicketStatus.CANCELLED, label: 'İptal' },
  { value: TicketStatus.REFUNDED, label: 'İade Edildi' },
  { value: TicketStatus.RESERVED, label: 'Rezerve' },
];

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: TicketStatus | '';
  onStatusChange: (v: TicketStatus | '') => void;
  onRefresh: () => void;
  loading: boolean;
  selectedCount: number;
  onBulkCancel: () => void;
  cancelLoading: boolean;
  totalCount: number;
}

export default function TicketFilters({
  search, onSearchChange, statusFilter, onStatusChange,
  onRefresh, loading, selectedCount, onBulkCancel, cancelLoading, totalCount,
}: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
      <TextField size="small" placeholder="Bilet no, e-posta veya sipariş no ara..."
        value={search} onChange={e => onSearchChange(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
        sx={{ flex: 1, minWidth: 200, maxWidth: 360, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select value={statusFilter} displayEmpty
          onChange={e => onStatusChange(e.target.value as TicketStatus | '')}
          sx={{ borderRadius: 2, fontSize: 13 }}>
          {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>
      <Tooltip title="Yenile">
        <IconButton size="small" onClick={onRefresh} disabled={loading}><RefreshIcon fontSize="small" /></IconButton>
      </Tooltip>
      {selectedCount > 0 && (
        <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />}
          onClick={onBulkCancel} disabled={cancelLoading}
          sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12 }}>
          {cancelLoading ? <CircularProgress size={14} /> : `${selectedCount} Bilet İptal Et`}
        </Button>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
        {totalCount} bilet
      </Typography>
    </Box>
  );
}
