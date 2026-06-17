import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  AdminImpactPreview,
  AdminMemberAction,
  NbMember,
  NbPeriodView,
} from '../../services/nartbusiness/nbTypes';
import {
  AuditNoteBlock,
  ConfirmationStep,
  NbSectionPaper,
  NbStatusBadge,
  RadioCardGroup,
  isAuditNoteValid,
  useNbMobile,
  type AuditCategoryOption,
  type RadioCardOption,
} from '../../components/nartbusiness';
import {
  formatMoney,
  monthsBetween,
  PERIOD_STATUS_LABEL,
  shortDate,
  STATUS_LABEL,
  TIER_LABEL,
} from '../../utils/nbDisplay';

interface Props {
  open: boolean;
  member: NbMember | null;
  onClose: () => void;
  onActionDone: () => void;
}

const STEPS = ['Aksiyon', 'Gerekçe', 'Onay'];

interface ActionMeta {
  title: string;
  description: string;
  reversibleLabel: string;
  reversibleColor: 'success' | 'error';
  icon: JSX.Element;
  terminal: boolean;
}

const ACTION_META: Record<AdminMemberAction, ActionMeta> = {
  SUSPEND: {
    title: 'Askıya Al',
    description:
      "NB rolü Keycloak'tan çekilir; üye NB özelliklerine erişimini geçici olarak kaybeder. Mevcut period korunur.",
    reversibleLabel: '✓ Geri alınabilir',
    reversibleColor: 'success',
    icon: <PauseCircleOutlineIcon fontSize="small" color="warning" />,
    terminal: false,
  },
  REACTIVATE: {
    title: 'Tekrar Aktif Et',
    description:
      'NB rolü tekrar atanır, üye dönem bitişine kadar erişimini geri alır. Mevcut period korunur, yeni faturalama tetiklenmez.',
    reversibleLabel: '✓ Geri alınabilir',
    reversibleColor: 'success',
    icon: <PlayCircleOutlineIcon fontSize="small" color="success" />,
    terminal: false,
  },
  CANCEL: {
    title: 'İptal Et',
    description:
      'Üyelik kalıcı olarak iptal edilir. NB rolü çekilir; yeniden katılım için tekrar başvurması gerekir.',
    reversibleLabel: '⚠ Geri alınamaz',
    reversibleColor: 'error',
    icon: <CancelOutlinedIcon fontSize="small" color="error" />,
    terminal: true,
  },
};

const CATEGORIES: Record<AdminMemberAction, AuditCategoryOption[]> = {
  SUSPEND: [
    { value: 'KVKK_BREACH', label: 'KVKK / veri ihlali şüphesi' },
    { value: 'PAYMENT_DISPUTE', label: 'Ödeme uyuşmazlığı / chargeback' },
    { value: 'ABUSE_REPORT', label: 'Şikayet / abuse raporu' },
    { value: 'POLICY_VIOLATION', label: 'Topluluk kuralları ihlali' },
    { value: 'TEMPORARY_HOLD', label: 'Geçici hold — soruşturma sürüyor' },
    { value: 'OTHER_SUSPEND', label: 'Diğer (notta açıkla)' },
  ],
  REACTIVATE: [
    { value: 'INVESTIGATION_CLEARED', label: 'Soruşturma sonuçlandı — temiz' },
    { value: 'USER_REQUEST', label: 'Üye talebi üzerine' },
    { value: 'DISPUTE_RESOLVED', label: 'Uyuşmazlık çözüldü' },
    { value: 'ERROR_CORRECTION', label: 'Yanlış suspend — düzeltme' },
    { value: 'OTHER_REACTIVATE', label: 'Diğer (notta açıkla)' },
  ],
  CANCEL: [
    { value: 'USER_REQUEST', label: 'Üye talebi (yazılı / sözlü)' },
    { value: 'CONFIRMED_FRAUD', label: 'Doğrulanmış sahtelik / dolandırıcılık' },
    { value: 'KVKK_DELETION', label: 'KVKK silme talebi' },
    { value: 'NON_PAYMENT', label: 'Ödeme yapılmadı / takipsiz' },
    { value: 'POLICY_PERMANENT', label: 'Kalıcı politika ihlali' },
    { value: 'OTHER_CANCEL', label: 'Diğer (notta açıkla)' },
  ],
};

