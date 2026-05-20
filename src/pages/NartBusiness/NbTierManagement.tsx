import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { TierConfig, TierConfigUpdate } from '../../services/nartbusiness/nbTypes';

const EMPTY_UPDATE: TierConfigUpdate = {
  displayName: '',
  priceAmount: 0,
  currency: 'TL',
  pricePeriod: 'yıl',
  shortDescription: '',
  features: [],
  sortOrder: 0,
  active: true,
};

export default function NbTierManagement() {
  const [items, setItems] = useState<TierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TierConfigUpdate>(EMPTY_UPDATE);
  const [featuresRaw, setFeaturesRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    nbAdminService
      .listTiers()
      .then((data) => { setItems(data); setLoading(false); })
      .catch((err) => { setError(err?.message ?? 'Veri yüklenemedi'); setLoading(false); });
  };

  useEffect(load, []);

  const openEdit = (tier: TierConfig) => {
    setEditingId(tier.id);
    setForm({
      displayName: tier.displayName,
      priceAmount: tier.priceAmount,
      currency: tier.currency,
      pricePeriod: tier.pricePeriod,
      shortDescription: tier.shortDescription ?? '',
      features: tier.features,
      sortOrder: tier.sortOrder,
      active: tier.active,
    });
    setFeaturesRaw(tier.features.join('\n'));
  };

  const closeEdit = () => { setEditingId(null); setForm(EMPTY_UPDATE); setFeaturesRaw(''); };

  const isEditing = editingId !== null;
  const editingTier = items.find((t) => t.id === editingId);

  const willDeactivate =
    isEditing && !form.active && !!editingTier?.active;

  const formValid =
    form.displayName.trim().length > 0 &&
    form.priceAmount >= 0 &&
    form.currency.trim().length > 0 &&
    form.pricePeriod.trim().length > 0;

  const save = async () => {
    if (!editingId || !formValid) return;
    setSubmitting(true);
    const features = featuresRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await nbAdminService.upsertTier(editingId, { ...form, features });
      closeEdit();
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Kaydetme başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            NartBusiness — Üyelik Tipleri
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mobil uygulamada görünen üyelik tiplerini buradan yönetin.
            Pasif tipler başvuru formunda gösterilmez; mevcut üyelikleri etkilemez.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Kod</TableCell>
                <TableCell>İsim</TableCell>
                <TableCell>Fiyat</TableCell>
                <TableCell>Kısa Açıklama</TableCell>
                <TableCell>Sıra</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Typography fontFamily="monospace">{t.code}</Typography>
                  </TableCell>
                  <TableCell>{t.displayName}</TableCell>
                  <TableCell>
                    {t.priceAmount.toLocaleString('tr-TR')} {t.currency} / {t.pricePeriod}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {t.shortDescription ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{t.sortOrder}</TableCell>
                  <TableCell>
                    {t.active ? (
                      <Chip size="small" color="success" label="Aktif" />
                    ) : (
                      <Chip size="small" variant="outlined" label="Pasif" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(t)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={isEditing} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle>
          Kademe Düzenle — <Typography component="span" fontFamily="monospace">{editingTier?.code}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="İsim *"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <TextField
                label="Fiyat *"
                type="number"
                value={form.priceAmount}
                onChange={(e) =>
                  setForm({ ...form, priceAmount: parseFloat(e.target.value) || 0 })
                }
                sx={{ flex: 2 }}
              />
              <TextField
                label="Para Birimi"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Periyot"
                value={form.pricePeriod}
                onChange={(e) => setForm({ ...form, pricePeriod: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">/</InputAdornment> }}
                sx={{ flex: 1 }}
                helperText="Örn: yıl, ay"
              />
            </Stack>
            <TextField
              label="Kısa Açıklama"
              value={form.shortDescription ?? ''}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              fullWidth
              helperText="Mobil uygulamada tier kartının altında gösterilir."
            />
            <TextField
              label="Özellikler (her satır bir özellik)"
              value={featuresRaw}
              onChange={(e) => setFeaturesRaw(e.target.value)}
              multiline
              rows={4}
              fullWidth
              helperText="Seçili tier genişlediğinde bu liste gösterilir."
            />
            <TextField
              label="Sıra"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })
              }
              helperText="Düşük değer önce gösterilir."
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
              }
              label="Aktif"
            />
            {willDeactivate && (
              <Alert severity="warning">
                Bu kademeyi pasifleştiriyorsun. Başvuru formunda <b>artık gösterilmez</b>.
                Mevcut üyelerin kademesi değişmez.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Vazgeç</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!formValid || submitting}
          >
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
