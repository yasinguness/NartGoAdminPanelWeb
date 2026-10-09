import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material';
import { nbAdminService, NB_TENDER_REFERRAL_STATUS_LABEL, type NbTenderReferral, type NbTenderReferralStatus } from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { useRole } from '../../hooks/useRole';
import { nb } from '../../theme/nbBrand';
import { NbSectionPaper } from '.';

export default function NbMemberTenderHistory({ memberId, refreshKey }: { memberId: string; refreshKey: number }) {
  const { isAdmin, hasRole } = useRole();
  const canManage = isAdmin || hasRole('NB_ADMIN');
  const [status, setStatus] = useState<NbTenderReferralStatus | ''>('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ content: NbTenderReferral[]; totalPages: number; totalElements: number }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(undefined);
    nbAdminService.listTenderReferrals({ memberId, status: status || undefined, page, size: 8 })
      .then((r) => { if (active) { setResult(r); if (page > 0 && page >= r.totalPages) setPage(Math.max(0, r.totalPages - 1)); } })
      .catch((e) => { if (active) setError(nbErrorMessage(e, 'İhale geçmişi alınamadı.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId, status, page, reload, refreshKey]);
  async function update(row: NbTenderReferral, next: NbTenderReferralStatus) {
    setSaving(true); setError(undefined);
    try { await nbAdminService.updateTenderReferral(row.id, { status: next }); setReload((v) => v + 1); }
    catch (e) { setError(nbErrorMessage(e, 'İhale sonucu kaydedilemedi.')); }
    finally { setSaving(false); }
  }
  return <NbSectionPaper title="İletilen ihaleler ve sonuçları" hint="Yalnızca bu işletmeye iletilen ihaleler. Durumu değiştirerek görüşme sonucunu kaydedin.">
    <TextField select size="small" label="İhale durumu filtresi" value={status} disabled={saving} onChange={(e) => { setStatus(e.target.value as NbTenderReferralStatus | ''); setPage(0); }} sx={{ maxWidth: 260 }}>
      <MenuItem value="">Tüm durumlar</MenuItem>
      {Object.entries(NB_TENDER_REFERRAL_STATUS_LABEL).map(([key, name]) => <MenuItem key={key} value={key}>{name}</MenuItem>)}
    </TextField>
    {error && <Alert severity="error" action={<Button onClick={() => setReload((v) => v + 1)}>Tekrar dene</Button>}>{error}</Alert>}
    {loading ? <CircularProgress size={22} /> : !error && <>
      <Typography variant="body2" color="text.secondary">{result?.totalElements ?? 0} yönlendirme</Typography>
      {result?.content.length === 0 && <Typography variant="body2">Bu filtreye uygun ihale yönlendirmesi bulunmuyor.</Typography>}
      {result?.content.map((row) => <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ py: 1, borderTop: `1px solid ${nb.divider}` }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600}>{row.tenderTitle || 'İhale'}</Typography>
          <Typography variant="caption" color="text.secondary">{new Date(row.createdAt).toLocaleDateString('tr-TR')} · {row.channel === 'WHATSAPP' ? 'WhatsApp' : 'Uygulama içi'} · {row.viewedAt ? 'Görüntülendi' : 'Henüz görüntülenmedi'}</Typography>
          {row.note && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{row.note}</Typography>}
        </Box>
        <TextField select size="small" label="İhale sonucu" value={row.status} disabled={saving || !canManage} onChange={(e) => void update(row, e.target.value as NbTenderReferralStatus)} sx={{ minWidth: 180 }}>
          {Object.entries(NB_TENDER_REFERRAL_STATUS_LABEL).map(([key, name]) => <MenuItem key={key} value={key}>{name}</MenuItem>)}
        </TextField>
      </Stack>)}
      {(result?.totalPages ?? 0) > 1 && <Pagination count={result?.totalPages} page={page + 1} disabled={saving} onChange={(_, value) => setPage(value - 1)} />}
    </>}
  </NbSectionPaper>;
}
