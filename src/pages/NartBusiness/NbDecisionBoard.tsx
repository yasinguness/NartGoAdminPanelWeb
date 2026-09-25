/**
 * Karar Panosu — fiyat ve üyelik kararlarının zemini.
 *
 * Bu bir gösterge paneli değil. Kontrol paneli "bugün ne oluyor" sorusunu
 * cevaplıyor; burası tek bir soruyu cevaplıyor: **denemeyi/fiyatı değiştirmeli
 * miyiz.** O tartışma fikirle yürütüldüğünde kimse haklı çıkamıyor, çünkü
 * herkesin elinde farklı bir hikâye var.
 *
 * Üç bölüm, üç soru, her birinin tek bir baş sayısı:
 *
 *   1. Ödeme duvarı para getiriyor mu?  → ödeme sonrası açılan yönlendirme
 *   2. Ürün para kazandırıyor mu?       → kazanılan iş
 *   3. Üye hâlâ burada mı?              → bir aydır görünmeyen üye
 *
 * Grafik yok. Üç sayı ve oranları grafik istemiyor; olmayan zaman serisini
 * çizgi gibi göstermek yanıltıcı olurdu (kontrol panelindeki aynı kural).
 *
 * **Bilinmeyen sıfır değildir.** Son-aktiflik başka bir servisten geliyor;
 * ulaşılamadığında sayı "—" gösterilir. Sıfır yazmak, karara "kimse
 * sessizleşmemiş" diye yalan söylemek olurdu.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Grid, Skeleton, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Lock as LockIcon,
  EmojiEvents as WonIcon,
  NotificationsOff as SilentIcon,
} from '@mui/icons-material';
import { NbPageHeader, NbPanel, NbStatCard } from '../../components/nartbusiness/ui';
import { nb, nbType, nbRadius } from '../../theme/nbBrand';
import { nbAdminService, type NbDecisionBoard as BoardData } from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

const SILENCE_OPTIONS = [14, 30, 60];

/** Bilinmeyen sayı "—" gösterilir; sıfırla karıştırılmaz. */
function num(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : v.toLocaleString('tr-TR');
}

function pct(part: number, whole: number): string | undefined {
  if (!whole) return undefined;
  return `%${Math.round((part / whole) * 100)}`;
}

