import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, RadioGroup, FormControlLabel, Radio,
  Stack, Typography, Box, Chip, Alert,
} from '@mui/material';
import type { Mismatch, ResolveAction } from '../../../services/reconciliation/reconciliationTypes';
import { TYPE_LABEL, SEVERITY_LABEL, SEVERITY_COLOR, formatMoney } from './helpers';

interface Props {
  open: boolean;
  mismatch: Mismatch | null;
  onClose: () => void;
  onConfirm: (action: ResolveAction, reason: string) => void;
  loading?: boolean;
}

const ACTIONS: { key: ResolveAction; label: string; description: string; color: string }[] = [
  { key: 'FORCE_SUCCESS', label: 'SUCCESS olarak işaretle', description: 'Ödeme başarılı sayılacak, provider durumu bypass edilir', color: '#22c55e' },
  { key: 'FORCE_FAILED', label: 'FAILED olarak işaretle', description: 'Ödeme başarısız sayılacak, müşteri bilgilendirilmeli', color: '#ef4444' },
  { key: 'MARK_REFUNDED', label: 'REFUNDED olarak işaretle', description: 'İade yapıldı olarak kaydet (gerçek iade ayrıca tetiklenmeli)', color: '#f59e0b' },
  { key: 'IGNORE', label: 'Yok say (audit)', description: 'Status değişmeyecek, sadece audit log\'a kaydedilecek', color: '#64748b' },
];

export default function ResolveDialog({ open, mismatch, onClose, onConfirm, loading }: Props) {
  const [action, setAction] = useState<ResolveAction>('IGNORE');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setAction('IGNORE');
      setReason('');
    }
  }, [open, mismatch?.paymentId]);

  if (!mismatch) return null;

  const canConfirm = reason.trim().length >= 3;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#0A130F', color: '#F3EEE0', border: '1px solid rgba(201,162,39,0.2)' } }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 20, fontWeight: 700 }}>
            Uyumsuzluk Çöz
          </Typography>
          <Chip
            label={SEVERITY_LABEL[mismatch.severity] || mismatch.severity}
            size="small"
            sx={{
              bgcolor: `${SEVERITY_COLOR[mismatch.severity] || '#64748b'}22`,
              color: SEVERITY_COLOR[mismatch.severity] || '#64748b',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0.5,
              height: 20,
            }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {/* Context */}
        <Box sx={{ mb: 2, p: 2, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Stack spacing={0.5}>
            <Row k="Tip" v={TYPE_LABEL[mismatch.type] || mismatch.type} />
            <Row k="Payment ID" v={mismatch.paymentId} mono />
            {mismatch.orderId && <Row k="Order ID" v={mismatch.orderId} mono />}
            <Row k="DB Durumu" v={mismatch.dbStatus || '—'} />
            {mismatch.providerResponseCode && <Row k="Provider Code" v={mismatch.providerResponseCode} mono />}
            {mismatch.providerResponseMsg && <Row k="Provider Mesaj" v={mismatch.providerResponseMsg} />}
            <Row k="Tutar" v={formatMoney(mismatch.dbAmount, mismatch.currency)} />
          </Stack>
        </Box>

        {mismatch.suggestedAction && (
          <Alert
            severity="info"
            icon={false}
            sx={{
              mb: 2,
              bgcolor: 'rgba(201,162,39,0.08)',
              border: '1px solid rgba(201,162,39,0.2)',
              color: '#F3EEE0',
              '& .MuiAlert-message': { fontSize: 12 },
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#C9A227', mb: 0.25 }}>
              ÖNERİ
            </Typography>
            {mismatch.suggestedAction}
          </Alert>
        )}

        {/* Action */}
        <Typography sx={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase', mb: 1 }}>
          Aksiyon
        </Typography>
        <RadioGroup value={action} onChange={e => setAction(e.target.value as ResolveAction)}>
          {ACTIONS.map(a => (
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

        <TextField
          size="small"
          label="Neden / Not"
          placeholder="Bu aksiyonu neden aldığını yaz (audit log için zorunlu)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          required
          sx={{
            mt: 2,
            '& .MuiInputLabel-root': { color: 'rgba(243,238,224,0.6)', fontSize: 12 },
            '& .MuiInputLabel-root.Mui-focused': { color: '#C9A227' },
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.03)',
              fontSize: 12,
              color: '#F3EEE0',
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
          onClick={() => onConfirm(action, reason.trim())}
          disabled={!canConfirm || loading}
          sx={{
            bgcolor: '#C9A227',
            color: '#0A130F',
            fontWeight: 800,
            '&:hover': { bgcolor: '#b58f1f' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' },
          }}
        >
          {loading ? 'Kaydediliyor…' : 'Çöz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <Stack direction="row" spacing={1.5}>
      <Typography sx={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, color: 'rgba(243,238,224,0.5)', textTransform: 'uppercase', minWidth: 110 }}>
        {k}
      </Typography>
      <Typography sx={{
        fontSize: 12,
        fontFamily: mono ? 'monospace' : 'inherit',
        color: '#F3EEE0',
        wordBreak: 'break-all',
      }}>
        {v}
      </Typography>
    </Stack>
  );
}
