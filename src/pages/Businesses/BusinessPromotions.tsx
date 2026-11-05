import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, IconButton, Paper, Skeleton, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageContainer } from '../../components/Page';
import {
  promotionAdminService, type PromotionOverview, type PromotionPurchase,
} from '../../services/business/promotionAdminService';
import { StatTile, TONE, daysUntil, titleCase, tl } from './promotions/shared';
import RequestsTab from './promotions/RequestsTab';
import PricingTab from './promotions/PricingTab';
import TrialDrawer from './promotions/TrialDrawer';
import TrialEditDialog from './promotions/TrialEditDialog';
import PromotionsTable, { rowState } from './promotions/PromotionsTable';

/**
 * Admin › İşletme Rehberi › Ücretli Öne Çıkarma.
 *
 * Sekmeler: Yayında ve sırada → Denemeler → Bekleyen işler → Geçmiş → Fiyatlar ve kurallar.
 * Üstteki kutular her sekmede sabit, tıklanınca ilgili sekmeyi açar; hepsi `adminOverview`'dan türetilir.
 * Denemeler (admin tanımı) düzenlenir ve kaldırılır; ücretli kayıt yalnız iade akışından geçer.
 *
 * Sunucu "şu an yayında" diye ayrı liste döndürmüyor: son 100 kaydı veriyor, durum + tarih aralığından
 * yayında / sırada / bitti ayrımı burada yapılıyor (`rowState`).
 */
