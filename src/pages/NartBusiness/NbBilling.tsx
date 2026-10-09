import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Pagination, Stack, Switch, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { nbOpsService, NB_INTERVAL_LABEL, type NbBillingPlan, type NbBillingInterval, type NbTermPurchase } from '../../services/nartbusiness/nbOpsService';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { useRole } from '../../hooks/useRole';
import { NbSectionPaper } from '../../components/nartbusiness';
import { nb } from '../../theme/nbBrand';

const amount = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;
const day = (s: string) => new Date(s).toLocaleDateString('tr-TR');
const STATUS: Record<string, string> = { ACTIVE: 'Ödendi', PAYMENT_PENDING: 'Ödeme bekleniyor', EXPIRED: 'Süresi doldu', CANCELLED: 'İptal', REFUNDED: 'İade edildi' };
type Form = { tierId: string; interval: NbBillingInterval; price: string; name: string; promo: boolean };
export default function NbBilling() {
  const { isAdmin, hasRole } = useRole(); const canManage = isAdmin || hasRole('NB_ADMIN');
  const [plans, setPlans] = useState<NbBillingPlan[]>([]);
  const [tiers, setTiers] = useState<{ id: string; displayName: string }[]>([]);
  const [orders, setOrders] = useState<{ content: NbTermPurchase[]; totalPages: number; totalElements: number }>();
  const [filter, setFilter] = useState(''); const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null); const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false); const [retired, setRetired] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, o, t] = await Promise.all([nbOpsService.billingPlans(), nbOpsService.termPurchases({ status: filter || undefined, page, size: 25 }), nbAdminService.listTiers()]);
      setPlans(p.filter(x => x.oneTime)); setOrders(o); setTiers(t);
    } catch (e) { setError(nbErrorMessage(e, 'Üyelik planları alınamadı.')); }
    finally { setLoading(false); }
  }, [filter, page]);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    if (!form || busy) return;
    const price = Number(form.price.replace(',', '.'));
    if (!Number.isFinite(price) || price < 1 || !/^\d+([.,]\d{1,2})?$/.test(form.price.trim())) { setFormError('Fiyat en az 1 TL olmalı ve en fazla iki ondalık basamak içermeli.'); return; }
    setBusy(true); setFormError('');
    try { await nbOpsService.createBillingPlan({ ...form, price }); setForm(null); await load(); }
    catch (e) { setFormError(nbErrorMessage(e, 'Plan kaydedilemedi.')); }
    finally { setBusy(false); }
  }
  return <Stack spacing={3} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
    <Box><Typography variant="h5" fontWeight={600}>Üyelik Süreleri & Ödemeler</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>3, 6 ve 12 aylık üyelikler tek sefer ödenir. Otomatik tahsilat ve iyzico abonelik eşitlemesi yoktur.</Typography></Box>
    {error && <Alert severity="error" action={<Button onClick={() => void load()}>Tekrar dene</Button>}>{error}</Alert>}
    <NbSectionPaper title="Fiyat planları" hint="Yeni fiyat, önceki genel planın yerini alır. Satın alınmış dönemlerin tutarı ve süresi korunur.">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <FormControlLabel control={<Switch checked={retired} onChange={(_, v) => setRetired(v)} />} label="Pasif planları göster" />
        <Button variant="contained" disabled={!canManage || busy || !tiers.length} onClick={() => { setFormError(''); setForm({ tierId: tiers[0].id, interval: 'SEMIANNUAL', price: '', name: '', promo: false }); }}>Yeni fiyat / plan</Button>
      </Stack>
      {loading ? <CircularProgress size={22} /> : <Box role="region" aria-label="Fiyat planları" tabIndex={0} sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', '& th, & td': { textAlign: 'left', p: 1.5, borderBottom: `1px solid ${nb.border}`, fontSize: 13 } }}>
          <thead><tr><th>Paket / plan</th><th>Süre</th><th>Toplam ücret</th><th>Görünürlük</th><th>Durum</th><th>İşlem</th></tr></thead>
          <tbody>{plans.filter(p => retired || p.active).map(p => <tr key={p.id}><td><strong>{p.tierName}</strong><br />{p.name}</td><td>{p.durationMonths} ay</td><td>{amount(p.price)}</td><td>{p.promo ? 'Üyeye özel teklif' : 'Genel'}</td><td>{p.active ? 'Satışa açık' : 'Pasif'}</td><td><Button disabled={!canManage || busy} size="small" onClick={async () => {
            setBusy(true); try { await nbOpsService.setBillingPlanActive(p.id, !p.active); await load(); } catch (e) { setError(nbErrorMessage(e, 'Plan güncellenemedi.')); } finally { setBusy(false); }
          }}>{p.active ? 'Satışa kapat' : 'Satışa aç'}</Button></td></tr>)}</tbody>
        </Box>{!plans.length && <Typography sx={{ py: 2 }}>Henüz süreli üyelik planı yok.</Typography>}
      </Box>}
    </NbSectionPaper>
    <NbSectionPaper title="Süreli üyelik ödemeleri" hint="Ödeme bekleyen kayıt erişim süresini uzatmaz. Ödenen dönemlerin tarihleri burada görünür.">
      <TextField select label="Ödeme durumu" size="small" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} sx={{ maxWidth: 280 }}><MenuItem value="">Tüm durumlar</MenuItem>{Object.entries(STATUS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
      {loading ? <CircularProgress size={22} /> : <>
        <Typography variant="body2" color="text.secondary">{orders?.totalElements ?? 0} dönem kaydı</Typography>
        <Box role="region" aria-label="Üyelik ödemeleri" tabIndex={0} sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', '& th, & td': { p: 1.5, fontSize: 13, textAlign: 'left', borderBottom: `1px solid ${nb.border}` } }}>
          <thead><tr><th>İşletme</th><th>Süre</th><th>Tutar</th><th>Dönem</th><th>Durum</th></tr></thead><tbody>{orders?.content.map(o => <tr key={o.id}><td><Button component={RouterLink} to={`/nartbusiness/members/${o.memberId}?tab=membership`}>{o.memberName}</Button></td><td>{o.durationMonths} ay</td><td>{amount(o.fee)}</td><td>{day(o.startsAt)} – {day(o.endsAt)}{o.status === 'PAYMENT_PENDING' && <Typography variant="caption" display="block">Tahmini; ödeme onayında kesinleşir</Typography>}</td><td>{STATUS[o.status] ?? o.status}</td></tr>)}</tbody>
        </Box></Box>
        {orders?.content.length === 0 && <Typography variant="body2">Bu filtrede ödeme kaydı bulunmuyor.</Typography>}
        {(orders?.totalPages ?? 0) > 1 && <Pagination count={orders?.totalPages} page={page + 1} onChange={(_, v) => setPage(v - 1)} />}
      </>}
    </NbSectionPaper>
    <Dialog open={!!form} onClose={() => { if (!busy) setForm(null); }} fullWidth maxWidth="sm"><DialogTitle>Yeni süreli üyelik planı</DialogTitle><DialogContent>
      {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
      {form && <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField select disabled={busy} label="Paket" value={form.tierId} onChange={e => setForm({ ...form, tierId: e.target.value })}>{tiers.map(t => <MenuItem key={t.id} value={t.id}>{t.displayName}</MenuItem>)}</TextField>
        <TextField select disabled={busy} label="Üyelik süresi" value={form.interval} onChange={e => setForm({ ...form, interval: e.target.value as NbBillingInterval })}>{(['QUARTERLY', 'SEMIANNUAL', 'YEARLY'] as const).map(i => <MenuItem key={i} value={i}>{NB_INTERVAL_LABEL[i]}</MenuItem>)}</TextField>
        <TextField disabled={busy} label="Toplam fiyat (TL, KDV dahil)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} helperText="Seçilen sürenin tamamı için tek seferde alınacak tutar." />
        <TextField disabled={busy} label="Plan adı (isteğe bağlı)" value={form.name} inputProps={{ maxLength: 100 }} onChange={e => setForm({ ...form, name: e.target.value })} />
        <FormControlLabel control={<Switch disabled={busy} checked={form.promo} onChange={(_, promo) => setForm({ ...form, promo })} />} label="Yalnız teklif edilen üyeye göster" />
      </Stack>}
    </DialogContent><DialogActions><Button disabled={busy} onClick={() => setForm(null)}>Vazgeç</Button><Button variant="contained" disabled={busy} onClick={() => void save()}>{busy ? 'Kaydediliyor…' : 'Planı kaydet'}</Button></DialogActions></Dialog>
  </Stack>;
}
