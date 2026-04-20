import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, FormControlLabel, Switch, Grid, Typography, Stack,
} from '@mui/material';
import type { Coupon, CouponRequest, DiscountType } from '../../../services/coupons/couponTypes';

interface Props {
  open: boolean;
  editing?: Coupon | null;
  onClose: () => void;
  onSubmit: (payload: CouponRequest) => void;
  loading?: boolean;
}

export default function CouponForm({ open, editing, onClose, onSubmit, loading }: Props) {
  const [form, setForm] = useState<CouponRequest>({
    code: '',
    campaignId: '',
    discountType: 'RATE',
    discountValue: 10,
    maxUsage: 100,
    validFrom: new Date().toISOString().slice(0, 16),
    validTo: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 16),
    active: true,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code,
        campaignId: editing.campaignId,
        discountType: (editing.discountType as DiscountType) || 'RATE',
        discountValue: Number(editing.discountValue),
        maxUsage: editing.maxUsage,
        minBasketAmount: editing.minBasketAmount ? Number(editing.minBasketAmount) : undefined,
        validFrom: editing.validFrom.slice(0, 16),
        validTo: editing.validTo.slice(0, 16),
        active: editing.active,
      });
    } else if (open) {
      setForm({
        code: '',
        campaignId: crypto.randomUUID(),
        discountType: 'RATE',
        discountValue: 10,
        maxUsage: 100,
        validFrom: new Date().toISOString().slice(0, 16),
        validTo: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 16),
        active: true,
      });
    }
  }, [open, editing?.id]);

  const handleSubmit = () => {
    onSubmit({
      ...form,
      code: form.code.toUpperCase().trim(),
      validFrom: form.validFrom.length === 16 ? form.validFrom + ':00' : form.validFrom,
      validTo: form.validTo.length === 16 ? form.validTo + ':00' : form.validTo,
    });
  };

  const canSubmit = form.code.trim().length >= 3 && form.discountValue > 0 && form.maxUsage > 0
    && !!form.validFrom && !!form.validTo;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#0A130F', color: '#F3EEE0', border: '1px solid rgba(201,162,39,0.2)' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 20, fontWeight: 700 }}>
          {editing ? 'Kuponu Düzenle' : 'Yeni Kupon'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" label="Kod"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              disabled={!!editing}
              sx={fieldSx}
              helperText={editing ? 'Kod değiştirilemez' : '3+ karakter; otomatik uppercase'}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth size="small" label="İndirim Tipi" select
              value={form.discountType}
              onChange={e => setForm({ ...form, discountType: e.target.value as DiscountType })}
              sx={fieldSx}
            >
              <MenuItem value="RATE">Yüzde (%)</MenuItem>
              <MenuItem value="AMOUNT">Sabit Tutar (₺)</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth size="small" label={form.discountType === 'RATE' ? 'Yüzde' : 'Tutar (₺)'}
              type="number"
              value={form.discountValue}
              onChange={e => setForm({ ...form, discountValue: Number(e.target.value) })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth size="small" label="Maks. Kullanım"
              type="number"
              value={form.maxUsage}
              onChange={e => setForm({ ...form, maxUsage: Number(e.target.value) })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth size="small" label="Min. Sepet (₺)"
              type="number"
              value={form.minBasketAmount ?? ''}
              onChange={e => setForm({ ...form, minBasketAmount: e.target.value ? Number(e.target.value) : undefined })}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth size="small" label="Geçerli Başlangıç"
              type="datetime-local"
              value={form.validFrom}
              onChange={e => setForm({ ...form, validFrom: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth size="small" label="Geçerli Bitiş"
              type="datetime-local"
              value={form.validTo}
              onChange={e => setForm({ ...form, validTo: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={form.active ?? true} onChange={e => setForm({ ...form, active: e.target.checked })} />}
              label={<Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.7)' }}>Aktif</Typography>}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'rgba(243,238,224,0.6)', fontWeight: 700 }}>
          İptal
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          sx={{ bgcolor: '#C9A227', color: '#0A130F', fontWeight: 800, '&:hover': { bgcolor: '#b58f1f' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)' } }}
        >
          {loading ? 'Kaydediliyor…' : (editing ? 'Güncelle' : 'Oluştur')}
        </Button>
      </DialogActions>
    </Dialog>
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
  '& .MuiFormHelperText-root': { color: 'rgba(243,238,224,0.4)', fontSize: 10 },
};
