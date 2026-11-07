import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { errorText } from '../../services/nartstore/storeActivityService';
import {
  STORE_CAMPAIGN_ADMIN_URL,
  storeCampaignPageUrl,
  storeCampaignService,
  type CurrentStoreCampaign,
} from '../../services/nartstore/storeCampaignService';

/**
 * NartStore › Kampanyalar: kampanya sürecinin anlatımı ve yayındaki/yaklaşan kampanya. Yönetim
 * (oluşturma, katılımı açma, davet, reddetme, acil durdurma) NartStore panelinde yapılır.
 * docs/plan/nartstore-kasim-kampanyasi.md
 */

type Who = 'Siz' | 'Kendiliğinden' | 'Satıcı';

const PROCESS: { who: Who; title: string; text: string }[] = [
  { who: 'Siz', title: 'Hazırlık', text: 'NartStore panelinde kampanyayı düzenleyin: başlangıç ve bitiş, katılım son günü, en az indirim oranı, isteğe bağlı kampanya komisyonu ve görsel. Taslaktaki kampanyayı satıcılar ve müşteriler görmez.' },
  { who: 'Siz', title: 'Katılımı açın', text: '"Katılımı aç" ile kampanya satıcı panellerinde görünür. "Satıcılara davet gönder" aktif mağaza sahiplerine bir kez e-posta gönderir.' },
  { who: 'Satıcı', title: 'Ürün ve fiyat eklenir', text: 'Satıcı ürün seçip kampanya fiyatı yazar. Son 30 günün en düşük fiyatına göre en az belirlenen oranda indirimli ürün kendiliğinden onaylanır; uygun görmediğiniz ürünü panelden reddedersiniz.' },
  { who: 'Kendiliğinden', title: 'Katılım kapanır', text: 'Katılım son gününde satıcılar ürün ekleyemez (panelden daha önce de kapatılabilir).' },
  { who: 'Kendiliğinden', title: 'Kampanya başlar', text: 'Başlangıç saatinde fiyatlar ürünlere yazılır ve son kez denetlenir. Sitede, uygulamada ve nartgo.net\'te kampanya bandı ve rozetler çıkar; "Başlayınca haber ver" listesine e-posta ve bildirim gider; Telegram\'a özet düşer.' },
  { who: 'Siz', title: 'Kampanya süresince', text: 'NartStore panelindeki panodan satışı, ödeme hatasını ve tükenen ürünleri izleyin; Telegram ayrıca uyarır. Sorunlu ürünü reddedin; büyük sorunda "Acil durdur" tüm fiyatları geri alır.' },
  { who: 'Kendiliğinden', title: 'Kampanya biter', text: 'Bitişten 6 saat önce sepetinde kampanya ürünü olanlara hatırlatma gider. Bitiş saatinde eski fiyatlar geri yazılır, bant ve rozetler kalkar.' },
];

const WHO_COLOR: Record<Who, 'primary' | 'info' | 'default'> = { Siz: 'primary', Satıcı: 'info', Kendiliğinden: 'default' };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function StoreCampaigns() {
  const [campaign, setCampaign] = useState<CurrentStoreCampaign | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    storeCampaignService
      .current()
      .then(setCampaign)
      .catch((e) => {
        setError(errorText(e));
        setCampaign(null);
      });
  }, []);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>NartStore kampanyaları</Typography>
        <Button variant="contained" href={STORE_CAMPAIGN_ADMIN_URL} target="_blank" rel="noopener">
          Kampanya yönetimini aç
        </Button>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 900 }}>
        Kampanyalar (Efsane Cuma vb.) NartStore panelinde, Platform Yönetimi › Kampanyalar ekranında yönetilir; bu ekran için
        mağaza süper yönetici hesabı gerekir. Kampanyayı başlatan ya da bitiren bir düğme yoktur: panelden katılımı açarsınız,
        başlangıç ve bitiş tarihe göre kendiliğinden olur.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Şu anki durum</Typography>
        {campaign === undefined ? (
          <CircularProgress size={22} />
        ) : error ? (
          <Alert severity="warning">Kampanya durumu alınamadı: {error}</Alert>
        ) : campaign ? (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={700}>{campaign.title}</Typography>
              <Chip size="small" color={campaign.status === 'LIVE' ? 'success' : 'default'} label={campaign.status === 'LIVE' ? 'Yayında' : 'Yaklaşıyor'} />
            </Stack>
            <Typography variant="body2">
              {fmt(campaign.startsAt)} ile {fmt(campaign.endsAt)} arası
              {campaign.status === 'LIVE' && campaign.productCount ? ` · ${campaign.productCount} ürün kampanyada` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {campaign.status === 'LIVE'
                ? `Fiyatlar ${fmt(campaign.endsAt)} tarihinde kendiliğinden geri alınacak.`
                : `Fiyatlar ${fmt(campaign.startsAt)} tarihinde kendiliğinden yazılacak. Katılım durumu ve onaylı ürün sayısı NartStore panelinde.`}
            </Typography>
            <Box>
              <Button size="small" href={storeCampaignPageUrl(campaign.slug)} target="_blank" rel="noopener">
                Kampanya sayfasını aç
              </Button>
            </Box>
          </Stack>
        ) : (
          <Typography variant="body2">
            Yayında ya da önümüzdeki 14 gün içinde başlayacak kampanya yok. Taslak ve katılımı açık kampanyalar NartStore panelinde görünür.
          </Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ px: 2.5, pt: 2, pb: 1 }}>Süreç nasıl işler</Typography>
        {PROCESS.map((step, i) => (
          <Stack key={step.title} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Typography sx={{ width: 24, color: 'text.disabled', fontWeight: 700 }}>{i + 1}</Typography>
            <Box sx={{ minWidth: 170 }}>
              <Typography variant="body2" fontWeight={700}>{step.title}</Typography>
              <Chip size="small" label={step.who} color={WHO_COLOR[step.who]} variant={step.who === 'Kendiliğinden' ? 'outlined' : 'filled'} sx={{ mt: 0.5 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{step.text}</Typography>
          </Stack>
        ))}
      </Paper>
    </Box>
  );
}
