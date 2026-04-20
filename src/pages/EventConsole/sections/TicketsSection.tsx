/**
 * TicketsSection — Bilet tipi yönetimi (CRUD).
 * EventDetail'den migrate edildi — şimdi tek doğruluk kaynağı burası.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Stack, Paper, Typography, Chip, Button, IconButton, TextField, CircularProgress,
  LinearProgress, Tooltip, alpha, Grid,
} from '@mui/material';
import {
  Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Add as AddIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { EventResponseDTO } from '../../../types/events/eventModel';
import { TicketTypeResponse, CreateTicketTypeRequest } from '../../../types/tickets/ticketTypes';
import { ticketService } from '../../../services/ticket/ticketService';
import { adminOperationsService } from '../../../services/admin/adminOperationsService';
import { SectionListSkeleton, SectionEmpty } from './_shared';

const STATUS_COLOR_MAP: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  ACTIVE: 'success', SOLD_OUT: 'error', INACTIVE: 'default', ENDED: 'default',
};
const STATUS_LABEL_MAP: Record<string, string> = {
  ACTIVE: 'Satışta', SOLD_OUT: 'Tükendi', INACTIVE: 'Pasif', ENDED: 'Sona Erdi',
};

interface Props {
  event: EventResponseDTO;
}

export default function TicketsSection({ event }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TicketTypeResponse | null>(null);
  const [form, setForm] = useState({ name: '', basePrice: 0, capacityTotal: 100, currency: 'TRY', description: '' });

  const fetch = useCallback(async () => {
    if (!event.id) return;
    setLoading(true);
    try {
      const res = await adminOperationsService.getTicketTypes(event.id);
      setTicketTypes(res.data ?? []);
    } catch (err: any) {
      if (err?.response?.status !== 404) enqueueSnackbar('Bilet tipleri yüklenemedi', { variant: 'error' });
    } finally { setLoading(false); }
  }, [event.id, enqueueSnackbar]);

  useEffect(() => { fetch(); }, [fetch]);

  const resetForm = () => {
    setForm({ name: '', basePrice: 0, capacityTotal: 100, currency: 'TRY', description: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (t: TicketTypeResponse) => {
    setEditing(t);
    setForm({
      name: t.name,
      basePrice: t.basePrice,
      capacityTotal: t.capacityTotal,
      currency: t.currency || 'TRY',
      description: t.description || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!event.id || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload: CreateTicketTypeRequest = {
        eventId: event.id,
        name: form.name,
        basePrice: form.basePrice,
        capacityTotal: form.capacityTotal,
        currency: form.currency,
        description: form.description || undefined,
        saleStartAt: new Date().toISOString(),
        saleEndAt: event.eventTime ? new Date(event.eventTime).toISOString() : new Date().toISOString(),
      };

      if (editing) {
        await ticketService.updateTicketType(editing.id, payload);
        enqueueSnackbar('Bilet tipi güncellendi', { variant: 'success' });
      } else {
        await ticketService.createTicketType(payload);
        enqueueSnackbar('Bilet tipi oluşturuldu', { variant: 'success' });
      }

      // Event kapasitesini toplam bilet kapasitesiyle senkronize et
      try {
        const refreshed = await ticketService.getEventTicketTypes(event.id);
        const types: TicketTypeResponse[] = refreshed?.data ?? [];
        if (types.length > 0) {
          const totalCapacity = types.reduce((sum, t) => sum + (t.capacityTotal || 0), 0);
          if (totalCapacity > 0 && totalCapacity !== event.maxParticipants) {
            await adminOperationsService.updateEventCapacity(event.id, { maxParticipants: totalCapacity });
          }
        }
      } catch { /* best-effort sync */ }

      resetForm();
      fetch();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'İşlem başarısız', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (ticketId: string) => {
    if (!window.confirm('Bu bilet tipini silmek istediğinizden emin misiniz?')) return;
    setDeletingId(ticketId);
    try {
      await ticketService.deleteTicketType(ticketId);
      enqueueSnackbar('Bilet tipi silindi', { variant: 'success' });
      fetch();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Silinemedi', { variant: 'error' });
    } finally { setDeletingId(null); }
  };

  const stats = useMemo(() => ({
    total: ticketTypes.length,
    sold: ticketTypes.reduce((s, t) => s + (t.capacitySold || 0), 0),
    capacity: ticketTypes.reduce((s, t) => s + (t.capacityTotal || 0), 0),
    revenue: ticketTypes.reduce((s, t) => s + (t.capacitySold || 0) * (t.basePrice || 0), 0),
  }), [ticketTypes]);

  const lowStockCount = ticketTypes.filter(t => t.capacityTotal > 0 && (t.availableCapacity / t.capacityTotal) <= 0.2 && t.availableCapacity > 0).length;
  const soldOutCount = ticketTypes.filter(t => t.availableCapacity <= 0 && t.capacityTotal > 0).length;

  return (
    <Stack spacing={2}>
      {/* Özet kartlar */}
      <Grid container spacing={2}>
        {[
          { label: 'Bilet Tipi', value: stats.total, color: 'text.primary' },
          { label: 'Toplam Satış', value: stats.sold, color: 'success.main' },
          { label: 'Toplam Kapasite', value: stats.capacity, color: 'primary.main' },
          { label: 'Hesaplanan Gelir', value: `${stats.revenue.toLocaleString('tr-TR')} ₺`, color: 'warning.main' },
        ].map(s => (
          <Grid item xs={6} md={3} key={s.label}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 24, fontWeight: 700, color: s.color, mt: 0.5 }}>
                {s.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Uyarılar */}
      {lowStockCount > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.08), borderColor: alpha('#f59e0b', 0.3) }}>
          <Typography variant="body2" fontWeight={700} color="warning.dark">
            ⚠️ {lowStockCount} bilet tipinde stok azalıyor (%20 veya altında)
          </Typography>
        </Paper>
      )}
      {soldOutCount > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#ef4444', 0.06), borderColor: alpha('#ef4444', 0.2) }}>
          <Typography variant="body2" fontWeight={700} color="error.main">
            🚫 {soldOutCount} bilet tipi tükendi
          </Typography>
        </Paper>
      )}

      {/* Ana liste */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>Bilet Tipleri</Typography>
            <Typography variant="caption" color="text.secondary">
              {ticketTypes.length} tip · {stats.sold} satıldı
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Yenile">
              <IconButton size="small" onClick={fetch} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained" size="small" startIcon={<AddIcon />}
              onClick={() => { setEditing(null); setForm({ name: '', basePrice: 0, capacityTotal: 100, currency: 'TRY', description: '' }); setShowForm(true); }}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Yeni Bilet
            </Button>
          </Stack>
        </Box>

        {/* Inline form */}
        {showForm && (
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#3b82f6', 0.03) }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              {editing ? `"${editing.name}" Düzenle` : 'Yeni Bilet Tipi'}
            </Typography>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField size="small" fullWidth label="Bilet Adı" required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <TextField size="small" label="Fiyat (₺)" type="number"
                  value={form.basePrice}
                  onChange={e => setForm(f => ({ ...f, basePrice: Number(e.target.value) }))}
                  sx={{ width: { xs: '100%', md: 140 } }} InputProps={{ inputProps: { min: 0 } }}
                />
                <TextField size="small" label="Kapasite" type="number"
                  value={form.capacityTotal}
                  onChange={e => setForm(f => ({ ...f, capacityTotal: Number(e.target.value) }))}
                  sx={{ width: { xs: '100%', md: 120 } }} InputProps={{ inputProps: { min: 1 } }}
                />
              </Stack>
              <TextField size="small" fullWidth label="Açıklama (opsiyonel)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={resetForm} sx={{ textTransform: 'none' }}>İptal</Button>
                <Button size="small" variant="contained" onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  {saving ? <CircularProgress size={16} /> : editing ? 'Güncelle' : 'Oluştur'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {loading ? (
          <SectionListSkeleton rows={4} />
        ) : ticketTypes.length === 0 ? (
          <SectionEmpty icon={<span style={{ fontSize: 40 }}>🎫</span>} title="Henüz bilet tipi yok" message="İlk bilet tipini oluşturarak başlayın." />
        ) : (
          ticketTypes.map(ticket => {
            const soldPct = ticket.capacityTotal > 0
              ? Math.round((ticket.capacitySold / ticket.capacityTotal) * 100) : 0;
            const lowStock = ticket.capacityTotal > 0 && (ticket.availableCapacity / ticket.capacityTotal) <= 0.2;
            return (
              <Box key={ticket.id} sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto auto auto auto' },
                gap: 2, alignItems: 'center', px: 2.5, py: 2,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: 'grey.50' },
              }}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={700}>{ticket.name}</Typography>
                    {lowStock && ticket.availableCapacity > 0 && (
                      <Chip label="Az Kaldı" size="small" color="warning" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                    )}
                    {ticket.availableCapacity <= 0 && ticket.capacityTotal > 0 && (
                      <Chip label="Tükendi" size="small" color="error" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {ticket.description || `Kapasite: ${ticket.capacityTotal}`}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <LinearProgress variant="determinate" value={soldPct}
                      sx={{
                        height: 4, borderRadius: 2, bgcolor: 'grey.200', width: { xs: '100%', md: 180 },
                        '& .MuiLinearProgress-bar': {
                          bgcolor: soldPct >= 100 ? 'error.main' : soldPct > 80 ? 'warning.main' : 'primary.main',
                          borderRadius: 2,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block' }}>
                      {ticket.capacitySold} / {ticket.capacityTotal} ({soldPct}%)
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="subtitle1" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="primary.main">
                  {ticket.basePrice > 0 ? `₺${ticket.basePrice.toLocaleString('tr-TR')}` : 'Ücretsiz'}
                </Typography>
                <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Typography variant="body2"><strong>{ticket.capacitySold}</strong> satıldı</Typography>
                  <Typography variant="caption" color="text.secondary">{ticket.availableCapacity} kaldı</Typography>
                </Box>
                <Chip
                  label={STATUS_LABEL_MAP[ticket.status] ?? ticket.status}
                  size="small"
                  color={STATUS_COLOR_MAP[ticket.status] ?? 'default'}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Düzenle">
                    <IconButton size="small" onClick={() => handleEdit(ticket)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={ticket.capacitySold > 0 ? 'Satışı olan bilet tipi silinemez' : 'Sil'}>
                    <span>
                      <IconButton size="small" color="error"
                        onClick={() => handleDelete(ticket.id)}
                        disabled={deletingId === ticket.id || ticket.capacitySold > 0}
                      >
                        {deletingId === ticket.id
                          ? <CircularProgress size={16} />
                          : <DeleteIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })
        )}
      </Paper>
    </Stack>
  );
}