export default function NbDecisionBoardPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silenceDays: number) => {
    // SWR: eşik değişince mevcut sayılar ekranda kalsın, iskelete düşmesin.
    setLoading(!data);
    setError(null);
    try {
      setData(await nbAdminService.getDecisionBoard(silenceDays));
    } catch (e) {
      setError(nbErrorMessage(e, 'Karar panosu yüklenemedi'));
    } finally {
      setLoading(false);
    }
    // data bağımlılığı bilerek dışarıda: yalnız ilk yüklemede iskelet isteniyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  if (loading && !data) {
    return (
      <>
        <NbPageHeader crumb="NartBusiness" title="Karar Panosu" />
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rounded" height={170} />
            </Grid>
          ))}
        </Grid>
      </>
    );
  }

  return (
    <>
      <NbPageHeader
        crumb="NartBusiness"
        title="Karar Panosu"
        subtitle="Fiyat ve üyelik kararlarının dayanacağı üç sayı. Tahmin değil, kayıt."
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {data && !data.activityDataAvailable && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Son-aktiflik verisi şu an alınamıyor, üçüncü bölüm "—" gösteriyor.
          Sıfır olarak yazmıyoruz; eksik veriyi sıfır sanmak yanlış karar verdirir.
        </Alert>
      )}

      {data && (
        <Stack spacing={2.5}>
          {/* ── 1. Ödeme duvarı ───────────────────────────────────────── */}
          <NbPanel
            title="Ödeme duvarı para getiriyor mu"
            hint="İhale yönlendirmesi kilitli gittiğinde üye bildirimi alır, içeriği göremez. Ödeme sonrası açılan her kayıt, duvarın ürettiği ödemenin doğrudan kanıtıdır."
            icon={<LockIcon sx={{ fontSize: 18, color: nb.gold }} />}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <NbStatCard
                  label="Ödeme sonrası açıldı"
                  value={num(data.referralsUnlockedAfterPayment)}
                  caption={
                    pct(data.referralsUnlockedAfterPayment, data.referralsLockedOnSend)
                      ? `Kilitli gidenlerin ${pct(data.referralsUnlockedAfterPayment, data.referralsLockedOnSend)}'i`
                      : 'Henüz kilitli yönlendirme yok'
                  }
                  tone={data.referralsUnlockedAfterPayment > 0 ? 'good' : 'neutral'}
                  emphasize
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <NbStatCard
                  label="Kilitli gönderildi"
                  value={num(data.referralsLockedOnSend)}
                  caption={`Toplam ${num(data.referralsTotal)} yönlendirme içinde`}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <NbStatCard
                  label="Hâlâ kilitli"
                  value={num(data.referralsStillLocked)}
                  caption="Bekleyen dönüşüm"
                  tone={data.referralsStillLocked > 0 ? 'warning' : 'neutral'}
                />
              </Grid>
            </Grid>
            <Typography sx={{ ...nbType.bodySm, color: nb.textFaint, mt: 1.5 }}>
              {data.referralsNeverViewed > 0
                ? `${num(data.referralsNeverViewed)} yönlendirme hiç açılmadı. Duvar mı engelliyor, ilgi mi yok — bu ikisi farklı sorun.`
                : 'Gönderilen her yönlendirme en az bir kez açılmış.'}
            </Typography>
          </NbPanel>

          {/* ── 2. Sonuçlanan iş ──────────────────────────────────────── */}
          <NbPanel
            title="Ürün para kazandırıyor mu"
            hint="Yönlendirmelerin sonucu. Kazanılan iş sıfıra yakınsa sorun fiyat değildir ve hiçbir fiyat kurgusu onu çözmez."
            icon={<WonIcon sx={{ fontSize: 18, color: nb.gold }} />}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <NbStatCard
                  label="Kazanılan iş"
                  value={num(data.referralsWon)}
                  caption="Bir tanesi bu tartışmayı kökünden değiştirir"
                  tone={data.referralsWon > 0 ? 'good' : 'warning'}
                  emphasize
                />
              </Grid>
              <Grid item xs={4} md={3}>
                <NbStatCard label="Teklif verdi" value={num(data.referralsBid)} />
              </Grid>
              <Grid item xs={4} md={3}>
                <NbStatCard label="İlgilendi" value={num(data.referralsInterested)} />
              </Grid>
              <Grid item xs={4} md={3}>
                <NbStatCard label="Reddetti" value={num(data.referralsDeclined)} />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                size="small"
                onClick={() => navigate('/nartbusiness/tender-referrals')}
                sx={{ textTransform: 'none', fontWeight: 600, color: nb.navy }}
              >
                Yönlendirmeleri aç
              </Button>
            </Stack>
          </NbPanel>

          {/* ── 3. Sessizleşen üye ────────────────────────────────────── */}
          <NbPanel
            title="Üye hâlâ burada mı"
            hint="Ödemeyen sessiz üye ile ödemeyen ama her gün giren üye bambaşka iki sorundur. İlki ürünü hiç kullanmamıştır, ikincisi kullanmış ama parasını vermemiştir."
            icon={<SilentIcon sx={{ fontSize: 18, color: nb.gold }} />}
            action={
              <ToggleButtonGroup
                size="small"
                exclusive
                value={days}
                onChange={(_, v) => v && setDays(v)}
                sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 1.25, py: 0.25, fontSize: 12 } }}
              >
                {SILENCE_OPTIONS.map((d) => (
                  <ToggleButton key={d} value={d}>{d} gün</ToggleButton>
                ))}
              </ToggleButtonGroup>
            }
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <NbStatCard
                  label={`${data.silenceThresholdDays} gündür görünmeyen`}
                  value={num(data.silentMembers)}
                  caption={
                    data.silentMembers !== null
                      ? `${num(data.fullAccessMembers)} tam erişimli üye içinde${
                          pct(data.silentMembers, data.fullAccessMembers)
                            ? ` · ${pct(data.silentMembers, data.fullAccessMembers)}`
                            : ''
                        }`
                      : 'Veri alınamadı'
                  }
                  tone={
                    data.silentMembers !== null && data.silentMembers > data.fullAccessMembers / 2
                      ? 'warning'
                      : 'neutral'
                  }
                  emphasize
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <NbStatCard
                  label="Hiç açmamış"
                  value={num(data.neverOpenedMembers)}
                  caption="Kaybedilen alışkanlık değil, hiç kurulmamış olan"
                  tone={
                    data.neverOpenedMembers !== null && data.neverOpenedMembers > 0
                      ? 'warning'
                      : 'neutral'
                  }
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <NbStatCard
                  label="Tam erişimli üye"
                  value={num(data.fullAccessMembers)}
                  caption="Aktif + deneme"
                />
              </Grid>
            </Grid>
          </NbPanel>

          <Box
            sx={{
              border: `1px solid ${nb.border}`,
              borderRadius: `${nbRadius.card}px`,
              bgcolor: nb.surface,
              p: 2.25,
            }}
          >
            <Typography sx={{ ...nbType.label, color: nb.textFaint, mb: 0.75 }}>
              Bu pano neyi söylemez
            </Typography>
            <Typography sx={{ ...nbType.bodySm, color: nb.textMuted, lineHeight: 1.6 }}>
              Kimin neden ödemediğini söylemez, yalnız kaçının ödemediğini söyler.
              Sayılar bir yöne işaret ediyorsa bir sonraki adım tahmin yürütmek değil,
              o üyelerden birkaçıyla konuşmaktır.
            </Typography>
          </Box>
        </Stack>
      )}
    </>
  );
}
