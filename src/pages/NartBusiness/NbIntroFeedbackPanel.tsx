import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  nbAdminService,
  NB_FEEDBACK_ANSWER_LABEL,
  type NbFeedbackAnswer,
  type NbFeedbackSideState,
  type NbIntroFeedbackSide,
  type NbIntroFeedbackView,
} from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { nbSecondaryBtn, type NbTone } from '../../components/nartbusiness/ui';
import NbPill from '../../components/nartbusiness/ui/NbPill';
import { nb, nbRadius, nbType } from '../../theme/nbBrand';
import { formatDate } from './nbIntroMatch';

/**
 * Bir tarafın sonuç durumunu tek rozete çevirir. Liste kolonu ve panel aynı
 * dili konuşsun diye tek yerde.
 */
export function feedbackSideBadge(
  state: NbFeedbackSideState,
  answer?: NbFeedbackAnswer | null,
): { label: string; tone: NbTone } {
  if (state === 'ANSWERED' && answer) {
    return {
      label: NB_FEEDBACK_ANSWER_LABEL[answer],
      tone: answer === 'WON' ? 'good' : answer === 'NO_RESULT' ? 'bad' : 'info',
    };
  }
  if (state === 'WAITING') return { label: 'Cevap bekleniyor', tone: 'warn' };
  if (state === 'NO_ANSWER') return { label: 'Cevap alınamadı', tone: 'neutral' };
  return { label: 'Sorulmadı', tone: 'neutral' };
}

function sideState(side: NbIntroFeedbackSide): NbFeedbackSideState {
  const f = side.feedback;
  if (!f) return 'NOT_ASKED';
  if (f.answer) return 'ANSWERED';
  return f.closed ? 'NO_ANSWER' : 'WAITING';
}

const ANSWER_CHANNEL_LABEL: Record<string, string> = {
  EMAIL_LINK: 'e-posta bağlantısından',
  WHATSAPP: "WhatsApp'tan",
  APP: 'uygulamadan',
  ADMIN: 'yönetici tarafından kaydedildi',
};

type Confirm = { kind: 'send'; memberIds: string[] } | { kind: 'remind'; memberId: string };

/**
 * Tanıştırma sonuç takibi: sonuç sorusunun iki taraftaki durumu.
 *
 * Faz 1'de soru otomatik gitmiyor; her gönderim ve hatırlatma admin onayıyla
 * (docs/plan/nb-tanistirma-geri-bildirim.md). Admin cevabı üyeden kendisi
 * aldıysa (telefon, yüz yüze) buradan işleyebilir.
 */
