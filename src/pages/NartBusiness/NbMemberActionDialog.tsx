/**
 * Üyelik durumu değiştirme — üç adım: **Aksiyon → Gerekçe → Onay.**
 *
 * Üç tasarım kararı bu diyaloğu belirliyor:
 *
 * 1. **Yalnız uygulanabilir aksiyonlar listelenir.** Seçenekler sunucudan
 *    gelen `allowedActions` ile süzülür; "iptal edilmiş bir üyeyi askıya al"
 *    seçeneğini gri gösterip tıklatmamak yerine hiç göstermiyoruz. Kapalı
 *    bir seçenek, kullanıcıya neden kapalı olduğunu anlatmadığı sürece
 *    yalnızca gürültüdür.
 *
 * 2. **Her seçenek sonucunu bir cümleyle söyler** ve yanında "geri
 *    alınabilir / alınamaz" rozeti taşır. Aksiyonun adı ("İptal et") sonucunu
 *    anlatmıyor; kaybedilenin ne olduğunu anlatan şey cümledir.
 *
 * 3. **Geri alınamaz aksiyonda onay kutusu işaretlenmeden birincil buton
 *    çalışmaz** ve kırmızıya döner. Kritik ve dönüşü olmayan bir işlemin tek
 *    tıkla, uyarısız çalışması kabul edilebilir değil.
 *
 * Gerekçe **kayda geçer ve üyeye giden bildirimde kullanılır**; bu yüzden
 * hazır şablon çipleri var. Zorunlu değil: zorunlu olduğu dönemde 30
 * karakterlik doldurma metinler yazılıyordu, opsiyonel olunca yazılan not
 * gerçekten bir şey anlatıyor.
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  AdminImpactPreview,
  AdminMemberAction,
  NbMember,
  NbPeriodView,
} from '../../services/nartbusiness/nbTypes';
import { NbStepModal } from '../../components/nartbusiness/ui';
import { nb, nbRadius } from '../../theme/nbBrand';
import { formatMoney, PERIOD_STATUS_LABEL, shortDate, STATUS_LABEL, TIER_LABEL } from '../../utils/nbDisplay';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

interface Props {
  open: boolean;
  member: NbMember | null;
  onClose: () => void;
  onActionDone: () => void;
}

const STEPS = [
  { label: 'Aksiyon', hint: 'ne yapılacak' },
  { label: 'Gerekçe', hint: 'neden' },
  { label: 'Onay', hint: 'sonuç' },
];

interface ActionMeta {
  title: string;
  /** Seçeneğin altındaki tek cümle — ne olacağını anlatır, aksiyonun adını değil. */
  description: string;
  /** Onay adımındaki renkli sonuç kutusu. */
  consequence: string;
  terminal: boolean;
  cta: string;
}

const ACTION_META: Record<AdminMemberAction, ActionMeta> = {
  SUSPEND: {
    title: 'Askıya al',
    description:
      'Üye listelerden ve eşleştirmelerden düşer, profili korunur. NB rolü çekilir; ödeme gelince tek tuşla geri açılır.',
    consequence:
      'Sonuç: üye askıya alınmış duruma geçer, arama ve eşleştirmelerden çıkar. Mevcut dönemi kaybolmaz. Geri alınabilir.',
    terminal: false,
    cta: 'Askıya al',
  },
  REACTIVATE: {
    title: 'Tekrar aktif et',
    description:
      'NB rolü yeniden atanır, üye dönem bitişine kadar erişimini geri alır. Yeni faturalama tetiklenmez.',
    consequence:
      'Sonuç: üye aktif duruma döner ve mevcut dönemi kaldığı yerden işler. Geri alınabilir.',
    terminal: false,
    cta: 'Aktif et',
  },
  CANCEL: {
    title: 'İptal et',
    description:
      'Üyelik kalıcı olarak iptal edilir, NB rolü çekilir. Yeniden katılım için tekrar başvuru gerekir.',
    consequence:
      'Sonuç: üye iptal edilmiş duruma düşer, NB rolü çekilir ve kayıt arşive geçer. Bu karar terminaldir.',
    terminal: true,
    cta: 'İptal et',
  },
};

