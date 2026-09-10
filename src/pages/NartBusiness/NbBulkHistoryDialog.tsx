import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  nbAdminService,
  type NbBulkAction,
  type NbBulkHistoryDetail,
  type NbBulkHistoryRow,
} from '../../services/nartbusiness/nbAdminService';
import { relativeDate, fullDate } from '../../utils/nbDisplay';

/**
 * Toplu işlem geçmişi.
 *
 * Sonuç raporu daha önce yalnız işlem anındaki diyalogda duruyordu; kapanınca
 * kayboluyordu. 39 üyelik bir partide "hangileri atlanmıştı, neden" sorusu
 * sonradan cevapsız kalıyordu.
 *
 * Sidebar'a yeni bir menü öğesi olarak DEĞİL, üye listesinden açılan bir
 * diyalog olarak duruyor: menü zaten 79 öğeydi ve seyrek kullanılan bir
 * raporun oraya girmesi az önce düzeltilen sorunu geri getirirdi.
 */

const ACTION_LABEL: Record<NbBulkAction, string> = {
  REOPEN_APPROVAL: 'Ödeme süresi açma',
  GRANT_TRIAL: 'Deneme verme',
  RESEND_EMAIL: 'Hazır e-posta',
  SEND_PUSH: 'Bildirim',
};

export default function NbBulkHistoryDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<NbBulkHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<NbBulkHistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDetail(null);
    setLoading(true);
    setError(null);
    nbAdminService
      .listBulkOperations({ page: 0, size: 30 })
      .then((res) => setRows(res.content))
      .catch((e: any) =>
        setError(e?.response?.data?.error?.message ?? e?.message ?? 'Geçmiş yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [open]);

  const openDetail = (id: string) => {
    setDetailLoading(true);
    nbAdminService
      .getBulkOperation(id)
      .then(setDetail)
      .catch((e: any) =>
        setError(e?.response?.data?.error?.message ?? e?.message ?? 'Detay yüklenemedi'),
      )
      .finally(() => setDetailLoading(false));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {detail ? 'Toplu İşlem Detayı' : 'Toplu İşlem Geçmişi'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading && (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={24} />
          </Stack>
        )}

        {!loading && !detail && rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            Henüz toplu işlem yapılmadı.
          </Typography>
        )}

        {!loading && !detail && rows.length > 0 && (
          <Stack divider={<Divider />}>
            {rows.map((r) => (
              <Box
                key={r.id}
                component="button"
                type="button"
                onClick={() => openDetail(r.id)}
                sx={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  font: 'inherit', fontFamily: 'inherit', cursor: 'pointer',
                  px: 1, py: 1.25, borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 140 }}>
                    {ACTION_LABEL[r.action] ?? r.action}
                  </Typography>
                  {/* Başarısız varsa önce o okunmalı — rapor bunun için var. */}
                  {r.failed > 0 ? (
                    <Chip size="small" color="warning" label={`${r.failed} atlandı`} />
                  ) : (
                    <Chip size="small" color="success" variant="outlined" label="tamamı" />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {r.succeeded}/{r.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" title={fullDate(r.createdAt)}>
                    {relativeDate(r.createdAt)}
                  </Typography>
                </Stack>
                {(r.params || r.note) && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                    {[r.params, r.note].filter(Boolean).join(' · ')}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}

        {detailLoading && (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={24} />
          </Stack>
        )}

        {detail && !detailLoading && (
          <Stack spacing={1.5}>
            <Alert severity={detail.operation.failed === 0 ? 'success' : 'warning'}>
              {ACTION_LABEL[detail.operation.action] ?? detail.operation.action}
              {' — '}
              {detail.operation.succeeded}/{detail.operation.total} üyede tamamlandı
              {detail.operation.params ? ` (${detail.operation.params})` : ''}
            </Alert>
            <Stack divider={<Divider />}>
              {detail.items.map((i) => (
                <Stack
                  key={i.memberId}
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                  sx={{ py: 0.75 }}
                >
                  <Chip
                    size="small"
                    variant={i.ok ? 'outlined' : 'filled'}
                    color={i.ok ? 'success' : 'warning'}
                    label={i.ok ? 'oldu' : 'atlandı'}
                    sx={{ minWidth: 72 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2">
                      {i.memberName || i.memberId.slice(0, 8)}
                    </Typography>
                    {!i.ok && i.detail && (
                      <Typography variant="caption" color="text.secondary">
                        {i.detail}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {detail ? (
          <Button onClick={() => setDetail(null)}>Listeye dön</Button>
        ) : null}
        <Button variant="contained" onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
}