export default function NbIntroFeedbackPanel({
  introId,
  focusMemberId,
  canManage,
  onChanged,
}: {
  introId: string;
  /** Üye detayından açıldıysa o üyenin satırı "Bu üye" diye işaretlenir. */
  focusMemberId?: string;
  canManage: boolean;
  /** Durum değişmiş olabilir (ör. "iş çıktı" tanıştırmayı kapattı): üst liste tazelensin. */
  onChanged?: (view: NbIntroFeedbackView) => void;
}) {
  const [view, setView] = useState<NbIntroFeedbackView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [recordFor, setRecordFor] = useState<string | null>(null);
  const [recordAnswer, setRecordAnswer] = useState<NbFeedbackAnswer>('WON');
  const [recordNote, setRecordNote] = useState('');

  useEffect(() => {
    let active = true;
    nbAdminService.introFeedback(introId)
      .then((v) => { if (active) setView(v); })
      .catch((e) => { if (active) setError(nbErrorMessage(e, 'Sonuç bilgisi alınamadı.')); });
    return () => { active = false; };
  }, [introId]);

  const apply = (v: NbIntroFeedbackView) => {
    setView(v);
    onChanged?.(v);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(nbErrorMessage(e, 'İşlem tamamlanamadı.'));
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    if (c.kind === 'send') {
      void run(async () => {
        const r = await nbAdminService.sendIntroFeedback(introId, c.memberIds);
        apply(r.view);
        const failed = r.results.filter((x) => !x.sent);
        const sent = r.results.length - failed.length;
        if (failed.length) {
          const names = (id: string) => r.view.sides.find((s) => s.memberId === id)?.companyName ?? 'Taraf';
          setError(failed.map((f) => `${names(f.memberId)}: ${f.error}`).join(' · '));
        }
        if (sent) setNotice(sent === 2 ? 'Soru iki tarafa da gönderildi.' : 'Soru gönderildi.');
      });
    } else {
      void run(async () => {
        apply(await nbAdminService.remindIntroFeedback(introId, c.memberId));
        setNotice('Hatırlatma gönderildi.');
      });
    }
  };

  const saveRecord = () => {
    if (!recordFor) return;
    const memberId = recordFor;
    void run(async () => {
      apply(await nbAdminService.recordIntroFeedback(introId, {
        memberId,
        answer: recordAnswer,
        note: recordNote.trim() || undefined,
      }));
      setRecordFor(null);
      setRecordNote('');
      setNotice('Cevap kaydedildi.');
    });
  };

  if (!view && !error) {
    return <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={18} /></Stack>;
  }
  if (!view) return <Alert severity="error">{error}</Alert>;

  const sendableIds = view.sides.filter((s) => s.sendable).map((s) => s.memberId);
  const early = view.suggestedAskAt && new Date(view.suggestedAskAt).getTime() > Date.now();
  const nameOf = (id: string) => view.sides.find((s) => s.memberId === id)?.companyName ?? 'Üye';

  return (
    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${nb.divider}` }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ ...nbType.label, color: nb.textFaint }}>Sonuç takibi</Typography>
          <Typography sx={{ fontSize: 12, color: nb.textMuted }}>
            {early
              ? `Önerilen gönderim tarihi: ${formatDate(view.suggestedAskAt!)}. Sonuç daha önce öğrenildiyse soru erken de gönderilebilir.`
              : 'Taraflara "Bu tanışma bir iş veya iş birliğiyle sonuçlandı mı?" sorusu e-postayla gönderilir; cevap tek tıklamayla verilir.'}
          </Typography>
        </Box>
        {canManage && sendableIds.length === 2 && (
          <Button
            size="small"
            disableElevation
            disabled={busy}
            onClick={() => setConfirm({ kind: 'send', memberIds: sendableIds })}
            sx={{ ...(nbSecondaryBtn as object), flexShrink: 0 }}
          >
            Her iki tarafa gönder
          </Button>
        )}
      </Stack>

      {view.conflict && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 1, py: 0 }}>
          Cevaplar birbiriyle veya kayıtlı durumla uyuşmuyor. Taraflarla görüştükten sonra durumu elle güncelleyin.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 1, py: 0 }} onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 1, py: 0 }} onClose={() => setNotice(null)}>{notice}</Alert>}

      <Stack spacing={1}>
        {view.sides.map((side) => {
          const f = side.feedback;
          const badge = feedbackSideBadge(sideState(side), f?.answer);
          const remindAt = f?.remindAvailableAt ? new Date(f.remindAvailableAt) : null;
          const remindOpen = remindAt != null && remindAt.getTime() <= Date.now();
          return (
            <Box
              key={side.memberId}
              sx={{ p: 1.25, borderRadius: `${nbRadius.control}px`, bgcolor: nb.inputBg, border: `1px solid ${nb.border}` }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: nb.text }}>
                      {side.memberId === focusMemberId ? 'Bu üye' : side.companyName ?? 'Üye'}
                    </Typography>
                    <NbPill label={badge.label} tone={badge.tone} />
                  </Stack>
                  <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mt: 0.25 }}>
                    {!f
                      ? side.sendable ? 'Soru gönderilmedi.' : side.blockReason
                      : [
                          f.channel === 'ADMIN' ? null : `Soruldu ${formatDate(f.askedAt)}`,
                          f.remindedAt ? `hatırlatıldı ${formatDate(f.remindedAt)}` : null,
                          f.answeredAt ? `cevap ${formatDate(f.answeredAt)}${f.answerChannel ? ` (${ANSWER_CHANNEL_LABEL[f.answerChannel]})` : ''}` : null,
                          !f.answer && !f.closed ? `${formatDate(f.closesAt)} tarihine kadar açık` : null,
                        ].filter(Boolean).join(' · ')}
                  </Typography>
                  {f?.note && (
                    <Typography sx={{ fontSize: 12.5, color: nb.text, mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      “{f.note}”
                    </Typography>
                  )}
                </Box>
                {canManage && (
                  <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
                    {side.sendable && (
                      <Button size="small" disabled={busy} onClick={() => setConfirm({ kind: 'send', memberIds: [side.memberId] })} sx={{ textTransform: 'none' }}>
                        Soru gönder
                      </Button>
                    )}
                    {remindAt && (
                      <Tooltip title={remindOpen ? '' : `${formatDate(remindAt.toISOString())} tarihinde açılır`} arrow>
                        <span>
                          <Button size="small" disabled={busy || !remindOpen} onClick={() => setConfirm({ kind: 'remind', memberId: side.memberId })} sx={{ textTransform: 'none' }}>
                            Hatırlat
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                    <Button
                      size="small"
                      disabled={busy}
                      onClick={() => {
                        setRecordFor(recordFor === side.memberId ? null : side.memberId);
                        setRecordAnswer(f?.answer ?? 'WON');
                        setRecordNote(f?.note ?? '');
                      }}
                      sx={{ textTransform: 'none', color: nb.textMuted }}
                    >
                      {f?.answer ? 'Cevabı düzelt' : 'Cevabı elle kaydet'}
                    </Button>
                  </Stack>
                )}
              </Stack>

              {recordFor === side.memberId && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.25 }} alignItems={{ sm: 'flex-start' }}>
                  <TextField
                    select
                    size="small"
                    label="Üyenin cevabı"
                    value={recordAnswer}
                    onChange={(e) => setRecordAnswer(e.target.value as NbFeedbackAnswer)}
                    sx={{ minWidth: 170, bgcolor: '#fff' }}
                  >
                    {(Object.keys(NB_FEEDBACK_ANSWER_LABEL) as NbFeedbackAnswer[]).map((a) => (
                      <MenuItem key={a} value={a}>{NB_FEEDBACK_ANSWER_LABEL[a]}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label="Not (isteğe bağlı)"
                    placeholder="Ör. Telefonla görüşüldü, teklif aşamasında."
                    value={recordNote}
                    onChange={(e) => setRecordNote(e.target.value)}
                    inputProps={{ maxLength: 2000 }}
                    multiline
                    fullWidth
                    sx={{ bgcolor: '#fff' }}
                  />
                  <Button variant="contained" disableElevation disabled={busy} onClick={saveRecord} sx={{ textTransform: 'none', bgcolor: nb.navy, flexShrink: 0, '&:hover': { bgcolor: nb.navySoft } }}>
                    Kaydet
                  </Button>
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>

      <Dialog open={confirm != null} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm?.kind === 'remind' ? 'Hatırlatma gönderilsin mi?' : 'Sonuç sorusu gönderilsin mi?'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14 }}>
            {confirm?.kind === 'remind'
              ? `${nameOf(confirm.memberId)} tarafına tek seferlik hatırlatma e-postası gönderilecektir. İkinci hatırlatma gönderilmez.`
              : confirm?.kind === 'send'
                ? `${confirm.memberIds.map(nameOf).join(' ve ')} tarafına sonuç sorusu e-postası gönderilecektir. Gönderilen e-posta geri alınamaz.`
                : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} sx={{ textTransform: 'none' }}>Vazgeç</Button>
          <Button variant="contained" disableElevation onClick={doConfirm} sx={{ textTransform: 'none', bgcolor: nb.navy, '&:hover': { bgcolor: nb.navySoft } }}>
            Gönder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
