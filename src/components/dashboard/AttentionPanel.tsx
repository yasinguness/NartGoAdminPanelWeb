import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowIcon from '@mui/icons-material/ArrowForward';
import { nbAdminService, type NbAttention } from '../../services/nartbusiness/nbAdminService';
import { businessClaimService } from '../../services/business/businessClaimService';
import { featuredAdminService, type FeaturedList } from '../../services/business/featuredAdminService';
import { storeActivityService, type Overview } from '../../services/nartstore/storeActivityService';
import { sellerOutreachService } from '../../services/nartstore/sellerOutreachService';
import { heritageVillageService, type PendingSummary } from '../../services/heritageVillageService';
import { heritageAdminRequestService, heritageEditorService } from '../../services/heritageEditorService';
import { api } from '../../services/api';
import { jobMonitorService } from '../../services/jobMonitor/jobMonitorService';

/**
 * "Dikkat isteyenler" — panelin açılışta cevapladığı tek soru: bugün neye
 * bakmalıyım.
 *
 * Eskiden bu veriler sekiz ayrı kartta, her kart kendi başlığıyla duruyordu;
 * kartlar arası önem sırası yoktu, yani ekranın solundaki 164 kayıtlık bir
 * öneri yığını sağdaki 4 kişilik ödeme hatasıyla aynı ağırlıkta görünüyordu.
 * Artık hepsi tek listede ve aciliyete göre sıralı: önce parayı/kullanıcıyı
 * doğrudan etkileyenler, sonra bugünün işleri, en sonda birikenler.
 *
 * Her satır kendi ucundan besleniyor; biri hata verirse yalnız o satır düşer.
 * `skipAuthRedirect`: bunlar süs sayaçlar, 401'leri oturumu kapatmamalı.
 */
const PANEL_REQ: Record<string, unknown> = { skipAuthRedirect: true };

/** Aciliyet: düşük sayı önce gelir. */
type Urgency = 'critical' | 'today' | 'week';

const URGENCY_RANK: Record<Urgency, number> = { critical: 0, today: 1, week: 2 };
const URGENCY_LABEL: Record<Urgency, string> = { critical: 'Kritik', today: 'Bugün', week: 'Bu hafta' };
const URGENCY_COLOR: Record<Urgency, string> = { critical: '#b3261e', today: '#8a6100', week: '#5f6368' };

interface Item {
  key: string;
  n: number;
  title: string;
  /** Satırın ikinci satırı: neden önemli ya da ne yapılabilir. */
  hint?: string;
  urgency: Urgency;
  to: string;
}

