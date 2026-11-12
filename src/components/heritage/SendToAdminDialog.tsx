import { useState } from 'react';
import { Alert, Button, Chip, Tooltip, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { heritageAdminRequestService, type AdminRequestKind, type AdminRequestTarget } from '../../services/heritageEditorService';
import { errorText } from '../../services/heritageReviewService';

/**
 * Köy Editörü yetkisi dışındaki kararı gerekçesiyle yöneticiye gönderir
 * (teyitli kaydı kaldırma, halklar arası birleştirme, köyü kaldırma). Bkz. docs/plan/nartgo-koy-editoru.md
 */
export default function SendToAdminDialog({ open, kind, target, subject, onClose, onSent }: {
  open: boolean;
  kind: AdminRequestKind;
  target: string;
  /** Pencerede ne gönderildiğini anlatan kısa satır, ör. "Kaçmaz (Abhaz) ve Kaçmaz (Çerkes)". */
  subject: string;
  onClose: () => void;
  onSent: (alreadyOpen: boolean) => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setBusy(true); setError('');
    try {
      const r = await heritageAdminRequestService.send(kind, target, note.trim());
      setNote('');
      onSent(r.alreadyOpen);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Yöneticiye gönder</DialogTitle>
      <DialogContent>
        <Typography fontWeight={600} sx={{ mb: 1 }}>{subject}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Bu kararı yalnız yönetici verebilir. Ne yapılmasını önerdiğinizi ve nedenini yazın; yönetici kaydı açtığında bu notu görür.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField autoFocus fullWidth multiline minRows={3} label="Öneriniz ve gerekçeniz" value={note}
          onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 1000 }}
          helperText="Örnek: İki kayıt aynı aile, Abhaz kaydı yanlışlıkla açılmış. Birleştirilmesini öneriyorum." />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Vazgeç</Button>
        <Button variant="contained" onClick={send} disabled={busy || note.trim().length < 5}>Gönder</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Gönderilmiş talebin durumu: "Yöneticide Bekliyor" ya da geri çevirme nedeni. */
export function AdminRequestBadge({ value }: { value?: AdminRequestTarget }) {
  if (!value) return null;
  if (value.status === 'open') return <Chip size="small" color="info" variant="outlined" label="Yöneticide Bekliyor" />;
  return (
    <Tooltip title={value.resolvedNote || ''}>
      <Chip size="small" color="default" variant="outlined" label={`Yönetici Geri Çevirdi${value.resolvedNote ? ': ' + value.resolvedNote.slice(0, 60) : ''}`} />
    </Tooltip>
  );
}
