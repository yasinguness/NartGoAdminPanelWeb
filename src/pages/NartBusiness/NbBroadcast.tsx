/**
 * Toplu Duyuru — NB üyelerine e-posta + uygulama içi bildirim.
 *
 * <h3>Neden e-posta ana kanal</h3>
 *
 * 71 üyenin 56'sında kayıtlı cihaz yok; push onlara ulaşmaz, kuyruğa bile
 * girmez. Ödeme yapan 11 üyeden yalnızca 2'sinin uygulaması var. Bu kitlede
 * e-posta yedek kanal değil, tek kanal. Ekran bu yüzden e-postayı öne alıyor
 * ve push'u "varsa ulaşır" diye anlatıyor.
 *
 * <h3>Deneme koşusu neden zorunlu</h3>
 *
 * Gönderim geri alınamaz ve karşı taraf 70 gerçek işletme. "Gönder" düğmesi,
 * seçili kitle için bir deneme koşusu yapılmadan açılmıyor. Kitleyi
 * değiştirirsen deneme tazeliğini yitirir ve düğme kendiliğinden yeniden
 * kilitlenir — çünkü değişen kitle, görülmemiş bir kitledir.
 *
 * <h3>Kitle durumla tanımlanır, davranışla değil</h3>
 *
 * Uç yalnız üyelik durumu alıyor. "Uygulamayı hiç açmamışlara gönder" gibi
 * bir süzgeç yok; o ayrım Arama Listesi'nde duruyor ve telefonla işliyor.
 * Burada olmayan bir süzgeci varmış gibi göstermedik.
 */

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  nbAdminService,
  NB_BROADCAST_STATUSES,
  nbBroadcastBreakdown,
  nbBroadcastNum,
  type NbBroadcastResult,
} from '../../services/nartbusiness/nbAdminService';
import type { NbMemberStatus } from '../../services/nartbusiness/nbTypes';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { STATUS_LABEL } from '../../utils/nbDisplay';
import {
  NbPageHeader,
  NbPanel,
  nbChip,
  nbColumn,
  nbColumns,
  nbDividerLine,
  nbInput,
  nbLabel,
  nbMono,
  nbPrimaryBtn,
  nbSecondaryBtn,
} from '../../components/nartbusiness/ui';
import { nb, nbRadius } from '../../theme/nbBrand';

/** Sunucunun kitle sayısını hangi adla döndürdüğü doğrulanamadı; sırayla denenir. */
const AUDIENCE_KEYS = ['audienceSize', 'total', 'recipients', 'audience', 'targeted', 'matched'];
const EMAIL_KEYS = ['emailSent', 'emailsSent', 'emails'];
const INAPP_KEYS = ['inAppSent', 'inappSent', 'notificationsSent'];
const FAILED_KEYS = ['failed', 'failures', 'errors'];

/**
 * Hazır bağlantılar — elle yazılan URL kırılır.
 *
 * Üçü de bu depoda mevcut rotalar. Önceki örnekte geçen
 * {@code https://nartgo.net/start} bilinçli olarak yok: bu uygulamada
 * karşılığı olan bir rota bulunmuyor.
 */
const LINK_PRESETS: { label: string; url: string }[] = [
  { label: 'İhaleler', url: 'https://nartgo.net/business/uye/ihaleler' },
  { label: 'Üyelik · ödeme', url: 'https://nartgo.net/business/uye/uyelik' },
  { label: 'Üye portalı', url: 'https://nartgo.net/business/uye' },
];

/** Boş satırla ayrılan bloklar paragraf olur. */
function toParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function Num({ value, tone }: { value: number | null; tone?: string }) {
  return (
    <Typography sx={{ fontSize: 22, fontWeight: 700, color: tone ?? nb.text, lineHeight: 1.1 }}>
      {/* Bilinmeyen sıfır değildir: alan gelmediyse 0 yazmak yanlış rapordur. */}
      {value === null ? '—' : value.toLocaleString('tr-TR')}
    </Typography>
  );
}