/**
 * Gerekçe şablonları.
 *
 * Çip seçmek notu **doldurur**, kilitlemez: şablon bir başlangıç noktası,
 * son söz değil. Kategori kodu audit kaydına gider.
 */
const REASON_PRESETS: Record<AdminMemberAction, { category: string; label: string }[]> = {
  SUSPEND: [
    { category: 'PAYMENT_DISPUTE', label: 'Ödeme gecikti' },
    { category: 'TEMPORARY_HOLD', label: 'Soruşturma sürüyor' },
    { category: 'ABUSE_REPORT', label: 'Şikayet geldi' },
    { category: 'POLICY_VIOLATION', label: 'Kural ihlali' },
    { category: 'KVKK_BREACH', label: 'Veri ihlali şüphesi' },
    { category: 'OTHER_SUSPEND', label: 'Diğer' },
  ],
  REACTIVATE: [
    { category: 'DISPUTE_RESOLVED', label: 'Ödeme alındı' },
    { category: 'INVESTIGATION_CLEARED', label: 'Soruşturma temiz' },
    { category: 'USER_REQUEST', label: 'Üye talebi' },
    { category: 'ERROR_CORRECTION', label: 'Yanlış askıya alma' },
    { category: 'OTHER_REACTIVATE', label: 'Diğer' },
  ],
  CANCEL: [
    { category: 'USER_REQUEST', label: 'Üye talebi' },
    { category: 'NON_PAYMENT', label: 'Ödeme yapılmadı' },
    { category: 'KVKK_DELETION', label: 'KVKK silme talebi' },
    { category: 'CONFIRMED_FRAUD', label: 'Doğrulanmış sahtelik' },
    { category: 'POLICY_PERMANENT', label: 'Kalıcı kural ihlali' },
    { category: 'OTHER_CANCEL', label: 'Diğer' },
  ],
};

/** Admin'in tipik niyeti: önce askıya alma, sonra geri açma, son çare iptal. */
function defaultAction(allowed: AdminMemberAction[]): AdminMemberAction | undefined {
  if (allowed.includes('SUSPEND')) return 'SUSPEND';
  if (allowed.includes('REACTIVATE')) return 'REACTIVATE';
  if (allowed.includes('CANCEL')) return 'CANCEL';
  return undefined;
}

