import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Checkbox, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { nb, nbRadius, nbType } from '../../theme/nbBrand';
import { nbFormatPhone, nbTelLink, nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
import { nbOpsService, NB_NOTE_KIND_LABEL, type NbNote, type NbNoteKind } from '../../services/nartbusiness/nbOpsService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { relativeDate } from '../../utils/nbDisplay';
import { nbChip } from './ui';

/** Uygulama kullanımı: null = veri alınamadı (sayı uydurulmaz, "—" gösterilir). */
export type NbLastActive = { kind: 'never' } | { kind: 'at'; at: string } | null;

const QUICK_KINDS: NbNoteKind[] = ['CALL', 'NOTE', 'MEETING'];

/**
 * Üye detayının sağ panelindeki "Hızlı işlemler" kartı.
 *
 * Üyeye yapılan en sık işler (aramak, yazmak, görüşmeyi not etmek, görevi
 * kapatmak) eskiden üç ayrı yerdeydi: telefon Genel sekmesinin
 * ortasında, mail ve bildirim "İşlemler" menüsünde, not ayrı sekmede. Üyeyle
 * telefonda konuşan admin notunu yazmak için sekme değiştiriyor, çoğu zaman
 * da yazmıyordu. Kart her sekmede görünür. "Tanıştır" başlıkta kalıyor;
 * iki yerde durması gürültü.
 */
export default function NbMemberActionRail({
  memberId,
  contactName,
  phone,
  email,
  lastActive,
  whatsAppText,
  onEmail,
  onPush,
  onOpenNotes,
  onToast,
  refreshKey,
  onOpenTasks,
}: {
  memberId: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  lastActive: NbLastActive;
  whatsAppText?: string;
  onEmail: () => void;
  onPush: () => void;
  onOpenNotes: () => void;
  onToast: (message: string) => void;
  /** Notlar sekmesinde değişiklik olunca görev listesi tazelensin. */
  refreshKey?: number;
  /** Açık görev sayısı; sekme etiketinde gösterilir. */
  onOpenTasks?: (count: number) => void;
}) {
  const [tasks, setTasks] = useState<NbNote[]>([]);
  const [kind, setKind] = useState<NbNoteKind>('CALL');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const reportTasks = useRef(onOpenTasks);
  reportTasks.current = onOpenTasks;

  const loadTasks = useCallback(async () => {
    try {
      const all = await nbOpsService.notes(memberId);
      const open = all
        .filter((n) => n.kind === 'TASK' && !n.doneAt)
        .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'));
      setTasks(open);
      reportTasks.current?.(open.length);
    } catch {
      // Görev listesi yardımcı bilgi; alınamazsa kart yine çalışır.
      setTasks([]);
    }
  }, [memberId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks, refreshKey]);

  const tel = nbTelLink(phone);
  const wa = nbWhatsAppLink(phone, whatsAppText);

  const saveNote = async () => {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    setError(null);
    try {
      await nbOpsService.addNote(memberId, { kind, body: text });
      setBody('');
      onToast(`${NB_NOTE_KIND_LABEL[kind]} kaydı eklendi.`);
    } catch (e) {
      setError(nbErrorMessage(e, 'Not kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async (task: NbNote) => {
    setTasks((list) => list.filter((t) => t.id !== task.id));
    try {
      await nbOpsService.updateNote(task.id, { done: true });
      onToast('Görev tamamlandı.');
    } catch (e) {
      setError(nbErrorMessage(e, 'Görev güncellenemedi.'));
    } finally {
      void loadTasks();
    }
  };

  const action = (label: string, icon: React.ReactNode, props: { href?: string | null; onClick?: () => void; disabled?: boolean; hint?: string }) => {
    const disabled = props.disabled || (!props.href && !props.onClick);
    const button = (
      <Button
        disableElevation
        startIcon={icon}
        disabled={disabled}
        {...(props.href
          ? ({ href: props.href, ...(props.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {}) } as object)
          : {})}
        onClick={props.onClick}
        sx={{
          justifyContent: 'flex-start',
          border: `1px solid ${nb.border}`,
          bgcolor: '#fff',
          color: nb.text,
          borderRadius: `${nbRadius.control}px`,
          fontSize: 12.5,
          textTransform: 'none',
          px: 1.25,
          py: 0.875,
          '& .MuiButton-startIcon': { mr: 0.75, color: nb.textMuted },
          '&:hover': { bgcolor: nb.inputBg },
        }}
      >
        {label}
      </Button>
    );
    return disabled && props.hint ? (
      <Tooltip key={label} title={props.hint} arrow><span style={{ display: 'grid' }}>{button}</span></Tooltip>
    ) : (
      <Box key={label} sx={{ display: 'grid' }}>{button}</Box>
    );
  };

  const now = Date.now();

  return (
    <Paper
      elevation={0}
      sx={{ bgcolor: nb.surface, border: `1px solid ${nb.border}`, borderRadius: `${nbRadius.card}px`, px: 2, py: 1.75 }}
    >
      <Typography sx={{ ...nbType.label, letterSpacing: '0.14em', color: nb.textFaint }}>HIZLI İŞLEMLER</Typography>

      <Box sx={{ mt: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: nb.text }}>{contactName || 'Ad bilgisi yok'}</Typography>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
          <Typography sx={{ fontSize: 12, color: nb.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            {phone ? nbFormatPhone(phone) : 'Telefon yok'}
          </Typography>
        </Stack>
        {email && (
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <Typography sx={{ fontSize: 12, color: nb.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </Typography>
            <Tooltip title="E-postayı kopyala" arrow>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(email).then(() => onToast('E-posta kopyalandı.')).catch(() => {});
                }}
                sx={{ border: 0, bgcolor: 'transparent', cursor: 'pointer', p: 0.25, color: nb.textFaint, display: 'flex' }}
              >
                <ContentCopyIcon sx={{ fontSize: 13 }} />
              </Box>
            </Tooltip>
          </Stack>
        )}
        <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mt: 0.5 }}>
          Uygulama:{' '}
          {lastActive == null
            ? '—'
            : lastActive.kind === 'never'
              ? <Box component="span" sx={{ color: nb.red, fontWeight: 600 }}>hiç açılmadı</Box>
              : `son açılış ${relativeDate(lastActive.at)}`}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mt: 1.5 }}>
        {action('Ara', <CallOutlinedIcon fontSize="small" />, { href: tel, hint: 'Telefon numarası yok' })}
        {action('WhatsApp', <WhatsAppIcon fontSize="small" />, { href: wa, hint: 'Telefon numarası okunamadı' })}
        {action('E-posta', <EmailOutlinedIcon fontSize="small" />, { onClick: onEmail })}
        {action('Bildirim', <NotificationsActiveOutlinedIcon fontSize="small" />, { onClick: onPush })}
      </Box>

      {/* Hızlı not: telefonu kapatan admin, sekme değiştirmeden yazsın. */}
      <Box sx={{ mt: 1.75, pt: 1.5, borderTop: `1px solid ${nb.divider}` }}>
        <Stack direction="row" spacing={0.5} sx={{ mb: 0.875 }}>
          {QUICK_KINDS.map((k) => (
            <Box key={k} component="button" type="button" onClick={() => { setKind(k); noteRef.current?.focus(); }} sx={nbChip(kind === k)}>
              {NB_NOTE_KIND_LABEL[k]}
            </Box>
          ))}
        </Stack>
        <TextField
          inputRef={noteRef}
          size="small"
          fullWidth
          multiline
          minRows={2}
          placeholder={kind === 'CALL' ? 'Görüşme özeti' : kind === 'MEETING' ? 'Görüşmenin sonucu' : 'Not'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void saveNote();
          }}
          inputProps={{ maxLength: 4000 }}
          sx={{ bgcolor: '#fff', '& textarea': { fontSize: 12.5 } }}
        />
        {error && <Typography sx={{ fontSize: 11.5, color: nb.red, mt: 0.5 }}>{error}</Typography>}
        <Stack direction="row" alignItems="center" sx={{ mt: 0.75 }}>
          <Typography sx={{ fontSize: 10.5, color: nb.textFaint }}>⌘/Ctrl + Enter</Typography>
          <Button
            size="small"
            disableElevation
            variant="contained"
            disabled={saving || !body.trim()}
            onClick={() => void saveNote()}
            sx={{ ml: 'auto', textTransform: 'none', bgcolor: nb.navy, fontSize: 12, '&:hover': { bgcolor: nb.navySoft } }}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </Stack>
      </Box>

      {/* Açık görevler: en yakın vadeli üçü. Tamamı Notlar sekmesinde. */}
      <Box sx={{ mt: 1.5, pt: 1.25, borderTop: `1px solid ${nb.divider}` }}>
        <Stack direction="row" alignItems="center">
          <Typography sx={{ ...nbType.label, color: nb.textFaint }}>Açık görevler</Typography>
          <Button size="small" onClick={onOpenNotes} sx={{ ml: 'auto', textTransform: 'none', fontSize: 11.5, p: 0, minWidth: 0 }}>
            {tasks.length > 3 ? `Tümü (${tasks.length})` : 'Görev ekle'}
          </Button>
        </Stack>
        {tasks.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: nb.textFaint, mt: 0.5 }}>Açık görev yok.</Typography>
        ) : (
          <Stack sx={{ mt: 0.25 }}>
            {tasks.slice(0, 3).map((t) => {
              const overdue = t.dueAt != null && new Date(t.dueAt).getTime() < now;
              return (
                <Stack key={t.id} direction="row" alignItems="flex-start" spacing={0.5}>
                  <Checkbox size="small" sx={{ p: 0.5 }} onChange={() => void completeTask(t)} inputProps={{ 'aria-label': 'Görevi tamamla' }} />
                  <Box sx={{ minWidth: 0, pt: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, color: nb.text, lineHeight: 1.4 }}>{t.body}</Typography>
                    {t.dueAt && (
                      <Typography sx={{ fontSize: 11, color: overdue ? nb.red : nb.textFaint, fontWeight: overdue ? 600 : 400 }}>
                        {/* relativeDate geleceği "-3 gün önce" diye yazıyor; vade ileri tarihli. */}
                        {overdue ? 'Gecikti · ' : 'Son tarih '}
                        {new Date(t.dueAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