function Stat({ label, value, tone, hint }: {
  label: string;
  value: number | null;
  tone?: string;
  hint?: string;
}) {
  return (
    <Box sx={{ flex: '1 1 120px', minWidth: 0 }}>
      <Typography sx={nbLabel}>{label}</Typography>
      <Box sx={{ mt: 0.5 }}>
        <Num value={value} tone={tone} />
      </Box>
      {hint && (
        <Typography sx={{ fontSize: 10.5, color: nb.textFaint, mt: 0.25 }}>{hint}</Typography>
      )}
    </Box>
  );
}

/** Üyeye gidecek e-postanın ev stili — lacivert şerit, altın düğme. */
function EmailPreview({ headline, paragraphs, ctaLabel, ctaLink }: {
  headline: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaLink: string;
}) {
  return (
    <Box sx={{ border: `1px solid ${nb.border}`, borderRadius: `${nbRadius.panel}px`, overflow: 'hidden' }}>
      <Box sx={{ bgcolor: nb.navy, color: nb.onDark, px: 2.25, py: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>
          NARTBUSINESS
        </Typography>
      </Box>

      <Box sx={{ bgcolor: '#fff', px: 2.25, py: 2.25 }}>
        <Typography sx={{ fontSize: 12.5, color: nb.textMuted }}>Sayın [Şirket Adı],</Typography>

        <Typography sx={{ fontSize: 17, fontWeight: 700, color: nb.text, mt: 1.5 }}>
          {headline.trim() || 'Başlık'}
        </Typography>

        {paragraphs.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: nb.textFaint, mt: 1.25, fontStyle: 'italic' }}>
            Metin girilmedi.
          </Typography>
        ) : (
          paragraphs.map((p, i) => (
            <Typography key={i} sx={{ fontSize: 12.5, color: nb.text, lineHeight: 1.7, mt: 1.25 }}>
              {p}
            </Typography>
          ))
        )}

        {ctaLabel.trim() && (
          <Box sx={{ mt: 2.25 }}>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                bgcolor: nb.gold,
                color: nb.navy,
                fontSize: 12.5,
                fontWeight: 700,
                px: 2.25,
                py: 1.125,
                borderRadius: `${nbRadius.control}px`,
              }}
            >
              {ctaLabel.trim()}
            </Box>
            <Typography sx={{ ...nbMono, fontSize: 10.5, color: nb.textFaint, mt: 0.75 }}>
              {ctaLink.trim() || 'bağlantı girilmedi'}
            </Typography>
          </Box>
        )}

        <Box sx={{ borderTop: nbDividerLine, mt: 2.25, pt: 1.25 }}>
          <Typography sx={{ fontSize: 10.5, color: nb.textFaint }}>
            NartBusiness · destek alt bilgisi şablondan gelir
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function NbBroadcast() {
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [statuses, setStatuses] = useState<NbMemberStatus[]>(['TRIAL']);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(true);

  const [busy, setBusy] = useState<'dry' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NbBroadcastResult | null>(null);
  const [resultWasDry, setResultWasDry] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  /** Denemenin hangi kitle için yapıldığı. Kitle değişirse bu imza tutmaz. */
  const [previewSig, setPreviewSig] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ack, setAck] = useState(false);

  const paragraphs = useMemo(() => toParagraphs(body), [body]);
  const sig = useMemo(() => [...statuses].sort().join('|'), [statuses]);

  const ctaHalfFilled = ctaLabel.trim().length > 0 !== ctaLink.trim().length > 0;
  const ctaBadScheme = ctaLink.trim().length > 0 && !ctaLink.trim().startsWith('https://');
  const ctaForeignHost = ctaLink.trim().startsWith('https://') && !ctaLink.includes('nartgo.net');

  const noChannel = !sendEmail && !sendPush;
  const formReady =
    headline.trim().length > 0 && paragraphs.length > 0 && !noChannel && !ctaHalfFilled && !ctaBadScheme;

  const audience = nbBroadcastNum(result, AUDIENCE_KEYS);
  const breakdown = nbBroadcastBreakdown(result);
  const previewFresh = previewSig !== null && previewSig === sig;
  const canSend = formReady && previewFresh && (audience === null || audience > 0);

  const toggleStatus = (s: NbMemberStatus) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    // Kitle değişti: eldeki deneme artık başka bir kitlenin denemesi.
    setPreviewSig(null);
  };

  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? 'dry' : 'send');
    setError(null);
    try {
      const res = await nbAdminService.broadcast({
        headline: headline.trim(),
        paragraphs,
        statuses,
        sendPush,
        sendEmail,
        ctaLabel: ctaLabel.trim() || undefined,
        ctaLink: ctaLink.trim() || undefined,
        dryRun,
      });
      setResult(res);
      setResultWasDry(dryRun);
      if (dryRun) {
        setPreviewSig(sig);
      } else {
        // Gerçek gönderim bitti: aynı metin ikinci kez kazara gitmesin.
        setPreviewSig(null);
        setAck(false);
      }
    } catch (e) {
      setError(nbErrorMessage(e, dryRun ? 'Deneme koşusu başarısız.' : 'Gönderim başarısız.'));
    } finally {
      setBusy(null);
      setConfirmOpen(false);
    }
  };

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Genel"
        title="Toplu Duyuru"
        subtitle="Seçilen üyelik durumlarındaki üyelere e-posta ve uygulama içi bildirim gönder. Önce deneme koşusu zorunlu."
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ ...nbColumns, mt: 2 }}>
        {/* ── Sol: mesaj ───────────────────────────────────────────── */}
        <Box sx={nbColumn(2, 420)}>
          <NbPanel title="Mesaj" hint="e-posta ve bildirim aynı metni kullanır">
            <Typography sx={nbLabel}>BAŞLIK</Typography>
            <TextField
              fullWidth
              size="small"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Size uygun 3 kamu ihalesi bulundu"
              sx={{ ...nbInput, mt: 0.625 }}
            />

            <Typography sx={{ ...nbLabel, mt: 2 }}>METİN</Typography>
            <Typography sx={{ fontSize: 11, color: nb.textFaint, mb: 0.625 }}>
              Boş satır bırakarak paragrafa ayır. Şu an {paragraphs.length} paragraf.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'Birinci paragraf.\n\nİkinci paragraf.'}
              sx={nbInput}
            />

            <Typography sx={{ ...nbLabel, mt: 2 }}>DÜĞME (İSTEĞE BAĞLI)</Typography>
            <Stack direction="row" sx={{ gap: 1.25, mt: 0.625, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="İhaleleri Gör"
                sx={{ ...nbInput, flex: '1 1 160px' }}
              />
              <TextField
                size="small"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="https://nartgo.net/..."
                sx={{ ...nbInput, flex: '2 1 240px' }}
              />
            </Stack>
            <Stack direction="row" sx={{ gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
              {LINK_PRESETS.map((p) => (
                <Button
                  key={p.url}
                  size="small"
                  disableElevation
                  onClick={() => setCtaLink(p.url)}
                  sx={nbChip(ctaLink.trim() === p.url)}
                >
                  {p.label}
                </Button>
              ))}
            </Stack>

            {ctaHalfFilled && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                Düğme için etiket ve bağlantı birlikte gerekir. Biri boşken düğme basılmaz.
              </Alert>
            )}
            {ctaBadScheme && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                Bağlantı https:// ile başlamalı.
              </Alert>
            )}
            {ctaForeignHost && (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Bağlantı nartgo.net dışına gidiyor. Kasıtlıysa sorun yok.
              </Alert>
            )}
          </NbPanel>

          <Box sx={{ mt: 2 }}>
            <NbPanel title="Önizleme" hint="üyenin göreceği e-posta">
              <EmailPreview
                headline={headline}
                paragraphs={paragraphs}
                ctaLabel={ctaLabel}
                ctaLink={ctaLink}
              />
            </NbPanel>
          </Box>
        </Box>

        {/* ── Sağ: kitle, kanal, gönderim ───────────────────────────── */}
        <Box sx={nbColumn(1, 300)}>
          <NbPanel title="Kitle" hint="üyelik durumuna göre">
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              {NB_BROADCAST_STATUSES.map((s) => (
                <Button
                  key={s}
                  size="small"
                  disableElevation
                  onClick={() => toggleStatus(s)}
                  sx={nbChip(statuses.includes(s))}
                >
                  {STATUS_LABEL[s]}
                </Button>
              ))}
            </Stack>

            <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 1.25, lineHeight: 1.6 }}>
              Hiçbiri seçili değilse bildirim ulaşabilen tüm durumlara gider.
              Askıda, reddedilmiş ve henüz komiteden geçmemiş üyelere hiçbir
              durumda gönderilmez — o sessizlik kasıtlı.
            </Typography>
          </NbPanel>

          <Box sx={{ mt: 2 }}>
            <NbPanel title="Kanal">
              <FormControlLabel
                control={<Switch checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} size="small" />}
                label={<Typography sx={{ fontSize: 12.5 }}>E-posta</Typography>}
              />
              <Typography sx={{ fontSize: 11, color: nb.textFaint, ml: 0.25, mb: 1 }}>
                Bu kitlede tek güvenilir kanal.
              </Typography>

              <FormControlLabel
                control={<Switch checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} size="small" />}
                label={<Typography sx={{ fontSize: 12.5 }}>Uygulama içi + push</Typography>}
              />
              <Typography sx={{ fontSize: 11, color: nb.textFaint, ml: 0.25 }}>
                Kayıtlı cihazı olmayan üyeye ulaşmaz, kuyruğa bile girmez.
              </Typography>

              {noChannel && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  En az bir kanal gerekli.
                </Alert>
              )}
            </NbPanel>
          </Box>

          <Box sx={{ mt: 2 }}>
            <NbPanel title="Gönderim">
              <Button
                fullWidth
                disableElevation
                disabled={!formReady || busy !== null}
                onClick={() => run(true)}
                sx={nbSecondaryBtn}
              >
                {busy === 'dry' ? <CircularProgress size={16} /> : 'Deneme koşusu'}
              </Button>
              <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 0.75, lineHeight: 1.6 }}>
                Kitleyi çözer, kaç kişi olduğunu söyler, hiçbir ileti çıkarmaz.
              </Typography>

              <Button
                fullWidth
                disableElevation
                disabled={!canSend || busy !== null}
                onClick={() => setConfirmOpen(true)}
                sx={{ ...nbPrimaryBtn, mt: 1.5 }}
              >
                Gönder
              </Button>
              {!previewFresh && (
                <Typography sx={{ fontSize: 11, color: nb.amber, mt: 0.75, lineHeight: 1.6 }}>
                  {previewSig === null && result !== null && !resultWasDry
                    ? 'Gönderim tamamlandı. Yeniden göndermek için tekrar deneme koşusu yap.'
                    : 'Gönder, seçili kitle için deneme koşusu yapılınca açılır.'}
                </Typography>
              )}
            </NbPanel>
          </Box>
        </Box>
      </Box>

      {/* ── Sonuç ─────────────────────────────────────────────────── */}
      {result && (
        <Box sx={{ mt: 2 }}>
          <NbPanel
            title={resultWasDry ? 'Deneme sonucu' : 'Gönderim sonucu'}
            hint={resultWasDry ? 'hiçbir ileti çıkmadı' : undefined}
            action={
              <Button size="small" onClick={() => setShowRaw((v) => !v)} sx={nbSecondaryBtn}>
                {showRaw ? 'Ham yanıtı gizle' : 'Ham yanıt'}
              </Button>
            }
          >
            <Stack direction="row" sx={{ gap: 2.5, flexWrap: 'wrap' }}>
              <Stat label="KİTLE" value={audience} hint="bildirim ulaşabilen üye" />
              {!resultWasDry && (
                <>
                  <Stat
                    label="E-POSTA"
                    value={nbBroadcastNum(result, EMAIL_KEYS)}
                    tone={nb.green}
                  />
                  <Stat
                    label="UYGULAMA İÇİ"
                    value={nbBroadcastNum(result, INAPP_KEYS)}
                    hint="kayıt oluştu, telefonda göründü demek değil"
                  />
                  <Stat
                    label="BAŞARISIZ"
                    value={nbBroadcastNum(result, FAILED_KEYS)}
                    tone={nb.red}
                  />
                </>
              )}
            </Stack>

            {typeof result.message === 'string' && result.message.trim() && (
              <Typography sx={{ fontSize: 12.5, color: nb.textMuted, mt: 1.5 }}>
                {result.message}
              </Typography>
            )}

            {breakdown && (
              <Box sx={{ mt: 2, border: nbDividerLine, borderRadius: `${nbRadius.panel}px` }}>
                {Object.entries(breakdown).map(([k, v]) => (
                  <Stack
                    key={k}
                    direction="row"
                    alignItems="baseline"
                    sx={{
                      px: 1.5,
                      py: 1,
                      gap: 2,
                      borderBottom: nbDividerLine,
                      '&:last-of-type': { borderBottom: 0 },
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, flex: 1, minWidth: 0 }}>
                      {STATUS_LABEL[k as NbMemberStatus] ?? k}
                    </Typography>
                    <Typography sx={{ ...nbMono, fontSize: 12.5, fontWeight: 600 }}>{v}</Typography>
                  </Stack>
                ))}
              </Box>
            )}

            {audience === null && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Yanıtta kitle sayısı okunamadı. Bu "kimse yok" demek değil, alan
                adının beklenenden farklı olduğu anlamına gelir — ham yanıta bak.
              </Alert>
            )}

            <Collapse in={showRaw}>
              <Box
                component="pre"
                sx={{
                  ...nbMono,
                  fontSize: 11,
                  bgcolor: nb.inputBg,
                  border: nbDividerLine,
                  borderRadius: `${nbRadius.control}px`,
                  p: 1.5,
                  mt: 2,
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {JSON.stringify(result, null, 2)}
              </Box>
            </Collapse>
          </NbPanel>
        </Box>
      )}

      {/* ── Onay ──────────────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={nbLabel}>GERİ ALINAMAZ</Typography>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mt: 0.5 }}>
            Duyuru gönderilecek
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" sx={{ gap: 2.5, flexWrap: 'wrap', mb: 2 }}>
            <Stat label="ALICI" value={audience} />
            <Box sx={{ flex: '1 1 160px', minWidth: 0 }}>
              <Typography sx={nbLabel}>KANAL</Typography>
              <Typography sx={{ fontSize: 12.5, mt: 0.5 }}>
                {[sendEmail ? 'E-posta' : null, sendPush ? 'Uygulama içi + push' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            </Box>
          </Stack>

          <Typography sx={nbLabel}>GİDECEK METİN</Typography>
          <Box sx={{ mt: 0.75 }}>
            <EmailPreview
              headline={headline}
              paragraphs={paragraphs}
              ctaLabel={ctaLabel}
              ctaLink={ctaLink}
            />
          </Box>

          <FormControlLabel
            sx={{ mt: 1.5 }}
            control={<Checkbox checked={ack} onChange={(e) => setAck(e.target.checked)} size="small" />}
            label={
              <Typography sx={{ fontSize: 12.5 }}>
                Metni okudum, gerçek üyelere gitmesini onaylıyorum.
              </Typography>
            }
          />

          <Stack direction="row" sx={{ gap: 1.25, mt: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} sx={nbSecondaryBtn}>
              Vazgeç
            </Button>
            <Button
              disableElevation
              disabled={!ack || busy !== null}
              onClick={() => run(false)}
              sx={{ ...nbPrimaryBtn, bgcolor: nb.red, '&:hover': { bgcolor: '#96322f' } }}
            >
              {busy === 'send' ? <CircularProgress size={16} /> : 'Gönder'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
