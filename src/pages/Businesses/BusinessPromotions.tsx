import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { PageContainer } from '../../components/Page';
import {
  promotionAdminService, SCOPE_LABEL, type PromotionOverview, type PromotionScope,
} from '../../services/business/promotionAdminService';

/**
 * Admin › İşletmeler › Ücretli öne çıkarma. Fiyatlar ve il başına yer sınırı burada girilir;
 * fiyatı boş seçenek satışa kapalıdır. Görüntülenme ve tıklama dürüst ölçümdür: giriş yapmış
 * kişi başına günde bir, işletme sahibi sayılmaz. docs/plan/nartgo-isletme-one-cikar.md
 */
const PRICE_ROWS: { key: string; label: string }[] = [
  { key: 'CITY_7', label: 'İl · 7 gün' }, { key: 'CITY_30', label: 'İl · 30 gün' },
  { key: 'REGION_7', label: 'Bölge · 7 gün' }, { key: 'REGION_30', label: 'Bölge · 30 gün' },
  { key: 'COUNTRY_7', label: 'Tüm Türkiye · 7 gün' }, { key: 'COUNTRY_30', label: 'Tüm Türkiye · 30 gün' },
  { key: 'STORY_7', label: 'Hikâye eki · 7 gün' }, { key: 'STORY_30', label: 'Hikâye eki · 30 gün' },
];
const STATUS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  ACTIVE: { label: 'Ödendi', color: 'success' },
  PENDING: { label: 'Ödeme bekliyor', color: 'default' },
  FAILED: { label: 'Tamamlanmadı', color: 'default' },
  REFUND_NEEDED: { label: 'İade bekliyor', color: 'error' },
};
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('tr-TR') : '—');
const tl = (n: number | null | undefined) => (n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} ₺`);

export default function BusinessPromotions() {
  const [data, setData] = useState<PromotionOverview | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [grant, setGrant] = useState({ businessId: '', scope: 'CITY' as PromotionScope, days: 30, includeStory: false, overrideSlot: false, note: 'NartBusiness üyesi · ilk ay deneme' });

  const load = useCallback(async () => {
    try {
      const d = await promotionAdminService.overview();
      setData(d);
      setDraft(Object.fromEntries(Object.entries(d.settings).map(([k, v]) => [k, v == null ? '' : String(v)])));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Veriler yüklenemedi.' });
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    const changes: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(draft)) changes[k] = v.trim() === '' ? null : Number(v.replace(',', '.'));
    try {
      await promotionAdminService.updateSettings(changes);
      setMessage({ type: 'success', text: 'Ayarlar kaydedildi.' });
      void load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Ayarlar kaydedilemedi.' });
    }
  };

  const doGrant = async () => {
    try {
      await promotionAdminService.grant({ ...grant, businessId: grant.businessId.trim() });
      setMessage({ type: 'success', text: 'Ücretsiz öne çıkarma tanımlandı ve başladı.' });
      void load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Tanımlanamadı.' });
    }
  };

  const refunded = async (id: string) => {
    if (!window.confirm('İadeyi iyzico panelinden yaptınız mı? Kayıt "iade edildi" olarak kapatılacak.')) return;
    try {
      await promotionAdminService.markRefunded(id);
      void load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Kaydedilemedi.' });
    }
  };

  return (
    <PageContainer title="Ücretli öne çıkarma">
      {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {data && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip label={`Son 7 gün satış: ${data.paidLast7Days}`} />
          <Chip label={`Son 30 gün gelir: ${tl(data.revenueLast30Days)}`} />
          <Chip color={data.refundNeeded ? 'error' : 'default'} label={`İade bekleyen: ${data.refundNeeded}`} />
        </Stack>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight={700}>Fiyatlar ve yer sınırı</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Boş bırakılan seçenek satışa kapalıdır. Yer sınırı: bir ilde aynı anda en fazla kaç işletme sponsorlu gösterilir.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          {PRICE_ROWS.map((r) => (
            <TextField key={r.key} size="small" label={`${r.label} (₺)`} value={draft[r.key] ?? ''}
              onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
          ))}
          <TextField size="small" label="İl başına yer sınırı" value={draft.CITY_SLOT_LIMIT ?? ''}
            onChange={(e) => setDraft({ ...draft, CITY_SLOT_LIMIT: e.target.value })} helperText="Boşsa 3" inputProps={{ inputMode: 'numeric' }} />
          <TextField size="small" label="Aynı anda en fazla hikâye eki" value={draft.STORY_SLOT_LIMIT ?? ''}
            onChange={(e) => setDraft({ ...draft, STORY_SLOT_LIMIT: e.target.value })}
            helperText="Boşsa 3. Birden fazlaysa her kişiye günde biri gösterilir." inputProps={{ inputMode: 'numeric' }} />
        </Box>
        <Button variant="contained" sx={{ mt: 2 }} onClick={save}>Kaydet</Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight={700}>Ücretsiz öne çıkarma tanımla (deneme)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ör. NartBusiness üyelerine ilk ay. Ödeme alınmaz, gerçek görüntülenme ve tıklama verisi toplanır.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <TextField size="small" label="İşletme kimliği (UUID)" value={grant.businessId} sx={{ minWidth: 320 }}
            onChange={(e) => setGrant({ ...grant, businessId: e.target.value })} />
          <TextField size="small" select label="Kapsam" value={grant.scope} onChange={(e) => setGrant({ ...grant, scope: e.target.value as PromotionScope })}>
            {(Object.keys(SCOPE_LABEL) as PromotionScope[]).map((s) => <MenuItem key={s} value={s}>{SCOPE_LABEL[s]}</MenuItem>)}
          </TextField>
          <TextField size="small" type="number" label="Gün" value={grant.days} sx={{ width: 100 }}
            onChange={(e) => setGrant({ ...grant, days: Number(e.target.value) })} />
          <TextField size="small" label="Not" value={grant.note} sx={{ minWidth: 240 }} onChange={(e) => setGrant({ ...grant, note: e.target.value })} />
          <FormControlLabel control={<Checkbox checked={grant.includeStory} onChange={(e) => setGrant({ ...grant, includeStory: e.target.checked })} />} label="Hikâye" />
          <FormControlLabel control={<Checkbox checked={grant.overrideSlot} onChange={(e) => setGrant({ ...grant, overrideSlot: e.target.checked })} />} label="Yer sınırını aş" />
          <Button variant="outlined" onClick={doGrant} disabled={!grant.businessId.trim()}>Tanımla</Button>
        </Stack>
      </Paper>

      {data && data.byProvince.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>İl bazında gerçek sonuç (son 90 gün)</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>İl</TableCell><TableCell align="right">Öne çıkarma</TableCell><TableCell align="right">Ort. görüntülenme</TableCell><TableCell align="right">Ort. tıklama</TableCell></TableRow></TableHead>
            <TableBody>
              {data.byProvince.map((p) => (
                <TableRow key={p.province}><TableCell sx={{ textTransform: 'capitalize' }}>{p.province}</TableCell>
                  <TableCell align="right">{p.promotions}</TableCell><TableCell align="right">{p.avgViews}</TableCell><TableCell align="right">{p.avgClicks}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {data && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>Son satın almalar</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>İşletme</TableCell><TableCell>Kapsam</TableCell><TableCell>Süre</TableCell><TableCell align="right">Tutar</TableCell>
                <TableCell>Durum</TableCell><TableCell>Yayın</TableCell><TableCell align="right">Görüntülenme</TableCell><TableCell align="right">Tıklama</TableCell><TableCell>Not</TableCell><TableCell />
              </TableRow></TableHead>
              <TableBody>
                {data.purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.businessName ?? p.businessId}<Typography variant="caption" display="block" color="text.secondary">{p.grantedBy ? `Deneme · ${p.grantedBy}` : p.buyerEmail}</Typography></TableCell>
                    <TableCell>{SCOPE_LABEL[p.scope]}{p.province ? ` · ${p.province}` : ''}{p.includeStory ? ' + hikâye' : ''}</TableCell>
                    <TableCell>{p.days} gün</TableCell>
                    <TableCell align="right">{tl(p.amount)}</TableCell>
                    <TableCell><Chip size="small" color={STATUS[p.status]?.color} label={STATUS[p.status]?.label ?? p.status} /></TableCell>
                    <TableCell>{fmtDate(p.startsAt)} – {fmtDate(p.endsAt)}</TableCell>
                    <TableCell align="right">{p.views}</TableCell>
                    <TableCell align="right">{p.clicks}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }}><Typography variant="caption">{p.note}</Typography></TableCell>
                    <TableCell>{p.status === 'REFUND_NEEDED' && <Button size="small" onClick={() => refunded(p.id)}>İade edildi</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}
    </PageContainer>
  );
}
