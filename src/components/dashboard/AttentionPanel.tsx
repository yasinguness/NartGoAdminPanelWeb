import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { nbAdminService, type NbAttention } from '../../services/nartbusiness/nbAdminService';
import { businessClaimService } from '../../services/business/businessClaimService';
import { featuredAdminService, formatDate, type FeaturedList } from '../../services/business/featuredAdminService';
import { storeActivityService, type Overview } from '../../services/nartstore/storeActivityService';
import { heritageVillageService, type PendingSummary } from '../../services/heritageVillageService';

/**
 * Panel ana sayfası › "Bugün ilgilenmen gerekenler". Her kart kendi verisini ayrı çeker; biri hata verirse ya da
 * yapılacak iş yoksa yalnız o kart görünmez. Sayılar sunucudan gelir, burada tahmin yürütülmez.
 */
export default function AttentionPanel() {
  const [nb, setNb] = useState<NbAttention | null>(null);
  const [claims, setClaims] = useState<number | null>(null);
  const [featured, setFeatured] = useState<FeaturedList | null>(null);
  const [store, setStore] = useState<Overview | null>(null);
  const [heritage, setHeritage] = useState<PendingSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      nbAdminService.getDashboardAttention(7).then(setNb),
      businessClaimService.getClaims({ status: 'PENDING', page: 0, size: 1 }).then((p) => setClaims(p?.totalElements ?? 0)),
      featuredAdminService.list().then(setFeatured),
      storeActivityService.overview(1).then(setStore),
      heritageVillageService.pendingSummary().then(setHeritage),
    ]).finally(() => setLoaded(true));
  }, []);

  const cards: ReactNode[] = [];

  if (nb) {
    const overdue = nb.deadlines.filter((d) => (d.daysLeft ?? 0) < 0).length;
    const items = [
      { n: nb.submitted, label: 'başvuru karar bekliyor', to: '/nartbusiness/decision-board' },
      { n: nb.needsInfo, label: 'başvuruda eksik bilgi bekleniyor', to: '/nartbusiness/decision-board' },
      { n: nb.deadlines.length, label: `üyeliğin süresi ${nb.withinDays} gün içinde doluyor${overdue ? ` (${overdue} gecikmiş)` : ''}`, to: '/nartbusiness/trial-center' },
      { n: nb.approvedExpired, label: 'onaylı ama ödeme süresi geçmiş', to: '/nartbusiness/trial-center' },
    ].filter((i) => i.n > 0);
    if (items.length) cards.push(<AttentionCard key="nb" title="NartBusiness" items={items} />);
  }

  if (claims) cards.push(<AttentionCard key="claims" title="İşletme sahiplenme" items={[{ n: claims, label: 'talep inceleme bekliyor', to: '/business-claims' }]} />);

  if (store) {
    const failed = store.orders.find((o) => o.status === 'FAILED')?.count ?? 0;
    const pending = store.orders.find((o) => o.status === 'PENDING')?.count ?? 0;
    const paid = store.orders.find((o) => o.status === 'PAID');
    const items = [
      { n: failed, label: 'ödeme başarısız (bugün)', to: '/nartstore/activity', tone: 'error' as const },
      { n: store.totals.peopleWithErrors, label: 'kişi mağazada hata aldı (bugün)', to: '/nartstore/activity', tone: 'error' as const },
      { n: pending, label: 'sipariş ödeme bekliyor', to: '/nartstore/activity' },
      { n: paid?.count ?? 0, label: `sipariş ödendi · ${Math.round(paid?.total ?? 0).toLocaleString('tr-TR')} ₺`, to: '/nartstore/activity', tone: 'success' as const },
    ].filter((i) => i.n > 0);
    if (items.length) cards.push(<AttentionCard key="store" title="NartStore · bugün" items={items} />);
  }

  if (featured) {
    const soon = featured.items.filter((f) => f.remainingDays != null && f.remainingDays <= 7);
    if (soon.length)
      cards.push(<AttentionCard key="featured" title="Öne çıkarma" items={[{ n: soon.length, label: `işletmenin öne çıkarması 7 gün içinde bitiyor`, to: '/businesses?filter=featured' }]}
        footer={soon.slice(0, 3).map((f) => `${f.name} (${formatDate(f.featuredEndDate)})`).join(' · ')} />);
  }

  if (heritage) {
    const items = [
      { n: heritage.villageContributions, label: 'köy bilgisi önerisi', to: '/heritage/villages?pending=1' },
      { n: heritage.familySuggestions, label: 'yeni sülale önerisi', to: '/heritage/families?tab=3' },
      { n: heritage.communityDisputed, label: 'tartışmalı kayıt', to: '/heritage/families?tab=4' },
      { n: heritage.decidableTasks, label: 'karara hazır köy sorusu', to: '/heritage/villages?pending=1' },
      { n: heritage.locationQueue, label: 'konum incelemesi', to: '/heritage/locations' },
      { n: heritage.instagramComments, label: 'Instagram yorumu', to: '/heritage/families?tab=2' },
    ].filter((i) => i.n > 0);
    if (items.length) cards.push(<AttentionCard key="heritage" title="Ortak Hafıza" items={items} />);
  }

  if (!loaded) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5} sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
        Bugün ilgilenmen gerekenler
      </Typography>
      {cards.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Typography color="text.secondary">Bekleyen iş yok: başvuru, talep, öneri ve mağaza hatası görünmüyor.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>{cards}</Box>
      )}
    </Box>
  );
}

type Item = { n: number; label: string; to: string; tone?: 'error' | 'success' };

function AttentionCard({ title, items, footer }: { title: string; items: Item[]; footer?: string }) {
  const navigate = useNavigate();
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Typography fontWeight={700} sx={{ mb: 1 }}>{title}</Typography>
      <Stack spacing={0.75}>
        {items.map((i) => (
          <Box key={i.label} onClick={() => navigate(i.to)} role="link" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(i.to); }}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 1.5, px: 1, py: 0.5, '&:hover': { bgcolor: 'action.hover' } }}>
            <Chip size="small" label={i.n} color={i.tone === 'error' ? 'error' : i.tone === 'success' ? 'success' : 'warning'} sx={{ minWidth: 36, fontWeight: 700 }} />
            <Typography variant="body2">{i.label}</Typography>
          </Box>
        ))}
      </Stack>
      {footer && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{footer}</Typography>}
    </Paper>
  );
}
