/**
 * NartBusiness kontrol paneli.
 *
 * Önceki hâlde her şey aynı ağırlıkta sekiz kutucuktu: "toplam üye" ile
 * "açık soru" aynı puntoda duruyordu, kademe dağılımı sayı listesiydi,
 * modül aktivitesi de kutucuktu. Sayfa neyin acil olduğunu söylemiyordu.
 *
 * Yeni düzen üç kademeli:
 *   1. Topluluğun ürettiği ekonomik değer (hero) — panelin lede'i.
 *   2. Müdahale bekleyen iş — doğrulama ve ödeme kuyrukları öne çıkar.
 *   3. Kompozisyon ve hacim — kademe dağılımı, yönlendirme hunisi, içerik.
 *
 * Form seçimleri veriye göre: tek değerler stat tile, parça-bütün yatay
 * yığılmış çubuk, büyüklük karşılaştırması tek hue'lu sıralı çubuk, tek oran
 * ölçer. Zaman serisi endpoint'i olmadığı için trend grafiği YOK — olmayan
 * veriyi grafik gibi göstermek yanıltıcı olurdu.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Grid, Skeleton, Stack, Typography, Button } from '@mui/material';
import {
  PeopleAlt as PeopleIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  CreditCard as PaymentIcon,
  TrendingUp as TrendingIcon,
  Storefront as ListingIcon,
  AltRoute as ReferralIcon,
  QuestionAnswer as QuestionIcon,
  WorkspacePremium as TierIcon,
  Hub as ModuleIcon,
} from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  NbDashboardStats,
  MembershipTier,
  ReferralImpact,
  ModuleActivity,
} from '../../services/nartbusiness/nbTypes';
import type {
  NbListingAdminStats,
  NbReferralAdminStats,
  NbQuestionAdminStats,
} from '../../services/nartbusiness/nbAdminService';
import {
  NbPageHeader, NbPanel, NbStatCard, NbShareBar, NbRankBar, NbMeter, NbEmptyState,
  nbNumber, nbTry, nbTryCompact,
} from '../../components/nartbusiness/ui';
import { nb } from '../../theme/nbBrand';

/** Kademe etiketleri — MembershipTier'ın tamamı. */
const TIER_LABELS: Record<MembershipTier, string> = {
  KURUCU: 'Kurucu',
  STANDART: 'Standart',
  GENC_GIRISIMCI: 'Genç Girişimci',
  PROFESYONEL: 'Profesyonel',
  PATRON: 'Patron',
};

/** Kademe gösterim sırası — rastgele obje sırası değil, üyelik hiyerarşisi. */
const TIER_ORDER: MembershipTier[] = ['KURUCU', 'PATRON', 'PROFESYONEL', 'STANDART', 'GENC_GIRISIMCI'];