export default function AttentionPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const out: Item[] = [];
    const push = (i: Item) => { if (i.n > 0) out.push(i); };

    Promise.allSettled([
      storeActivityService.overview(1, PANEL_REQ).then((store: Overview) => {
        const failed = store.orders.find((o) => o.status === 'FAILED')?.count ?? 0;
        push({ key: 'store-failed', n: failed, title: "NartStore'da ödemesi başarısız sipariş",
          hint: 'bugün', urgency: 'critical', to: '/nartstore/activity' });
        push({ key: 'store-errors', n: store.totals.peopleWithErrors,
          title: 'Mağazada hata alan kullanıcı', hint: 'bugün', urgency: 'critical', to: '/nartstore/activity' });
        const pending = store.orders.find((o) => o.status === 'PENDING')?.count ?? 0;
        push({ key: 'store-pending', n: pending, title: 'Sipariş ödeme bekliyor',
          hint: 'bugün', urgency: 'today', to: '/nartstore/activity' });
      }),

      // Satıcı daveti: WhatsApp'ta yanıt veren ya da ilgilenen firma takip bekliyor.
      sellerOutreachService.summary(PANEL_REQ).then((s) => {
        push({ key: 'outreach-interested', n: s.byStatus.INTERESTED, title: 'Mağaza açmakla ilgilenen firma',
          hint: 'satış koşullarını gönderin, ilk ürünlerde yardım edin', urgency: 'today', to: '/nartstore/outreach' });
        push({ key: 'outreach-replied', n: s.byStatus.REPLIED, title: 'Davete yanıt veren firma',
          hint: 'yanıtı okuyup durumunu güncelleyin', urgency: 'today', to: '/nartstore/outreach' });
      }),

      api.get<any>('/content/admin/nartlive/message-requests/stats', { params: { days: 30 }, ...PANEL_REQ })
        .then((r) => push({
          key: 'msgreq', n: r.data?.data?.frequentlyDeclined?.length ?? 0,
          title: 'İstekleri sık silinen hesap',
          hint: 'son 30 günde 3+ kez silindi, günlük sınırı 2’ye indi',
          urgency: 'critical', to: '/nartlive/users',
        })),

      api.get<any>('/businesses/admin/promotions', PANEL_REQ).then((r) => {
        const d = r.data?.data;
        push({ key: 'promo-refund', n: d?.refundNeeded ?? 0,
          title: 'Öne çıkarma ödemesi iade bekliyor',
          hint: 'ödeme alındı ama yayına alınamadı', urgency: 'critical', to: '/businesses/promotions' });
      }),

      jobMonitorService.getJobs(PANEL_REQ).then((d) => {
        if (!d) return;
        push({ key: 'jobs-failing', n: d.failingJobs ?? 0,
          title: 'Zamanlı işin son çalışması hatayla bitti', urgency: 'critical', to: '/ops/jobs' });
        push({ key: 'jobs-down', n: (d.services ?? []).filter((s) => s.status !== 'up').length,
          title: 'Servisin iş listesi okunamadı', hint: 'servis kapalı olabilir',
          urgency: 'critical', to: '/ops/jobs' });
      }),

      nbAdminService.getDashboardAttention(7, PANEL_REQ).then((nb: NbAttention | null) => {
        if (!nb) return;
        push({ key: 'nb-submitted', n: nb.submitted, title: 'NartBusiness başvurusu karar bekliyor',
          urgency: 'today', to: '/nartbusiness/decision-board' });
        push({ key: 'nb-info', n: nb.needsInfo, title: 'Başvuruda eksik bilgi bekleniyor',
          urgency: 'today', to: '/nartbusiness/decision-board' });
        const overdue = nb.deadlines.filter((d) => (d.daysLeft ?? 0) < 0).length;
        push({ key: 'nb-deadline', n: nb.deadlines.length,
          title: `NartBusiness üyeliği ${nb.withinDays} gün içinde bitiyor`,
          hint: overdue ? `${overdue} tanesi gecikmiş` : 'hatırlatma gönderilebilir',
          urgency: overdue ? 'today' : 'week', to: '/nartbusiness/trial-center' });
        push({ key: 'nb-expired', n: nb.approvedExpired, title: 'Onaylı ama ödeme süresi geçmiş üyelik',
          urgency: 'today', to: '/nartbusiness/trial-center' });
      }),

      businessClaimService.getClaims({ status: 'PENDING', page: 0, size: 1 }, PANEL_REQ).then((p) =>
        push({ key: 'claims', n: p?.totalElements ?? 0, title: 'İşletme sahiplenme talebi',
          urgency: 'today', to: '/business-claims' })),

      heritageVillageService.pendingSummary(PANEL_REQ).then((h: PendingSummary | null) => {
        if (!h) return;
        push({ key: 'h-disputed', n: h.communityDisputed, title: 'Ortak Hafıza’da tartışmalı kayıt',
          hint: 'itiraz edildi', urgency: 'today', to: '/heritage/families?tab=6' });
        push({ key: 'h-decidable', n: h.decidableTasks, title: 'Karara hazır köy sorusu',
          urgency: 'today', to: '/heritage/villages?pending=1' });
        push({ key: 'h-location', n: h.locationQueue, title: 'Köy konumu incelemesi',
          urgency: 'today', to: '/heritage/locations' });
        push({ key: 'h-village', n: h.villageContributions, title: 'Köy bilgisi önerisi',
          urgency: 'week', to: '/heritage/villages?pending=1' });
        push({ key: 'h-family', n: h.familySuggestions, title: 'Yeni sülale önerisi',
          urgency: 'week', to: '/heritage/families?tab=5' });
        push({ key: 'h-ig', n: h.instagramComments, title: 'Instagram yorumu içe aktarılmayı bekliyor',
          hint: 'toplu işlenebilir', urgency: 'week', to: '/heritage/families?tab=4' });
      }),

      // Köy Editörü gözetimi (docs/plan/nartgo-koy-editoru.md): editörün eklediği köyler ve son 24 saatteki kararları.
      heritageEditorService.actions().then((e) => {
        push({ key: 'h-editor-villages', n: e.newVillages7d, title: 'Köy Editörünün eklediği yeni köy',
          hint: 'son 7 gün, bir göz atın', urgency: 'week', to: '/heritage/editor-desk?tab=1' });
        push({ key: 'h-editor-actions', n: e.last24h, title: 'Köy Editörü kararı',
          hint: 'son 24 saat', urgency: 'week', to: '/heritage/editor-desk?tab=1' });
      }),

      // Köy Editörünün yöneticiye gönderdiği kararlar (teyitli kaydı kaldırma, halklar arası birleştirme, köyü kaldırma).
      heritageAdminRequestService.list('open').then((r) =>
        push({ key: 'h-editor-requests', n: r.open, title: 'Köy Editörünün size gönderdiği karar',
          hint: 'yalnız yönetici verebilir', urgency: 'today', to: '/heritage/editor-desk' })),

      featuredAdminService.list(PANEL_REQ).then((f: FeaturedList) => {
        const soon = f.items.filter((x) => x.remainingDays != null && x.remainingDays <= 7);
        push({ key: 'featured', n: soon.length, title: 'İşletmenin öne çıkarması 7 gün içinde bitiyor',
          hint: 'yenileme konuşulabilir', urgency: 'week', to: '/businesses?filter=featured' });
      }),
    ]).finally(() => {
      out.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || b.n - a.n);
      setItems(out);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
      <Stack direction="row" alignItems="baseline" sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Typography fontWeight={700} sx={{ flex: 1 }}>Dikkat isteyenler</Typography>
        <Typography variant="caption" color="text.secondary">Önem sırasına göre</Typography>
      </Stack>
      {items.length === 0 ? (
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Bekleyen iş yok: başvuru, talep, öneri ve mağaza hatası görünmüyor.
          </Typography>
        </Box>
      ) : (
        <Box>{items.map((i) => <AttentionRow key={i.key} item={i} />)}</Box>
      )}
    </Paper>
  );
}

