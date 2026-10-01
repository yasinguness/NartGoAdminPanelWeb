import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CallIcon from '@mui/icons-material/Call';
import { Link as RouterLink } from 'react-router-dom';
import {
  nbAdminService,
  type NbEngagementBucket,
  type NbMemberEngagementRow,
} from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { nbFormatPhone, nbTelLink, nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
import { nb } from '../../theme/nbBrand';
import { nbDividerLine, nbLabel, nbMono, nbPill, nbSecondaryBtn } from './ui';

/**
 * Arama listesi — uygulamayı hiç açmamış ya da sessizleşmiş üyeler.
 *
 * <h3>Neden sayı yetmiyordu</h3>
 *
 * Karar panosu "43 kişi hiç açmamış" diyordu ve orada duruyordu. Sunucu
 * kimlikleri üretiyor, panel `sizeOf` ile sayıya indirip adları atıyordu.
 * Sayı bir teşhis; yapılacak iş ise o 43 kişiyi aramak ve sayıyla kimse
 * aranamaz.
 *
 * Satırda telefon doğrudan aranabilir ve WhatsApp'a bağlı: bu ölçekte
 * (70 üye) yapılacak şey yazılım değil, telefon.
 */

const BUCKET_LABEL: Record<NbEngagementBucket, string> = {
  NEVER: 'Hiç açmamış',
  SILENT: 'Sessiz',
  RECENT: 'Aktif',
};

function bucketTone(b: NbEngagementBucket) {
  if (b === 'NEVER') return 'bad' as const;
  if (b === 'SILENT') return 'warn' as const;
  return 'good' as const;
}

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    }).format(new Date(s));
  } catch {
    return '—';
  }
}

/** "8 gün kaldı" / "3 gün geçti" / "—". */
function trialText(days?: number | null): { text: string; urgent: boolean } {
  if (days === null || days === undefined) return { text: '—', urgent: false };
  if (days < 0) return { text: `${Math.abs(days)} gün geçti`, urgent: true };
  return { text: `${days} gün kaldı`, urgent: days <= 14 };
}

export default function NbEngagementCallList({
  open,
  onClose,
  silenceDays,
  initialBucket,
}: {
  open: boolean;
  onClose: () => void;
  silenceDays: number;
  /** Panodaki hangi sayıdan gelindiyse o kova önden seçili. */
  initialBucket: NbEngagementBucket;
}) {
  const [rows, setRows] = useState<NbMemberEngagementRow[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<NbEngagementBucket | 'ALL'>(initialBucket);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await nbAdminService.memberEngagement(silenceDays);
      setRows(res?.rows ?? []);
      setAvailable(res?.activityDataAvailable ?? false);
    } catch (e) {
      setError(nbErrorMessage(e, 'Liste alınamadı.'));
    } finally {
      setLoading(false);
    }
  }, [silenceDays]);

  useEffect(() => {
    if (!open) return;
    setBucket(initialBucket);
    void load();
  }, [open, initialBucket, load]);

  const visible = bucket === 'ALL' ? rows : rows.filter((r) => r.engagement === bucket);
  const countOf = (b: NbEngagementBucket) => rows.filter((r) => r.engagement === b).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={nbLabel}>ARAMA LİSTESİ</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, mt: 0.5 }}>
              Kim uygulamayı açmamış
            </Typography>
            <Typography sx={{ fontSize: 12, color: nb.textFaint, mt: 0.25 }}>
              Sessizlik eşiği {silenceDays} gün. Deneme bitişi yakın olan üstte.
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Kapat">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Bilinmeyen sıfır değildir: veri yoksa boş liste "herkes aktif"
            diye okunmasın. */}
        {!loading && !available && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Son-aktiflik verisi okunamadı. Bu liste boş olduğu için değil, veri
            gelmediği için boş. Auth servisine ulaşılabildiğini kontrol et.
          </Alert>
        )}

        <Stack direction="row" sx={{ gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
          {(['NEVER', 'SILENT', 'RECENT'] as NbEngagementBucket[]).map((b) => (
            <Button
              key={b}
              size="small"
              disableElevation
              onClick={() => setBucket(b)}
              sx={bucket === b ? { ...nbSecondaryBtn, bgcolor: nb.inputBg } : nbSecondaryBtn}
            >
              {BUCKET_LABEL[b]} · {countOf(b)}
            </Button>
          ))}
          <Button
            size="small"
            disableElevation
            onClick={() => setBucket('ALL')}
            sx={bucket === 'ALL' ? { ...nbSecondaryBtn, bgcolor: nb.inputBg } : nbSecondaryBtn}
          >
            Tümü · {rows.length}
          </Button>
        </Stack>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}>
            <CircularProgress size={22} />
          </Stack>
        ) : visible.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: nb.textMuted, textAlign: 'center', py: 4 }}>
            Bu kovada üye yok.
          </Typography>
        ) : (
          <Box sx={{ border: nbDividerLine, borderRadius: 1.5 }}>
            {visible.map((r) => {
              const trial = trialText(r.daysUntilTrialEnd);
              const wa = nbWhatsAppLink(r.phone);
              const tel = nbTelLink(r.phone);
              return (
                <Stack
                  key={r.memberId}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderBottom: nbDividerLine,
                    '&:last-of-type': { borderBottom: 0 },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <RouterLink
                      to={`/nartbusiness/members/${r.memberId}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <Typography
                        sx={{ fontSize: 12.5, fontWeight: 600, color: nb.text }}
                        noWrap
                      >
                        {r.companyName || `Üye ${r.memberId.slice(0, 8)}`}
                      </Typography>
                    </RouterLink>
                    <Typography sx={{ fontSize: 11, color: nb.textFaint }} noWrap>
                      {[r.city, nbFormatPhone(r.phone) || null].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'right', minWidth: 92 }}>
                    <Typography sx={{ ...nbMono, fontSize: 11, color: nb.textFaint }}>
                      {r.lastActiveAt ? fmtDate(r.lastActiveAt) : 'hiç'}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: trial.urgent ? nb.red : nb.textFaint,
                        fontWeight: trial.urgent ? 600 : 400,
                      }}
                    >
                      {trial.text}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={BUCKET_LABEL[r.engagement]}
                    sx={nbPill(bucketTone(r.engagement))}
                  />

                  {/* Bu ölçekte yapılacak şey yazılım değil telefon. */}
                  {tel ? (
                    <IconButton size="small" component="a" href={tel} aria-label="Ara">
                      <CallIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                  {wa ? (
                    <IconButton
                      size="small"
                      component="a"
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="WhatsApp"
                    >
                      <WhatsAppIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    // Numarası yoksa çalışmayan düğme çizme, sebebi yazılı.
                    <Typography sx={{ fontSize: 10, color: nb.amber, minWidth: 64 }}>
                      numara yok
                    </Typography>
                  )}
                </Stack>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