function defaultAction(allowed: AdminMemberAction[]): AdminMemberAction | undefined {
  // Önce SUSPEND, sonra REACTIVATE, son çare CANCEL — admin'in tipik intent'i
  if (allowed.includes('SUSPEND')) return 'SUSPEND';
  if (allowed.includes('REACTIVATE')) return 'REACTIVATE';
  if (allowed.includes('CANCEL')) return 'CANCEL';
  return undefined;
}

export default function NbMemberActionDialog({
  open,
  member,
  onClose,
  onActionDone,
}: Props) {
  const fullScreen = useNbMobile();
  const [step, setStep] = useState(0);
  const [impact, setImpact] = useState<AdminImpactPreview | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<NbPeriodView | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<AdminMemberAction | undefined>(undefined);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member) return;
    setStep(0);
    setNote('');
    setError(null);
    setAction(undefined);
    setCurrentPeriod(null);
    setLoading(true);
    Promise.all([
      nbAdminService.getMemberImpact(member.memberId),
      nbAdminService.listMemberPeriods(member.memberId).catch(() => []),
    ])
      .then(([imp, periods]) => {
        setImpact(imp);
        const def = imp ? defaultAction(imp.allowedActions) : undefined;
        setAction(def);
        const current = member.currentPeriodId
          ? periods.find((p) => p.id === member.currentPeriodId) ?? null
          : periods[0] ?? null;
        setCurrentPeriod(current);
      })
      .catch((e: any) => setError(e?.message ?? 'Etki önizlemesi yüklenemedi'))
      .finally(() => setLoading(false));
  }, [open, member]);

  useEffect(() => {
    if (!action) {
      setCategory('');
      return;
    }
    setCategory(CATEGORIES[action][0].value);
  }, [action]);

  const noteValid = isAuditNoteValid(note, 30);
  const stepValid: Record<number, boolean> = {
    0: !!action && (impact?.allowedActions ?? []).includes(action),
    1: !!action && !!category && noteValid,
    2: true,
  };
  const canSubmit = !!action && !!category && noteValid && !!member;

  /** Sadece state-aware kart — `allowed` listede olmayan aksiyonu HİÇ render etme. */
  const actionOptions: RadioCardOption<AdminMemberAction>[] = useMemo(() => {
    const allowed = impact?.allowedActions ?? [];
    return (['SUSPEND', 'REACTIVATE', 'CANCEL'] as AdminMemberAction[])
      .filter((a) => allowed.includes(a))
      .map((a) => {
        const meta = ACTION_META[a];
        return {
          value: a,
          title: meta.title,
          description: meta.description,
          trailing: (
            <Chip
              size="small"
              variant="outlined"
              color={meta.reversibleColor}
              label={meta.reversibleLabel}
            />
          ),
        };
      });
  }, [impact?.allowedActions]);

  const submit = async () => {
    if (!canSubmit || !member || !action) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = { category, note };
      if (action === 'SUSPEND') await nbAdminService.suspendMember(member.memberId, body);
      else if (action === 'REACTIVATE')
        await nbAdminService.reactivateMember(member.memberId, body);
      else await nbAdminService.cancelMember(member.memberId, body);
      onActionDone();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------
  const memberContextChip = (m: NbMember) => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: 'primary.light',
          fontSize: 13,
        }}
      >
        {(m.companyName ?? '?').trim().charAt(0).toUpperCase()}
      </Avatar>
      <Box>
        <Typography variant="body2" fontWeight={600}>
          {m.companyName ?? 'Şirket bilgisi eksik'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {STATUS_LABEL[m.status]} · {TIER_LABEL[m.tier]}
        </Typography>
      </Box>
    </Stack>
  );

  const currentStateBlock = (m: NbMember) => {
    if (!currentPeriod) {
      return (
        <Alert severity="info" variant="outlined">
          <Typography variant="body2">
            <b>{STATUS_LABEL[m.status]}</b> · {TIER_LABEL[m.tier]}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Aktif dönem yok — bu üyeye henüz period oluşmamış.
          </Typography>
        </Alert>
      );
    }
    const monthsActive = monthsBetween(
      currentPeriod.startsAt,
      new Date().toISOString(),
    );
    const monthsLeft = monthsBetween(
      new Date().toISOString(),
      currentPeriod.endsAt,
    );
    return (
      <Alert severity="info" variant="outlined" icon={false}>
        <Typography variant="body2">
          <b>{TIER_LABEL[currentPeriod.tier]} Yıllık Üyelik</b>
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {shortDate(currentPeriod.startsAt)} – {shortDate(currentPeriod.endsAt)} ·{' '}
          {monthsActive} aydır aktif · Kalan: {monthsLeft} ay
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          Ücret: <b>{formatMoney(currentPeriod.fee, currentPeriod.currency)}</b> ·{' '}
          Durum: <b>{PERIOD_STATUS_LABEL[currentPeriod.status]}</b>
          {currentPeriod.paymentId
            ? ' · Ödeme alındı'
            : currentPeriod.fee === 0
            ? ' · Ücretsiz'
            : ' · Offline / yok'}
        </Typography>
      </Alert>
    );
  };

  const renderActionStep = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }
    if (!member || !impact) return <Alert severity="error">Üye yüklenemedi.</Alert>;

    return (
      <Stack spacing={2}>
        <NbSectionPaper title="Mevcut Durum">{currentStateBlock(member)}</NbSectionPaper>

        {impact.allowedActions.length === 0 ? (
          <Alert severity="warning">
            Bu üye için tanımlı admin aksiyonu yok ({STATUS_LABEL[member.status]}).
            Terminal/kapalı kayıtlar üzerinde değişiklik yapılamaz.
          </Alert>
        ) : (
          <NbSectionPaper
            title="Bu üyeye ne yapılsın?"
            hint="Sadece mevcut durumda uygulanabilir aksiyonlar listelenir."
          >
            <RadioCardGroup<AdminMemberAction>
              label={null}
              options={actionOptions}
              value={action}
              onChange={setAction}
            />
          </NbSectionPaper>
        )}

        {action && (
          <Alert
            severity={ACTION_META[action].terminal ? 'error' : 'warning'}
            variant="outlined"
          >
            {action === 'SUSPEND' && impact.activePeriods > 0 && (
              <Typography variant="body2">
                <b>Suspend yaparsanız:</b> NB rolü Keycloak'tan çekilir, üye anında
                erişimini kaybeder. Aktif {impact.activePeriods} period kaybedilmez —
                reactivate ile erişim geri açılır.
              </Typography>
            )}
            {action === 'REACTIVATE' && (
              <Typography variant="body2">
                <b>Reactivate yaparsanız:</b> NB rolü tekrar atanır, üye dönem bitişine
                kadar erişimini geri alır.
              </Typography>
            )}
            {action === 'CANCEL' && (
              <Typography variant="body2">
                <b>İptal yaparsanız:</b> Üye CANCELLED'a düşer. NB rolü çekilir. Bu
                karar terminal — geri alınamaz, yeni başvuru gerekir.
              </Typography>
            )}
          </Alert>
        )}
      </Stack>
    );
  };

  const renderReasonStep = () =>
    action ? (
      <Stack spacing={2}>
        <NbSectionPaper title="Gerekçe" hint="Audit log'a kalıcı yazılır.">
          <Alert
            severity="info"
            variant="outlined"
            icon={ACTION_META[action].icon}
          >
            Seçilen aksiyon: <b>{ACTION_META[action].title}</b>
          </Alert>
          <AuditNoteBlock
            categories={CATEGORIES[action]}
            category={category}
            onCategoryChange={setCategory}
            note={note}
            onNoteChange={setNote}
            placeholder={
              action === 'SUSPEND'
                ? "Neden askıya alıyorsun? (örn. '15.05.2026 tarihinde kullanıcı X'i taciz raporu — soruşturma süresince hold')"
                : action === 'REACTIVATE'
                ? "Neden reactivate ediyorsun? (örn. 'Soruşturma sonuçlandı, şikayet doğrulanmadı, ekip onayı: PR #1234')"
                : "Neden iptal ediyorsun? (örn. 'Üyenin KVKK silme talebi — 15.05.2026 tarihli yazılı talep')"
            }
          />
        </NbSectionPaper>
      </Stack>
    ) : null;

  const renderConfirmStep = () => {
    if (!action || !member) return null;
    const meta = ACTION_META[action];
    return (
      <ConfirmationStep
        sections={[
          {
            title: 'Üye',
            rows: [
              { label: 'Şirket', value: member.companyName ?? '— eksik —' },
              { label: 'Mevcut durum', value: STATUS_LABEL[member.status] },
              { label: 'Kademe', value: TIER_LABEL[member.tier] },
            ],
          },
          {
            title: 'Aksiyon',
            rows: [
              { label: 'Tip', value: meta.title },
              {
                label: 'Yeni durum',
                value:
                  action === 'SUSPEND'
                    ? 'Askıda'
                    : action === 'REACTIVATE'
                    ? 'Aktif'
                    : 'İptal',
              },
              {
                label: 'NB rolü',
                value:
                  action === 'REACTIVATE'
                    ? 'Tekrar atanır'
                    : "Keycloak'tan iptal edilir",
              },
              { label: 'Geri alınabilirlik', value: meta.reversibleLabel },
            ],
            content: (
              <Box
                sx={{
                  backgroundColor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  mt: 1,
                }}
              >
                {`[KATEGORI: ${category}] ${note}`}
              </Box>
            ),
          },
        ]}
        warning={
          meta.terminal ? (
            <>
              <b>Bu karar terminal.</b> Üye CANCELLED olur. Audit log'a kalıcı yazılır.
            </>
          ) : action === 'SUSPEND' ? (
            'Üye anında NB rolünü kaybeder. Reactivate ile geri açılabilir.'
          ) : undefined
        }
      />
    );
  };

  const body = () => {
    switch (step) {
      case 0:
        return renderActionStep();
      case 1:
        return renderReasonStep();
      case 2:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  const submitColor: 'error' | 'warning' | 'success' = !action
    ? 'warning'
    : action === 'CANCEL'
    ? 'error'
    : action === 'SUSPEND'
    ? 'warning'
    : 'success';

  const submitLabel = !action
    ? 'Uygula'
    : action === 'SUSPEND'
    ? 'Askıya Al'
    : action === 'REACTIVATE'
    ? 'Aktif Et'
    : 'İptal Et';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Box>
            <Typography variant="h6">Üye Aksiyonu</Typography>
            {member && (
              <Box mt={0.5}>{memberContextChip(member)}</Box>
            )}
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Stepper activeStep={step} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {error && <Alert severity="error">{error}</Alert>}
          {body()}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          İptal
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {step > 0 && (
          <Button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={submitting}
          >
            Geri
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStep((s) => s + 1)}
            disabled={!stepValid[step] || submitting}
          >
            Devam et
          </Button>
        ) : (
          <Button
            variant="contained"
            color={submitColor}
            disabled={!canSubmit || submitting}
            onClick={submit}
          >
            {submitting ? 'Gönderiliyor…' : submitLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Suppress unused-warning for NbStatusBadge (kullanılmıyor ama context için kalsın diye export'lar muhafaza)
void NbStatusBadge;
