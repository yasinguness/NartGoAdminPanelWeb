import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, RadioGroup, FormControlLabel, Radio,
  Stack, Typography, Box,
} from '@mui/material';
import type { RefundItem, RefundAction } from '../../../services/refunds/refundTypes';
import { formatMoneyFull, STATUS_LABEL, STATUS_COLOR } from './helpers';

interface Props {
  open: boolean;
  item: RefundItem | null;
  onClose: () => void;
  onConfirm: (action: RefundAction, note: string) => void;
  loading?: boolean;
}

const ACTIONS: { key: RefundAction; label: string; description: string; color: string; availableFor: string[] }[] = [
  { key: 'APPROVE', label: 'Onayla (Iyzico retry)', description: 'PROCESSING durumuna çek, iade tekrar denenecek', color: '#3b82f6', availableFor: ['PENDING'] },
  { key: 'RETRY', label: 'Yeniden Dene', description: 'FAILED iadeyi tekrar işleme al', color: '#f59e0b', availableFor: ['FAILED'] },
  { key: 'MARK_COMPLETED', label: 'Manuel COMPLETED işaretle', description: 'Iyzico dışında manuel iade yapıldı (wire/cash)', color: '#22c55e', availableFor: ['PENDING', 'PROCESSING', 'FAILED'] },
  { key: 'REJECT', label: 'Reddet', description: 'İade talebini kabul etme, FAILED olarak kapat', color: '#ef4444', availableFor: ['PENDING'] },
];

export default function RefundActionDialog({ open, item, onClose, onConfirm, loading }: Props) {
  const [action, setAction] = useState<RefundAction>('MARK_COMPLETED');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && item) {
      // default action: approve if PENDING, retry if FAILED, mark_completed otherwise
      if (item.status === 'PENDING') setAction('APPROVE');
      else if (item.status === 'FAILED') setAction('RETRY');
      else setAction('MARK_COMPLETED');
      setNote('');
    }
  }, [open, item?.refundId, item?.status]);

  if (!item) return null;

  const available = ACTIONS.filter(a => a.availableFor.includes(item.status));
  const canConfirm = note.trim().length >= 3;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: '#0A130F', color: '#F3EEE0', border: '1px solid rgba(201,162,39,0.2)' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 20, fontWeight: 700 }}>
          İade Aksiyonu
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Box sx={{ mb: 2, p: 2, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Stack spacing={0.5}>
            <Row k="Refund ID" v={item.refundId} mono />
            {item.paymentId && <Row k="Payment" v={item.paymentId} mono />}
            {item.orderId && <Row k="Order" v={item.orderId} mono />}
            <Row k="Durum" v={STATUS_LABEL[item.status] || item.status} color={STATUS_COLOR[item.status]} />
            <Row k="Tutar" v={formatMoneyFull(item.amount, item.currency)} />
            {item.reason && <Row k="Sebep" v={item.reason} />}
          </Stack>
        </Box>

        {available.length === 0 ? (
          <Typography sx={{ color: 'rgba(243,238,224,0.5)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', py: 2 }}>
            Bu durumdaki iade için uygun aksiyon yok
          </Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase', mb: 1 }}>
              Aksiyon
            </Typography>
            <RadioGroup value={action} onChange={e => setAction(e.target.value as RefundAction)}>
              {available.map(a => (
                <FormControlLabel
                  key={a.key}
                  value={a.key}
                  control={<Radio size="small" sx={{ color: 'rgba(243,238,224,0.5)', '&.Mui-checked': { color: a.color } }} />}
                  label={
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: action === a.key ? a.color : '#F3EEE0' }}>
                        {a.label}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.55)' }}>
                        {a.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mb: 0.5 }}
                />
              ))}
            </RadioGroup>
          </>
        )}

        <TextField
          size="small"
          label="Not"
          placeholder="Audit log için açıklama (zorunlu)"
          value={note}
          onChange={e => setNote(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          required
          sx={{
            mt: 2,
            '& .MuiInputLabel-root': { color: 'rgba(243,238,224,0.6)', fontSize: 12 },
            '& .MuiInputLabel-root.Mui-focused': { color: '#C9A227' },
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.03)', fontSize: 12, color: '#F3EEE0',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
              '&:hover fieldset': { borderColor: 'rgba(201,162,39,0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#C9A227' },
            },
          }}
        />
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'rgba(243,238,224,0.6)', fontWeight: 700 }}>
          İptal
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(action, note.trim())}
          disabled={!canConfirm || loading || available.length === 0}
          sx={{
            bgcolor: '#C9A227', color: '#0A130F', fontWeight: 800,
            '&:hover': { bgcolor: '#b58f1f' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' },
          }}
        >
          {loading ? 'Kaydediliyor…' : 'Onayla'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Row({ k, v, mono, color }: { k: string; v: string; mono?: boolean; color?: string }) {
  return (
    <Stack direction="row" spacing={1.5}>
      <Typography sx={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, color: 'rgba(243,238,224,0.5)', textTransform: 'uppercase', minWidth: 90 }}>
        {k}
      </Typography>
      <Typography sx={{ fontSize: 12, fontFamily: mono ? 'monospace' : 'inherit', color: color || '#F3EEE0', wordBreak: 'break-all' }}>
        {v}
      </Typography>
    </Stack>
  );
}