export default function NbDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<NbDashboardStats | null>(null);
  const [impact, setImpact] = useState<ReferralImpact | null>(null);
  const [activity, setActivity] = useState<ModuleActivity | null>(null);
  const [listingStats, setListingStats] = useState<NbListingAdminStats | null>(null);
  const [refStats, setRefStats] = useState<NbReferralAdminStats | null>(null);
  const [qStats, setQStats] = useState<NbQuestionAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    nbAdminService
      .getDashboardStats()
      .then((data) => {
        if (!mounted) return;
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message ?? 'Veri yüklenemedi');
        setLoading(false);
      });
    // Yardımcı ölçüler best-effort: biri düşerse panel yine açılır.
    nbAdminService.getReferralImpact().then((d) => { if (mounted) setImpact(d); }).catch(() => {});
    nbAdminService.getModuleActivity().then((d) => { if (mounted) setActivity(d); }).catch(() => {});
    nbAdminService.listingStats().then((d) => { if (mounted) setListingStats(d); }).catch(() => {});
    nbAdminService.referralStats().then((d) => { if (mounted) setRefStats(d); }).catch(() => {});
    nbAdminService.questionStats().then((d) => { if (mounted) setQStats(d); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!stats) return <Alert severity="info">NB Dashboard verisi yok.</Alert>;

  const pendingWork = stats.pendingVerification + stats.paymentPending;

  // membersByTier backend'den eksik anahtarla gelebilir — sabit sırayla ve
  // 0 varsayılanıyla okunur, böylece Object.entries'in kaprisine bağlı kalmaz.
  const tierSlices = TIER_ORDER.map((tier) => ({
    key: tier,
    label: TIER_LABELS[tier],
    value: stats.membersByTier?.[tier] ?? 0,
  }));

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <NbPageHeader
        eyebrow="NartBusiness"
        title="Kontrol Paneli"
        subtitle="Üyelik, doğrulama ve topluluk akışlarının anlık durumu."
        actions={
          pendingWork > 0 ? (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate('/nartbusiness/verification')}
              sx={{ fontWeight: 700 }}
            >
              {nbNumber(pendingWork)} bekleyen iş
            </Button>
          ) : undefined
        }
      />

      {/* ── 1. Hero: topluluğun ürettiği ekonomik değer ───────────────── */}
      {impact && impact.wonCount > 0 && (
        <Box
          sx={{
            mb: 3, p: { xs: 2.5, sm: 3.5 }, borderRadius: 3,
            background: `linear-gradient(135deg, ${nb.navyDeep} 0%, ${nb.navy} 55%, ${nb.navySoft} 100%)`,
            color: nb.onDark,
          }}
        >
          <Typography sx={{ fontSize: 10, letterSpacing: 1.6, fontWeight: 700, color: nb.goldSoft, mb: 1 }}>
            TOPLULUĞUN ÜRETTİĞİ İŞ HACMİ
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 5 }} alignItems={{ md: 'flex-end' }}>
            <Box>
              <Typography sx={{ fontSize: { xs: 40, sm: 52 }, fontWeight: 800, lineHeight: 1, color: '#fff' }}>
                {nbTryCompact(impact.totalDealValueTry)}
              </Typography>
              <Typography sx={{ fontSize: 13, color: nb.onDarkMuted, mt: 0.75 }}>
                {nbTry(impact.totalDealValueTry)} · üyelerin birbirine yaptırdığı toplam iş
              </Typography>
            </Box>
            <Stack direction="row" spacing={4}>
              <HeroFigure label="Kazanılan yönlendirme" value={nbNumber(impact.wonCount)} />
              {impact.dealValueTryLast12Months > 0 && (
                <HeroFigure label="Son 12 ay" value={nbTryCompact(impact.dealValueTryLast12Months)} />
              )}
            </Stack>
          </Stack>
        </Box>
      )}

      {/* ── 2. Müdahale bekleyen iş + üyelik hacmi ────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <NbStatCard
            label="Doğrulama bekleyen"
            value={nbNumber(stats.pendingVerification)}
            tone={stats.pendingVerification > 0 ? 'warning' : 'good'}
            icon={<PendingIcon />}
            emphasize={stats.pendingVerification > 0}
            caption={stats.pendingVerification > 0 ? 'Komite kararı bekliyor' : 'Kuyruk temiz'}
            linkText={stats.pendingVerification > 0 ? 'Kuyruğa git' : undefined}
            onClick={() => navigate('/nartbusiness/verification')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <NbStatCard
            label="Ödeme bekleyen"
            value={nbNumber(stats.paymentPending)}
            tone={stats.paymentPending > 0 ? 'serious' : 'good'}
            icon={<PaymentIcon />}
            emphasize={stats.paymentPending > 0}
            caption={stats.paymentPending > 0 ? 'Onaylandı, tahsilat yapılmadı' : 'Bekleyen tahsilat yok'}
            linkText="Üyelere git"
            onClick={() => navigate('/nartbusiness/members')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <NbStatCard
            label="Aktif üye"
            value={nbNumber(stats.activeMembers)}
            tone="good"
            icon={<CheckIcon />}
            caption={`${nbNumber(stats.totalMembers)} kayıtlı üyenin ${
              stats.totalMembers ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0
            }%'i`}
            linkText="Üyeleri görüntüle"
            onClick={() => navigate('/nartbusiness/members')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <NbStatCard
            label="Son 7 günde başvuru"
            value={nbNumber(stats.recentApplicationsLast7Days)}
            tone="neutral"
            icon={<PeopleIcon />}
            caption="Yeni üyelik başvurusu"
          />
        </Grid>
      </Grid>

      {/* ── 3. Kompozisyon ────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <NbPanel
            title="Kademe Dağılımı"
            hint={`${nbNumber(stats.totalMembers)} üye`}
            icon={<TierIcon />}
          >
            <NbShareBar slices={tierSlices} emptyText="Kademe verisi yok." />
          </NbPanel>
        </Grid>

        <Grid item xs={12} md={6}>
          <NbPanel
            title="Yönlendirme Hunisi"
            hint="teklif → kabul → sonuç"
            icon={<ReferralIcon />}
            action={
              <Button size="small" onClick={() => navigate('/nartbusiness/referrals')} sx={{ fontSize: 12 }}>
                Yönet
              </Button>
            }
          >
            {refStats ? (
              <Stack spacing={2.5}>
                <NbRankBar
                  rows={[
                    { key: 'proposed', label: 'Teklif edildi', value: refStats.proposed },
                    { key: 'accepted', label: 'Kabul edildi', value: refStats.accepted },
                    { key: 'won', label: 'Kazanıldı', value: refStats.closedWon },
                    { key: 'lost', label: 'Kaybedildi', value: refStats.closedLost },
                    { key: 'declined', label: 'Reddedildi', value: refStats.declined },
                  ]}
                  emptyText="Henüz yönlendirme yok."
                />
                <NbMeter
                  label="Kazanma oranı"
                  pct={refStats.winRatePct}
                  caption={`${nbNumber(refStats.closedWon)} kazanılan · toplam ${nbTry(refStats.totalDealValueTry)}`}
                />
              </Stack>
            ) : (
              <NbEmptyState title="Yönlendirme istatistiği alınamadı" dense />
            )}
          </NbPanel>
        </Grid>
      </Grid>

      {/* ── 4. İçerik & topluluk hacmi ────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <NbPanel
            title="İlanlar"
            hint={listingStats ? `${nbNumber(listingStats.total)} toplam` : undefined}
            icon={<ListingIcon />}
            action={
              <Button size="small" onClick={() => navigate('/nartbusiness/listings')} sx={{ fontSize: 12 }}>
                Yönet
              </Button>
            }
          >
            {listingStats ? (
              <Stack spacing={2.5}>
                <NbShareBar
                  slices={[
                    { key: 'requests', label: 'Talep', value: listingStats.requests },
                    { key: 'offers', label: 'Arz', value: listingStats.offers },
                  ]}
                />
                <NbRankBar
                  rows={[
                    { key: 'active', label: 'Aktif', value: listingStats.active },
                    { key: 'closed', label: 'Kapandı', value: listingStats.closed },
                    { key: 'expired', label: 'Süresi doldu', value: listingStats.expired },
                  ]}
                />
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                  Son 7 günde {nbNumber(listingStats.openedLast7d)} yeni ilan
                </Typography>
              </Stack>
            ) : (
              <NbEmptyState title="İlan istatistiği alınamadı" dense />
            )}
          </NbPanel>
        </Grid>

        <Grid item xs={12} md={4}>
          <NbPanel
            title="Topluluk Soruları"
            hint={qStats ? `${nbNumber(qStats.total)} toplam` : undefined}
            icon={<QuestionIcon />}
            action={
              <Button size="small" onClick={() => navigate('/nartbusiness/questions')} sx={{ fontSize: 12 }}>
                Yönet
              </Button>
            }
          >
            {qStats ? (
              <NbRankBar
                rows={[
                  { key: 'open', label: 'Açık', value: qStats.open },
                  { key: 'answered', label: 'Cevaplandı', value: qStats.answered },
                  { key: 'closed', label: 'Kapandı', value: qStats.closed },
                  { key: 'expired', label: 'Süresi doldu', value: qStats.expired },
                  { key: 'hidden', label: 'Gizlendi', value: qStats.hidden },
                ]}
                emptyText="Henüz soru yok."
              />
            ) : (
              <NbEmptyState title="Soru istatistiği alınamadı" dense />
            )}
          </NbPanel>
        </Grid>

        <Grid item xs={12} md={4}>
          <NbPanel title="Modül Aktivitesi" hint="toplam · son 30 gün" icon={<ModuleIcon />}>
            {activity ? (
              <Stack spacing={2.25}>
                <ModuleRow
                  label="Mentörlük talebi"
                  total={activity.mentorshipTotal}
                  last30={activity.mentorshipLast30}
                  extra={`${nbNumber(activity.mentorshipMatched)} eşleşti`}
                />
                <ModuleRow
                  label="Ortak girişim"
                  total={activity.ventureTotal}
                  last30={activity.ventureLast30}
                  extra={`${nbNumber(activity.ventureFormed)} kuruldu`}
                />
                <ModuleRow
                  label="Topluluk sorusu"
                  total={activity.questionTotal}
                  last30={activity.questionLast30}
                />
              </Stack>
            ) : (
              <NbEmptyState title="Modül aktivitesi alınamadı" dense />
            )}
          </NbPanel>
        </Grid>
      </Grid>
    </Box>
  );
}

/** Hero şeridindeki ikincil rakam. */
function HeroFigure({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', mt: 0.25 }}>{label}</Typography>
    </Box>
  );
}

/** Modül satırı: toplam + son 30 gün deltası. */
function ModuleRow({
  label, total, last30, extra,
}: { label: string; total: number; last30: number; extra?: string }) {
  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {nbNumber(total)}
        </Typography>
        {last30 > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.25} sx={{ color: 'success.dark' }}>
            <TrendingIcon sx={{ fontSize: 13 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{nbNumber(last30)}</Typography>
          </Stack>
        )}
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{label}</Typography>
      {extra && <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{extra}</Typography>}
    </Box>
  );
}

/** Yükleniyor iskeleti — dönen çark yerine sayfanın şeklini önceden gösterir. */
function DashboardSkeleton() {
  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Skeleton variant="text" width={260} height={44} />
      <Skeleton variant="text" width={380} height={22} sx={{ mb: 3 }} />
      <Skeleton variant="rounded" height={140} sx={{ mb: 3, borderRadius: 3 }} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[0, 1, 2, 3].map((i) => (
          <Grid item xs={12} sm={6} lg={3} key={i}>
            <Skeleton variant="rounded" height={132} sx={{ borderRadius: 2.5 }} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        {[0, 1].map((i) => (
          <Grid item xs={12} md={6} key={i}>
            <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2.5 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