function AttentionRow({ item }: { item: Item }) {
  const navigate = useNavigate();
  const go = () => navigate(item.to);
  return (
    <Stack
      direction="row" alignItems="center" spacing={1.75}
      onClick={go} role="link" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
      sx={{
        px: 2.5, py: 1.25, cursor: 'pointer', borderTop: 1, borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' },
        '&:hover .go': { opacity: 1 },
      }}
    >
      <Chip
        label={item.n.toLocaleString('tr-TR')}
        size="small"
        sx={{
          minWidth: 44, fontWeight: 700, borderRadius: 1.5,
          bgcolor: item.urgency === 'critical' ? '#fdeceb' : item.urgency === 'today' ? '#fdf4e3' : 'action.hover',
          color: URGENCY_COLOR[item.urgency],
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>{item.title}</Typography>
        <Typography variant="caption" sx={{ color: URGENCY_COLOR[item.urgency] }}>
          {URGENCY_LABEL[item.urgency]}{item.hint ? ` · ${item.hint}` : ''}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.5} alignItems="center" className="go"
        sx={{ opacity: 0.35, transition: 'opacity .15s' }}>
        <Typography variant="caption" fontWeight={600}>Aç</Typography>
        <ArrowIcon sx={{ fontSize: 14 }} />
      </Stack>
    </Stack>
  );
}