export default function NbMemberActionDialog({ open, member, onClose, onActionDone }: Props) {
  const [step, setStep] = useState(0);
  const [impact, setImpact] = useState<AdminImpactPreview | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<NbPeriodView | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<AdminMemberAction | undefined>(undefined);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  /** Geri alınamaz aksiyonun kilidi. */
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member) return;
    setStep(0);
    setNote('');
    setError(null);
    setConfirmed(false);
    setAction(undefined);
    setCurrentPeriod(null);
    setLoading(true);
    Promise.all([
      nbAdminService.getMemberImpact(member.memberId),
      nbAdminService.listMemberPeriods(member.memberId).catch(() => []),
    ])
      .then(([imp, periods]) => {
        setImpact(imp);
        setAction(imp ? defaultAction(imp.allowedActions) : undefined);
        setCurrentPeriod(
          member.currentPeriodId
            ? periods.find((p) => p.id === member.currentPeriodId) ?? null
            : periods[0] ?? null,
        );
      })
      .catch((e) => setError(nbErrorMessage(e, 'Etki önizlemesi yüklenemedi')))
      .finally(() => setLoading(false));
  }, [open, member]);

  // Aksiyon değişince kategori o aksiyonun ilk şablonuna döner; önceki
  // aksiyonun kategorisi yeni aksiyonla birlikte kayda geçmemeli.
  useEffect(() => {
    setCategory(action ? REASON_PRESETS[action][0].category : '');
  }, [action]);

  const choices = useMemo(() => {
    const allowed = impact?.allowedActions ?? [];
    return (['SUSPEND', 'REACTIVATE', 'CANCEL'] as AdminMemberAction[]).filter((a) =>
      allowed.includes(a),
    );
  }, [impact?.allowedActions]);

  const meta = action ? ACTION_META[action] : null;
  const terminal = Boolean(meta?.terminal);
  const canSubmit = Boolean(action && member && (!terminal || confirmed));

  const submit = async () => {
    if (!canSubmit || !member || !action) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = { category, note };
      if (action === 'SUSPEND') await nbAdminService.suspendMember(member.memberId, body);
      else if (action === 'REACTIVATE') await nbAdminService.reactivateMember(member.memberId, body);
      else await nbAdminService.cancelMember(member.memberId, body);
      onActionDone();
      onClose();
    } catch (e) {
      setError(nbErrorMessage(e, 'İşlem başarısız'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!member) return null;

  const periodLine = currentPeriod
    ? `${TIER_LABEL[currentPeriod.tier]} · ${shortDate(currentPeriod.startsAt)} – ${shortDate(
        currentPeriod.endsAt,
      )} · ${formatMoney(currentPeriod.fee, currentPeriod.currency)} · ${
        PERIOD_STATUS_LABEL[currentPeriod.status]
      }`
    : 'Aktif dönem yok — bu üyeye henüz bir dönem oluşmamış.';

  return (
    <NbStepModal
      open={open}
      onClose={() => !submitting && onClose()}
      tone="light"
      width={620}
      title="Üyelik durumunu değiştir"
      caption={`${member.companyName ?? 'Şirket bilgisi eksik'} · ${TIER_LABEL[member.tier]} · ${
        STATUS_LABEL[member.status]
      }`}
      steps={STEPS}
      current={step}
      primaryLabel={step === 2 ? (submitting ? 'Gönderiliyor…' : meta?.cta ?? 'Uygula') : 'Devam et'}
      primaryDisabled={step === 0 ? !action : step === 2 ? !canSubmit : false}
      primaryDanger={step === 2 && terminal}
      onPrimary={() => (step < 2 ? setStep((s) => s + 1) : submit())}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      busy={submitting}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {step === 0 && (
            <>
              <Typography sx={{ fontSize: 12.5, color: nb.textMuted, mb: 1.5 }}>
                {choices.length === 0
                  ? `Bu üyeye uygulanabilir bir durum değişikliği yok (${STATUS_LABEL[member.status]}). Kapanmış kayıtlar üzerinde değişiklik yapılamaz.`
                  : 'Mevcut duruma uygulanabilir aksiyonlar:'}
              </Typography>

              {choices.length > 0 && (
                <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mb: 1.5 }}>
                  {periodLine}
                </Typography>
              )}

              <Stack sx={{ gap: 1.125 }}>
                {choices.map((key) => {
                  const m = ACTION_META[key];
                  const selected = action === key;
                  return (
                    <Box
                      key={key}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      onClick={() => setAction(key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setAction(key);
                      }}
                      sx={{
                        border: `1px solid ${selected ? nb.green : nb.border}`,
                        bgcolor: selected ? '#f6faf8' : nb.surface,
                        borderRadius: `${nbRadius.panel}px`,
                        p: 1.625,
                        cursor: 'pointer',
                      }}
                    >
                      <Stack direction="row" alignItems="center" sx={{ gap: 1.125 }}>
                        <Box
                          sx={{
                            width: 14, height: 14, borderRadius: '50%', flexShrink: 0, bgcolor: '#fff',
                            border: selected ? `4px solid ${nb.green}` : '1px solid #c9c3b4',
                          }}
                        />
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{m.title}</Typography>
                        <Box
                          component="span"
                          sx={{
                            ml: 'auto',
                            bgcolor: m.terminal ? nb.redTint : nb.greenTint,
                            color: m.terminal ? nb.red : nb.green,
                            fontSize: 10.5, fontWeight: 600, borderRadius: '5px', px: 1, py: 0.375,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.terminal ? 'geri alınamaz' : 'geri alınabilir'}
                        </Box>
                      </Stack>
                      <Typography
                        sx={{ fontSize: 11.5, color: nb.textMuted, lineHeight: 1.5, mt: 0.75, pl: 2.875 }}
                      >
                        {m.description}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}

          {step === 1 && action && (
            <>
              <Typography sx={{ fontSize: 12.5, color: nb.textMuted }}>
                Gerekçe kayda geçer ve üyeye gönderilen bildirimde kullanılır.
              </Typography>

              <Box
                component="textarea"
                value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                placeholder="Örn. ödeme 3 hafta gecikti, muhasebe onayı yok."
                sx={{
                  width: '100%', mt: 1.375, minHeight: 96, resize: 'vertical',
                  border: `1px solid ${nb.inputBorder}`, bgcolor: nb.inputBg,
                  borderRadius: '9px', p: 1.375, fontSize: 13, fontFamily: 'inherit',
                  color: nb.text, outline: 'none',
                  '&:focus': { borderColor: nb.navy },
                }}
              />

              <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.875, mt: 1.125 }}>
                {REASON_PRESETS[action].map((p) => (
                  <Button
                    key={p.category}
                    disableElevation
                    onClick={() => {
                      setCategory(p.category);
                      // Şablon notu doldurur, kilitlemez: yazılmış bir notun
                      // üstüne yazmak, yazdığını kaybettirmek olurdu.
                      setNote((prev) => (prev.trim() ? prev : p.label));
                    }}
                    sx={{
                      border: `1px solid ${category === p.category ? nb.navy : nb.inputBorder}`,
                      bgcolor: category === p.category ? nb.navy : '#fff',
                      color: category === p.category ? '#fff' : nb.textMuted,
                      borderRadius: `${nbRadius.pill}px`,
                      px: 1.375, py: 0.625, fontSize: 11.5, textTransform: 'none',
                      '&:hover': { bgcolor: category === p.category ? nb.navyDeep : nb.inputBg },
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </Stack>
            </>
          )}

          {step === 2 && meta && (
            <>
              <Box
                sx={{
                  border: `1px solid ${nb.divider}`, bgcolor: '#f7f6f1',
                  borderRadius: `${nbRadius.panel}px`, p: 1.75,
                }}
              >
                <Typography sx={{ fontSize: 10, letterSpacing: '0.12em', color: nb.textFaint, fontWeight: 600 }}>
                  ÖZET
                </Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, mt: 0.875 }}>
                  {meta.title} · {member.companyName ?? 'Şirket bilgisi eksik'}
                </Typography>
                <Typography sx={{ fontSize: 12, color: nb.textMuted, mt: 0.75, lineHeight: 1.55 }}>
                  {note.trim() ? `Gerekçe: ${note.trim()}` : 'Gerekçe girilmedi.'}
                </Typography>
              </Box>

              {/* Sonuç kutusu — rengi aksiyonun ağırlığını taşır. */}
              <Box
                sx={{
                  mt: 1.5,
                  bgcolor: terminal ? nb.redTint : nb.amberTint,
                  color: terminal ? nb.red : nb.amber,
                  borderRadius: '9px',
                  px: 1.75, py: 1.5, fontSize: 12.5, lineHeight: 1.5,
                }}
              >
                {meta.consequence}
              </Box>

              {/* Geri alınamaz aksiyonda kilit: işaretlenmeden buton çalışmaz. */}
              {terminal && (
                <Box
                  component="label"
                  sx={{ display: 'flex', gap: 1.125, alignItems: 'flex-start', mt: 1.5, cursor: 'pointer' }}
                >
                  <Box
                    component="input"
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmed(e.target.checked)}
                    sx={{ accentColor: nb.green, width: 15, height: 15, mt: 0.25, flexShrink: 0 }}
                  />
                  <Typography sx={{ fontSize: 12.5, color: '#4a545c' }}>
                    Sonucu okudum, üyeye bildirim gönderilmesini onaylıyorum.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </>
      )}
    </NbStepModal>
  );
}