/** Kutular eşit genişlikte; dar ekranda alt satıra iner, tek kutu yalnız kalmaz. */
const TILE_GRID = { display: 'grid', gap: 2, mb: 3, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' } };

const TABS = ['yayinda', 'denemeler', 'bekleyen', 'gecmis', 'fiyatlar'] as const;
type TabKey = (typeof TABS)[number];

export default function BusinessPromotions() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as TabKey) : 'yayinda';
  const setTab = (t: TabKey) => setParams({ tab: t }, { replace: true });

  const [data, setData] = useState<PromotionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ row: PromotionPurchase; mode: 'edit' | 'remove' } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await promotionAdminService.overview());
    } catch (e) {
      setMessage({ type: 'error', text: (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Veriler yüklenemedi.' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const purchases = useMemo(() => data?.purchases ?? [], [data]);

  const groups = useMemo(() => {
    const live: PromotionPurchase[] = [], queued: PromotionPurchase[] = [], history: PromotionPurchase[] = [], pending: PromotionPurchase[] = [];
    purchases.forEach((p) => {
      const st = rowState(p);
      if (st === 'live') live.push(p);
      else if (st === 'queued') queued.push(p);
      else if (st === 'refund' || p.status === 'FAILED') pending.push(p);
      if (st === 'ended') history.push(p);
    });
    live.sort((a, b) => (daysUntil(a.endsAt) ?? 0) - (daysUntil(b.endsAt) ?? 0));
    queued.sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
    history.sort((a, b) => String(b.endsAt ?? b.createdAt).localeCompare(String(a.endsAt ?? a.createdAt)));
    // İade gerekenler önce, sonra tamamlanmamış ödemeler.
    pending.sort((a, b) => (a.status === 'REFUND_NEEDED' ? 0 : 1) - (b.status === 'REFUND_NEEDED' ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
    const trials = purchases.filter((p) => p.trial && p.status === 'ACTIVE')
      .sort((a, b) => {
        const rank = (p: PromotionPurchase) => ({ live: 0, queued: 1 } as Record<string, number>)[rowState(p)] ?? 2;
        return rank(a) - rank(b) || String(b.startsAt).localeCompare(String(a.startsAt));
      });
    return { live, queued, history, pending, trials, current: [...live, ...queued] };
  }, [purchases]);

  const endingSoon = groups.live.filter((p) => { const d = daysUntil(p.endsAt); return d != null && d <= 7; });
  const openTrials = groups.trials.filter((p) => ['live', 'queued'].includes(rowState(p)));

  const scopeBreakdown = (() => {
    const n: Record<string, number> = { CITY: 0, REGION: 0, COUNTRY: 0 };
    groups.live.forEach((p) => { n[p.scope] += 1; });
    return [n.CITY && `${n.CITY} il`, n.REGION && `${n.REGION} bölge`, n.COUNTRY && `${n.COUNTRY} Türkiye`].filter(Boolean).join(' · ');
  })();

  const oldestPendingHint = (() => {
    if (groups.pending.length === 0) return 'bekleyen iş yok';
    const oldest = groups.pending.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    const d = daysUntil(oldest.createdAt);
    return d != null && d < 0 ? `en eskisi ${Math.abs(d)} gündür bekliyor` : 'bugün geldi';
  })();

  const saveSettings = async (changes: Record<string, number | null>) => {
    setSaving(true);
    try {
      await promotionAdminService.updateSettings(changes);
      setMessage({ type: 'success', text: 'Kaydedildi.' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Kaydedilemedi.' });
    } finally { setSaving(false); }
  };

  const markRefunded = async (id: string) => {
    setBusyId(id);
    try {
      await promotionAdminService.markRefunded(id);
      setMessage({ type: 'success', text: 'Kayıt iade edildi olarak kapatıldı.' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Kaydedilemedi.' });
    } finally { setBusyId(null); }
  };

  const tableActions = {
    onEdit: (row: PromotionPurchase) => setEditing({ row, mode: 'edit' }),
    onRemove: (row: PromotionPurchase) => setEditing({ row, mode: 'remove' }),
  };

  /** Sekme adı + sayı; dikkat isteyen sayı kum sarısı. Rozet (Badge) yan sekmenin üstüne taştığı için kullanılmıyor. */
  const tabLabel = (text: string, count?: number, warn?: boolean) => (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <span>{text}</span>
      {count != null && count > 0 && (
        <Box component="span" sx={{
          fontSize: 12, fontWeight: 700, px: 0.75, minWidth: 20, textAlign: 'center', borderRadius: 1,
          bgcolor: warn ? TONE.warnBg : 'action.hover', color: warn ? TONE.warn : 'text.secondary',
        }}>
          {count}
        </Box>
      )}
    </Stack>
  );

  return (
    <PageContainer>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, fontWeight: 700 }}>
            İşletme Rehberi
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>Ücretli Öne Çıkarma</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 680 }}>
            Sponsorlu kayıt ödeme alınır alınmaz başlar. Deneme, yöneticinin ücretsiz tanımladığı öne çıkarmadır;
            süresi değiştirilebilir ya da kaldırılabilir.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Yenile">
            <span><IconButton onClick={() => void load()} disabled={loading}><RefreshIcon /></IconButton></span>
          </Tooltip>
          <Button variant="contained" disableElevation startIcon={<AddIcon />}
            onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setDrawer(true); }}
            sx={{ bgcolor: TONE.go, '&:hover': { bgcolor: '#173f27' } }}>
            Deneme tanımla
          </Button>
        </Stack>
      </Stack>

      {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {!data && loading ? (
        <Box sx={TILE_GRID}>
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="rounded" height={104} sx={{ borderRadius: 2.5 }} />)}
        </Box>
      ) : (
        <Box sx={TILE_GRID}>
          <StatTile label="Şu an yayında" value={String(groups.live.length)}
            hint={scopeBreakdown || 'yayında kayıt yok'}
            onClick={() => setTab('yayinda')} />
          <StatTile label="Açık deneme" value={String(openTrials.length)}
            hint={openTrials.length ? 'düzenlenebilir' : 'tanımlı deneme yok'} onClick={() => setTab('denemeler')} />
          <StatTile label="7 gün içinde bitecek" value={String(endingSoon.length)}
            hint={endingSoon.length ? 'yenileme konuşulabilir' : 'yakında biten yok'} onClick={() => setTab('yayinda')} />
          <StatTile label="Son 30 gün geliri" value={tl(data?.revenueLast30Days ?? 0, '0 ₺')}
            hint={`${purchases.filter((p) => p.status === 'ACTIVE' && !p.trial).length} satış (son 100 kayıt)`} />
          <StatTile label="Bekleyen iş" value={String(groups.pending.length)} hint={oldestPendingHint}
            tone={groups.pending.length ? 'warn' : undefined} active={groups.pending.length > 0} onClick={() => setTab('bekleyen')} />
          {data?.interestCount != null && (
            <StatTile label="İlgilenen işletme" value={String(data.interestCount)} hint="teklifi gördü, almadı" />
          )}
        </Box>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 1.5, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 52 } }}>
          <Tab value="yayinda" label={tabLabel('Yayında ve sırada', groups.current.length)} />
          <Tab value="denemeler" label={tabLabel('Denemeler', openTrials.length)} />
          <Tab value="bekleyen" label={tabLabel('Bekleyen işler', groups.pending.length, true)} />
          <Tab value="gecmis" label={tabLabel('Geçmiş')} />
          <Tab value="fiyatlar" label="Fiyatlar ve kurallar" />
        </Tabs>

        {tab === 'yayinda' && (
          <PromotionsTable rows={groups.current} {...tableActions}
            empty="Şu an yayında ya da sırada öne çıkarma yok. Satın alma geldiğinde ya da deneme tanımladığınızda burada görünür." />
        )}
        {tab === 'denemeler' && (
          <PromotionsTable rows={groups.trials} {...tableActions}
            empty="Henüz deneme tanımlanmadı. Sağ üstteki “Deneme tanımla” ile bir işletmeye ücretsiz öne çıkarma verebilirsiniz." />
        )}
        {tab === 'bekleyen' && <Box sx={{ pt: 2 }}><RequestsTab rows={groups.pending} onRefunded={markRefunded} busyId={busyId} /></Box>}
        {tab === 'gecmis' && (
          <PromotionsTable rows={groups.history} {...tableActions} empty="Biten öne çıkarma yok." />
        )}
        {tab === 'fiyatlar' && (
          <Box sx={{ px: 2.5, pb: 1 }}>
            <PricingTab settings={data?.settings ?? {}} changes={data?.settingChanges} onSave={saveSettings} saving={saving} />
          </Box>
        )}
      </Paper>

      {data && data.byProvince.length > 0 && (tab === 'yayinda' || tab === 'gecmis') && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, mt: 2.5, p: 2.5 }}>
          <Typography fontWeight={700} sx={{ mb: 0.5 }}>İl bazında gerçek sonuç · son 90 gün</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Satış konuşmasının dayanağı: bu ilde öne çıkan işletmeler ortalama ne aldı.
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
            {data.byProvince.slice(0, 12).map((p) => (
              <Box key={p.province} sx={{ px: 2, py: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="body2" fontWeight={700}>{titleCase(p.province)}</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{p.avgViews.toLocaleString('tr-TR')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  ort. görüntülenme · {p.avgClicks.toLocaleString('tr-TR')} tıklama · {p.promotions} kayıt
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      <TrialDrawer open={drawer} onClose={() => setDrawer(false)}
        onDone={(text) => { setMessage({ type: 'success', text }); setTab('denemeler'); void load(); }} />
      {editing && (
        <TrialEditDialog row={editing.row} mode={editing.mode} onClose={() => setEditing(null)}
          onDone={(text) => { setMessage({ type: 'success', text }); void load(); }} />
      )}
    </PageContainer>
  );
}
