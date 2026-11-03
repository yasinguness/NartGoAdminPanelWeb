import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Box, Button, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageContainer } from '../../components/Page';
import {
  promotionAdminService, type PromotionOverview, type PromotionPurchase,
} from '../../services/business/promotionAdminService';
import { StatTile, daysUntil, isLive, tl } from './promotions/shared';
import RequestsTab from './promotions/RequestsTab';
import LiveTab from './promotions/LiveTab';
import PricingTab from './promotions/PricingTab';
import TrialDrawer from './promotions/TrialDrawer';

/**
 * Admin › İşletme Rehberi › Ücretli Öne Çıkarma.
 *
 * Üç sekme, tek sayfa: bekleyen işler → yayındakiler → fiyat ve kurallar.
 * Üstteki dört kutu her sekmede sabit durur; hepsi `adminOverview`'dan
 * türetilir, ayrı bir sayım ucu yoktur.
 *
 * Yayın/bitiş hesapları burada yapılıyor çünkü sunucu "şu an yayında" diye bir
 * liste döndürmüyor: son 100 satın almayı veriyor, yayında olup olmadığı
 * durum + tarih aralığından çıkıyor.
 */
export default function BusinessPromotions() {
  const [data, setData] = useState<PromotionOverview | null>(null);
  const [tab, setTab] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await promotionAdminService.overview());
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Veriler yüklenemedi.' });
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const purchases = data?.purchases ?? [];

  const live = useMemo(
    () => purchases.filter((p) => isLive(p))
      .sort((a, b) => (daysUntil(a.endsAt) ?? 0) - (daysUntil(b.endsAt) ?? 0)),
    [purchases],
  );

  /** Admin kararı bekleyenler: iade gerekenler önce, sonra tamamlanmamış ödemeler. */
  const pending = useMemo(() => {
    const rank = (p: PromotionPurchase) => (p.status === 'REFUND_NEEDED' ? 0 : 1);
    return purchases
      .filter((p) => p.status === 'REFUND_NEEDED' || p.status === 'FAILED')
      .sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  }, [purchases]);

  const endingSoon = useMemo(
    () => live.filter((p) => { const d = daysUntil(p.endsAt); return d != null && d <= 7; }),
    [live],
  );

  const scopeBreakdown = useMemo(() => {
    const n = { CITY: 0, REGION: 0, COUNTRY: 0 } as Record<string, number>;
    live.forEach((p) => { n[p.scope] += 1; });
    return [
      n.CITY ? `${n.CITY} il` : null,
      n.REGION ? `${n.REGION} bölge` : null,
      n.COUNTRY ? `${n.COUNTRY} Türkiye` : null,
    ].filter(Boolean).join(' · ');
  }, [live]);

  const revenueHint = useMemo(() => {
    const paid = purchases.filter((p) => p.status === 'ACTIVE' && !p.trial).length;
    const trial = purchases.filter((p) => p.trial).length;
    return [paid ? `${paid} satış` : null, trial ? `${trial} deneme` : null].filter(Boolean).join(' · ');
  }, [purchases]);

  const oldestPendingHint = useMemo(() => {
    if (pending.length === 0) return 'bekleyen iş yok';
    const oldest = pending.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    const d = daysUntil(oldest.createdAt);
    return d != null && d < 0 ? `en eskisi ${Math.abs(d)} gündür bekliyor` : 'bugün geldi';
  }, [pending]);

  const saveSettings = async (changes: Record<string, number | null>) => {
    setSaving(true);
    try {
      await promotionAdminService.updateSettings(changes);
      setMessage({ type: 'success', text: 'Kaydedildi.' });
      await load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Kaydedilemedi.' });
    } finally { setSaving(false); }
  };

  const markRefunded = async (id: string) => {
    setBusyId(id);
    try {
      await promotionAdminService.markRefunded(id);
      setMessage({ type: 'success', text: 'Kayıt iade edildi olarak kapatıldı.' });
      await load();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Kaydedilemedi.' });
    } finally { setBusyId(null); }
  };

  return (
    <PageContainer>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, fontWeight: 700 }}>
            İşletme Rehberi
          </Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>Ücretli Öne Çıkarma</Typography>
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />}
          onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setDrawer(true); }}>
          Deneme tanımla
        </Button>
      </Stack>

      {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <StatTile label="Bekleyen iş" value={String(pending.length)} hint={oldestPendingHint}
          tone={pending.length ? 'warn' : undefined} active={pending.length > 0} />
        <StatTile label="Şu an yayında" value={String(live.length)} hint={scopeBreakdown || 'kapsam yok'} />
        <StatTile label="7 gün içinde bitecek" value={String(endingSoon.length)}
          hint={endingSoon.length ? 'yenileme konuşulabilir' : 'yakında biten yok'} />
        <StatTile label="Son 30 gün geliri" value={tl(data?.revenueLast30Days ?? 0, '0 ₺')}
          hint={revenueHint || 'kayıt yok'} />
        {/* Sunucu 2 Kasım 2026'da ekledi: teklif ekranında "ilgileniyorum" diyen
            ama henüz satın almayan işletmeler. Fiyat/konum tartışmasının
            dayanağı olduğu için kutulara girdi. */}
        {data?.interestCount != null && (
          <StatTile label="İlgilenen işletme" value={String(data.interestCount)}
            hint="teklif gördü, henüz satın almadı" />
        )}
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tab sx={{ textTransform: 'none', fontWeight: 600 }} label={
            <Badge badgeContent={pending.length} color="warning" sx={{ '& .MuiBadge-badge': { right: -14, top: 2 } }}>
              <span>Bekleyen işler</span>
            </Badge>
          } />
          <Tab sx={{ textTransform: 'none', fontWeight: 600 }} label={`Yayında ${live.length}`} />
          <Tab sx={{ textTransform: 'none', fontWeight: 600 }} label="Fiyatlar ve kurallar" />
        </Tabs>

        {tab === 0 && <Box sx={{ pt: 2 }}><RequestsTab rows={pending} onRefunded={markRefunded} busyId={busyId} /></Box>}
        {tab === 1 && <Box sx={{ pt: 1 }}><LiveTab rows={live} /></Box>}
        {tab === 2 && (
          <Box sx={{ px: 2.5, pb: 1 }}>
            <PricingTab settings={data?.settings ?? {}} changes={data?.settingChanges}
              onSave={saveSettings} saving={saving} />
          </Box>
        )}
      </Paper>

      {data && data.byProvince.length > 0 && tab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, mt: 2.5, p: 2.5 }}>
          <Typography fontWeight={700} sx={{ mb: 0.5 }}>İl bazında gerçek sonuç (son 90 gün)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Satış konuşmasının dayanağı: bu ilde öne çıkan işletmeler ortalama ne aldı.
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {data.byProvince.slice(0, 8).map((p) => (
              <Paper key={p.province} variant="outlined" sx={{ px: 2, py: 1.25, borderRadius: 2, minWidth: 150 }}>
                <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                  {p.province}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {p.promotions} öne çıkarma · ort. {p.avgViews.toLocaleString('tr-TR')} görüntülenme
                  {' · '}{p.avgClicks} tıklama
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      <TrialDrawer open={drawer} onClose={() => setDrawer(false)}
        onDone={(text) => { setMessage({ type: 'success', text }); void load(); }} />
    </PageContainer>
  );
}
