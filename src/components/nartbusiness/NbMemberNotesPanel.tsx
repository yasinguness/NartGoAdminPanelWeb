/**
 * Üye notları, görüşmeleri ve görevleri. Deneme Merkezi'nin hafızası:
 * kim aradı, ne konuşuldu, sırada ne var. Otomatik görevler (deneme akışı,
 * tanıştırma takibi) "otomatik" etiketiyle görünür.
 */
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useCallback, useEffect, useState } from 'react';
import { nb } from '../../theme/nbBrand';
import {
  NB_NOTE_KIND_LABEL,
  nbOpsService,
  type NbNote,
  type NbNoteKind,
} from '../../services/nartbusiness/nbOpsService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { relativeDate } from '../../utils/nbDisplay';

const KINDS: NbNoteKind[] = ['CALL', 'MEETING', 'NOTE', 'TASK'];

function fmt(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** datetime-local girdisi için yerel "YYYY-MM-DDTHH:mm". */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NbMemberNotesPanel({
  memberId,
  onChanged,
}: {
  memberId: string;
  /** Görev kapanınca/eklenince üst ekran (ör. Deneme Merkezi satırı) yenilensin. */
  onChanged?: () => void;
}) {
  const [notes, setNotes] = useState<NbNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<NbNoteKind>('CALL');
  const [body, setBody] = useState('');
  const [outcome, setOutcome] = useState('');
  const [due, setDue] = useState(() => toLocalInput(new Date(Date.now() + 2 * 86400000)));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await nbOpsService.notes(memberId));
      setError(null);
    } catch (e) {
      setError(nbErrorMessage(e, 'Notlar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await nbOpsService.addNote(memberId, {
        kind,
        body: body.trim(),
        outcome: kind === 'CALL' || kind === 'MEETING' ? outcome.trim() || undefined : undefined,
        dueAt: kind === 'TASK' && due ? new Date(due).toISOString() : undefined,
      });
      setBody('');
      setOutcome('');
      await load();
      onChanged?.();
    } catch (e) {
      setError(nbErrorMessage(e, 'Kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (n: NbNote) => {
    try {
      await nbOpsService.updateNote(n.id, { done: !n.doneAt });
      await load();
      onChanged?.();
    } catch (e) {
      setError(nbErrorMessage(e, 'Görev güncellenemedi.'));
    }
  };

  const remove = async (n: NbNote) => {
    if (!window.confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) return;
    try {
      await nbOpsService.deleteNote(n.id);
      await load();
      onChanged?.();
    } catch (e) {
      setError(nbErrorMessage(e, 'Silinemedi.'));
    }
  };

  const open = notes.filter((n) => n.kind === 'TASK' && !n.doneAt);
  const history = notes.filter((n) => !(n.kind === 'TASK' && !n.doneAt));

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Yeni kayıt ─────────────────────────────────────────────── */}
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            select
            size="small"
            label="Tür"
            value={kind}
            onChange={(e) => setKind(e.target.value as NbNoteKind)}
            sx={{ minWidth: 130 }}
          >
            {KINDS.map((k) => (
              <MenuItem key={k} value={k}>
                {NB_NOTE_KIND_LABEL[k]}
              </MenuItem>
            ))}
          </TextField>
          {kind === 'TASK' && (
            <TextField
              size="small"
              type="datetime-local"
              label="Vade"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          )}
        </Stack>
        <TextField
          size="small"
          multiline
          minRows={2}
          label={kind === 'TASK' ? 'Görev' : 'Görüşme notu'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          inputProps={{ maxLength: 4000 }}
        />
        {(kind === 'CALL' || kind === 'MEETING') && (
          <TextField
            size="small"
            label="Sonuç (isteğe bağlı)"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />
        )}
        <Box>
          <Button variant="contained" size="small" disabled={saving || !body.trim()} onClick={add}>
            Kaydet
          </Button>
        </Box>
      </Stack>

      {loading && notes.length === 0 ? (
        <CircularProgress size={20} />
      ) : (
        <>
          <Typography sx={{ fontSize: 10, letterSpacing: '0.12em', color: nb.textFaint, fontWeight: 600, mb: 0.5 }}>
            AÇIK GÖREVLER ({open.length})
          </Typography>
          {open.length === 0 && (
            <Typography sx={{ fontSize: 12, color: nb.textFaint, mb: 1.5 }}>Açık görev yok.</Typography>
          )}
          {open.map((n) => {
            const overdue = n.dueAt && new Date(n.dueAt).getTime() < Date.now();
            return (
              <Stack key={n.id} direction="row" alignItems="flex-start" spacing={0.5} sx={{ py: 0.5 }}>
                <Checkbox size="small" checked={false} onChange={() => toggleDone(n)} sx={{ p: 0.5 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, lineHeight: 1.45 }}>{n.body}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: overdue ? nb.red : nb.textFaint }}>
                    {n.dueAt ? `vade ${fmt(n.dueAt)}${overdue ? ' · gecikti' : ''}` : 'vadesiz'}
                    {n.auto ? ' · sistem' : ''}
                  </Typography>
                </Box>
                <Tooltip title="Sil">
                  <IconButton size="small" onClick={() => remove(n)}>
                    <DeleteOutlineIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Stack>
            );
          })}

          <Typography
            sx={{ fontSize: 10, letterSpacing: '0.12em', color: nb.textFaint, fontWeight: 600, mt: 2, mb: 0.5 }}
          >
            GEÇMİŞ
          </Typography>
          {history.length === 0 && (
            <Typography sx={{ fontSize: 12, color: nb.textFaint }}>Henüz kayıt yok.</Typography>
          )}
          {history.map((n) => (
            <Box key={n.id} sx={{ py: 0.75, borderBottom: `1px solid ${nb.divider}` }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography sx={{ fontSize: 11, color: nb.textMuted, fontWeight: 600 }}>
                  {NB_NOTE_KIND_LABEL[n.kind]}
                  {n.kind === 'TASK' && n.doneAt ? ' · tamamlandı' : ''}
                  <Box component="span" sx={{ color: nb.textFaint, fontWeight: 400 }}>
                    {' · '}
                    {relativeDate(n.createdAt)}
                  </Box>
                </Typography>
                <Stack direction="row" spacing={0.25}>
                  {n.kind === 'TASK' && (
                    <Tooltip title="Yeniden aç">
                      <Checkbox size="small" checked onChange={() => toggleDone(n)} sx={{ p: 0.25 }} />
                    </Tooltip>
                  )}
                  <Tooltip title="Sil">
                    <IconButton size="small" onClick={() => remove(n)}>
                      <DeleteOutlineIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              <Typography sx={{ fontSize: 12.5, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{n.body}</Typography>
              {n.outcome && (
                <Typography sx={{ fontSize: 12, color: nb.green, mt: 0.25 }}>Sonuç: {n.outcome}</Typography>
              )}
            </Box>
          ))}
        </>
      )}
    </Box>
  );
}
