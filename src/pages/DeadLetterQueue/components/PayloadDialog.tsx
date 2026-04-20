import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Stack, Chip, IconButton, Tooltip } from '@mui/material';
import { ContentCopy as CopyIcon, Replay as RetryIcon, Close as DismissIcon } from '@mui/icons-material';
import type { DeadLetterEntry } from '../../../services/dlq/dlqTypes';

interface Props {
  open: boolean;
  entry: DeadLetterEntry | null;
  onClose: () => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  loading?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  RETRIED: '#3b82f6',
  DISMISSED: '#64748b',
};

export default function PayloadDialog({ open, entry, onClose, onRetry, onDismiss, loading }: Props) {
  if (!entry) return null;

  const handleCopy = (text?: string) => {
    if (text) navigator.clipboard?.writeText(text).catch(() => { /* ignore */ });
  };

  let prettyPayload = entry.payload || '';
  try {
    if (prettyPayload) prettyPayload = JSON.stringify(JSON.parse(prettyPayload), null, 2);
  } catch {
    // keep raw
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: '#0A130F', color: '#F3EEE0', border: '1px solid rgba(201,162,39,0.2)' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 20, fontWeight: 700 }}>
              Dead Letter Detayı
            </Typography>
            <Chip
              label={entry.status}
              size="small"
              sx={{
                bgcolor: `${STATUS_COLOR[entry.status] || '#64748b'}22`,
                color: STATUS_COLOR[entry.status] || '#64748b',
                fontSize: 10, fontWeight: 800, letterSpacing: 0.5, height: 20,
              }}
            />
            {entry.retryCount > 0 && (
              <Chip label={`retry: ${entry.retryCount}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(243,238,224,0.7)', fontSize: 10, fontWeight: 700, height: 20 }} />
            )}
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Field label="Topic" value={entry.topic} mono />
          {entry.messageKey && <Field label="Message Key" value={entry.messageKey} mono />}
          <Field label="Failed At" value={entry.failedAt || '—'} mono />
          {entry.retriedAt && <Field label="Retried At" value={entry.retriedAt} mono />}
          {entry.errorMessage && <Field label="Error" value={entry.errorMessage} errorBox />}

          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, color: 'rgba(243,238,224,0.5)', textTransform: 'uppercase' }}>
                Payload
              </Typography>
              <Tooltip title="Payload kopyala" arrow>
                <IconButton size="small" onClick={() => handleCopy(entry.payload)} sx={{ color: 'rgba(243,238,224,0.5)', '&:hover': { color: '#C9A227' } }}>
                  <CopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Box
              sx={{
                p: 2, borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.05)',
                maxHeight: 400, overflow: 'auto',
              }}
            >
              <pre style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#F3EEE0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {prettyPayload || '(payload yok)'}
              </pre>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'rgba(243,238,224,0.6)', fontWeight: 700 }}>
          Kapat
        </Button>
        {entry.status === 'PENDING' && (
          <>
            <Button
              variant="outlined"
              startIcon={<DismissIcon sx={{ fontSize: 14 }} />}
              onClick={() => onDismiss(entry.id)}
              disabled={loading}
              sx={{ borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444', fontSize: 11, fontWeight: 700 }}
            >
              Kapat (Dismiss)
            </Button>
            <Button
              variant="contained"
              startIcon={<RetryIcon sx={{ fontSize: 14 }} />}
              onClick={() => onRetry(entry.id)}
              disabled={loading}
              sx={{
                bgcolor: '#C9A227', color: '#0A130F', fontWeight: 800,
                '&:hover': { bgcolor: '#b58f1f' },
              }}
            >
              Yeniden Dene
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function Field({ label, value, mono, errorBox }: { label: string; value: string; mono?: boolean; errorBox?: boolean }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10, letterSpacing: 1, fontWeight: 700, color: 'rgba(243,238,224,0.5)', textTransform: 'uppercase', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{
        p: errorBox ? 1.5 : 0,
        borderRadius: errorBox ? 1 : 0,
        bgcolor: errorBox ? 'rgba(239,68,68,0.08)' : 'transparent',
        border: errorBox ? '1px solid rgba(239,68,68,0.25)' : 'none',
      }}>
        <Typography sx={{
          fontSize: 12,
          fontFamily: mono ? 'monospace' : 'inherit',
          color: errorBox ? '#ef4444' : '#F3EEE0',
          wordBreak: 'break-all',
        }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}
