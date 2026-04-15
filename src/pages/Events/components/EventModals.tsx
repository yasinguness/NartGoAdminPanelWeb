/**
 * EventModals — Confirmation modals for event actions
 *
 * Contains: PauseModal, CancelModal, DeleteModal, NotificationModal, CapacityModal, CloseSalesModal, EditEventModal
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  CircularProgress,
  Box,
  alpha,
  Stack,
  IconButton,
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import GooglePlacesInput, { type AddressValue } from '../../../components/GooglePlacesInput';
import {
  Close as CloseIcon,
  PauseCircle as PauseIcon,
  Cancel as CancelIcon,
  DeleteForever as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// ─── PAUSE MODAL ────────────────────────────────────────────
interface PauseModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
  loading?: boolean;
}

const pauseReasons = [
  'Teknik sorun',
  'Mekan değişikliği',
  'İçerik güncellemesi',
  'Geçici kapasite durdurma',
];

export function PauseModal({ open, onClose, onConfirm, loading }: PauseModalProps) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm(reason, note);
    setReason('');
    setNote('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PauseIcon sx={{ color: 'warning.main' }} />
          <Typography variant="h6" fontWeight={800}>Etkinliği Duraklat</Typography>
        </Stack>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{
          bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.warning.main, 0.3),
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}>
          <Typography variant="body2" color="warning.dark">
            <strong>⚠ Dikkat:</strong> Etkinliği duraklatırsanız yeni bilet satışları durur. Mevcut biletler geçerli kalmaya devam eder.
          </Typography>
        </Box>
        <TextField
          fullWidth
          select
          label="Durdurma Sebebi *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="" disabled>Seçin...</MenuItem>
          {pauseReasons.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Ek Not (opsiyonel)"
          placeholder="Katılımcılara iletilecek mesaj..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!reason || loading}
          sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
        >
          {loading ? 'İşleniyor...' : 'Etkinliği Duraklat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── CANCEL MODAL ───────────────────────────────────────────
interface CancelModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  eventName: string;
  participantCount: number;
  loading?: boolean;
}

const cancelReasons = [
  'Organizatör kararı',
  'Mekan iptal etti',
  'Yeterli katılım yok',
  'Mücbir sebep',
];

export function CancelModal({ open, onClose, onConfirm, eventName, participantCount, loading }: CancelModalProps) {
  const [reason, setReason] = useState('');
  const [confirmName, setConfirmName] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
    setConfirmName('');
  };

  const isValid = reason && confirmName === eventName;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={800} color="error.main">✕ Etkinliği İptal Et</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{
          bgcolor: (t) => alpha(t.palette.error.main, 0.08),
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.error.main, 0.24),
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}>
          <Typography variant="body2" color="error.dark">
            <strong>⛔ Bu işlem geri alınamaz.</strong> {participantCount} katılımcıya otomatik iade ve bildirim gönderilecek.
          </Typography>
        </Box>
        <TextField
          fullWidth
          select
          label="İptal Sebebi *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="" disabled>Seçin...</MenuItem>
          {cancelReasons.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField
          fullWidth
          label="Onay için etkinlik adını yazın"
          placeholder={eventName}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          helperText={confirmName && confirmName !== eventName ? 'Etkinlik adı eşleşmiyor' : ''}
          error={!!confirmName && confirmName !== eventName}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={!isValid || loading}
        >
          {loading ? 'İşleniyor...' : 'Etkinliği İptal Et'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── DELETE MODAL (Akıllı — satış kontrolü yapar) ───────────
interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  /** Satış yoksa: soft delete. Satış varsa: cancel + refund */
  onConfirm: (action: 'delete' | 'cancel', reason?: string) => void;
  loading?: boolean;
  eventName: string;
  /** Ödeme tamamlanmış sipariş sayısı */
  paidOrderCount: number;
  /** Toplam bilet sayısı */
  ticketCount: number;
  /** Toplam gelir */
  totalRevenue: number;
}

const deleteReasons = [
  'Organizatör kararı',
  'Mekan iptal etti',
  'Yeterli katılım yok',
  'Mücbir sebep',
];

export function DeleteModal({ open, onClose, onConfirm, loading, eventName, paidOrderCount, ticketCount, totalRevenue }: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const hasPaidOrders = paidOrderCount > 0;

  useEffect(() => {
    if (!open) { setConfirmText(''); setReason(''); }
  }, [open]);

  const isValid = hasPaidOrders
    ? (reason && confirmText === eventName)
    : (confirmText === 'SİL');

  const handleConfirm = () => {
    if (hasPaidOrders) {
      onConfirm('cancel', reason);
    } else {
      onConfirm('delete');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {hasPaidOrders ? <WarningIcon sx={{ color: 'error.main' }} /> : <DeleteIcon sx={{ color: 'error.main' }} />}
          <Typography variant="h6" fontWeight={800} color="error.main">
            {hasPaidOrders ? 'Etkinliği İptal Et ve İade Başlat' : 'Etkinliği Sil'}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        {hasPaidOrders ? (
          <>
            {/* Ücretli etkinlik — iade uyarısı */}
            <Box sx={{
              bgcolor: (t) => alpha(t.palette.error.main, 0.08),
              border: '1px solid',
              borderColor: (t) => alpha(t.palette.error.main, 0.24),
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}>
              <Typography variant="body2" color="error.dark" sx={{ mb: 1 }}>
                <strong>Bu etkinlikte satılmış bilet var.</strong> Silmeden önce tüm biletlerin iade edilmesi gerekiyor.
              </Typography>
              <Typography variant="body2" color="error.dark">
                Onayladığınızda aşağıdaki işlemler otomatik yapılacak:
              </Typography>
            </Box>

            {/* İade özeti */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 2.5 }}>
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="error.main">{paidOrderCount}</Typography>
                <Typography variant="caption" color="text.secondary">Sipariş İade</Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="error.main">{ticketCount}</Typography>
                <Typography variant="caption" color="text.secondary">Bilet İptal</Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="error.main">₺{totalRevenue.toLocaleString('tr-TR')}</Typography>
                <Typography variant="caption" color="text.secondary">Toplam İade</Typography>
              </Box>
            </Box>

            {/* İşlem adımları */}
            <Box sx={{ mb: 2.5, pl: 1 }}>
              {[
                'Tüm bilet sahiplerine iyzico üzerinden iade yapılır',
                'Biletler iptal edilir, QR kodlar geçersizleşir',
                'Katılımcılara iptal bildirimi gönderilir',
                'Etkinlik İPTAL durumuna alınır (tarihsel kayıt kalır)',
              ].map((step, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 16 }}>{i + 1}.</Typography>
                  <Typography variant="body2" color="text.secondary" fontSize={13}>{step}</Typography>
                </Stack>
              ))}
            </Box>

            <TextField
              fullWidth select label="İptal Sebebi *" value={reason}
              onChange={(e) => setReason(e.target.value)} sx={{ mb: 2 }}
            >
              <MenuItem value="" disabled>Seçin...</MenuItem>
              {deleteReasons.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>

            <TextField
              fullWidth
              label="Onay için etkinlik adını yazın"
              placeholder={eventName}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              error={!!confirmText && confirmText !== eventName}
              helperText={confirmText && confirmText !== eventName ? 'Etkinlik adı eşleşmiyor' : ''}
            />
          </>
        ) : (
          <>
            {/* Satış yok — direkt silinebilir */}
            <Box sx={{
              bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
              border: '1px solid',
              borderColor: (t) => alpha(t.palette.warning.main, 0.24),
              borderRadius: 2,
              p: 2,
              mb: 3,
            }}>
              <Typography variant="body2" color="text.secondary">
                Bu etkinlikte satılmış bilet bulunmuyor. Güvenle silinebilir.
              </Typography>
            </Box>
            <TextField
              fullWidth
              label={<>Onaylamak için <strong>SİL</strong> yazın</>}
              placeholder="SİL"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={!isValid || loading}
        >
          {loading
            ? 'İşleniyor...'
            : hasPaidOrders
              ? `${paidOrderCount} Siparişi İade Et ve İptal Et`
              : 'Etkinliği Sil'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION MODAL — Katılımcılara toplu bildirim gönder
   ═══════════════════════════════════════════════════════════ */

interface NotificationModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (title: string, content: string, type: string) => Promise<void>;
  eventName: string;
  participantCount: number;
  loading?: boolean;
}

const NOTIFICATION_TYPES = [
  { value: 'EVENT_UPDATE', label: 'Etkinlik Güncellemesi', desc: 'Saat, mekan veya program değişikliği' },
  { value: 'EVENT_REMINDER', label: 'Hatırlatma', desc: 'Etkinlik yaklaşıyor hatırlatması' },
  { value: 'EVENT_INFO', label: 'Bilgilendirme', desc: 'Genel duyuru veya bilgi' },
  { value: 'EVENT_CANCELLED', label: 'İptal Bildirimi', desc: 'Etkinlik iptal edildi' },
  { value: 'EVENT_CUSTOM', label: 'Özel Mesaj', desc: 'Serbest içerikli bildirim' },
];

export function NotificationModal({ open, onClose, onSend, eventName, participantCount, loading }: NotificationModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('EVENT_INFO');

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) return;
    await onSend(title, content, type);
    setTitle('');
    setContent('');
    setType('EVENT_INFO');
  };

  const selectedType = NOTIFICATION_TYPES.find(t => t.value === type);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        Katılımcılara Bildirim Gönder
      </DialogTitle>
      <DialogContent>
        <Box sx={{ bgcolor: alpha('#3b82f6', 0.06), border: '1px solid', borderColor: alpha('#3b82f6', 0.15), borderRadius: 2, p: 1.5, mb: 2.5, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>{eventName}</strong> etkinliğindeki <strong>{participantCount}</strong> katılımcıya bildirim gönderilecek.
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          <TextField
            select fullWidth label="Bildirim Türü" value={type}
            onChange={e => setType(e.target.value)}
            helperText={selectedType?.desc}
          >
            {NOTIFICATION_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth label="Başlık" value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Örn: Etkinlik saati değişti"
            inputProps={{ maxLength: 100 }}
            helperText={`${title.length}/100`}
          />

          <TextField
            fullWidth label="İçerik" value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Katılımcıların göreceği mesaj içeriği..."
            multiline rows={4}
            inputProps={{ maxLength: 500 }}
            helperText={`${content.length}/500`}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={!title.trim() || !content.trim() || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? 'Gönderiliyor...' : `${participantCount} Kişiye Gönder`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CAPACITY MODAL — Kapasite güncelleme
   ═══════════════════════════════════════════════════════════ */

interface CapacityModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newCapacity: number) => Promise<void>;
  currentCapacity: number;
  currentParticipants: number;
  loading?: boolean;
}

export function CapacityModal({ open, onClose, onConfirm, currentCapacity, currentParticipants, loading }: CapacityModalProps) {
  const [capacity, setCapacity] = useState(String(currentCapacity));

  const newCap = parseInt(capacity) || 0;
  const isValid = newCap >= currentParticipants && newCap > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>Kapasite Güncelle</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, mt: 1 }}>
          <Box sx={{ flex: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={800}>{currentParticipants}</Typography>
            <Typography variant="caption" color="text.secondary">Mevcut Katılımcı</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={800}>{currentCapacity}</Typography>
            <Typography variant="caption" color="text.secondary">Mevcut Kapasite</Typography>
          </Box>
        </Box>

        <TextField
          fullWidth label="Yeni Kapasite" type="number" value={capacity}
          onChange={e => setCapacity(e.target.value)}
          error={!isValid && capacity !== ''}
          helperText={!isValid && capacity !== '' ? `Kapasite en az ${currentParticipants} (mevcut katılımcı sayısı) olmalı` : ''}
          inputProps={{ min: currentParticipants }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button onClick={() => onConfirm(newCap)} variant="contained" disabled={!isValid || loading}>
          {loading ? 'Güncelleniyor...' : 'Kapasiteyi Güncelle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CLOSE SALES MODAL — Satışları kapatma
   ═══════════════════════════════════════════════════════════ */

interface CloseSalesModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  eventName: string;
  loading?: boolean;
}

export function CloseSalesModal({ open, onClose, onConfirm, eventName, loading }: CloseSalesModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>Satışları Kapat</DialogTitle>
      <DialogContent>
        <Box sx={{ bgcolor: alpha('#f59e0b', 0.08), border: '1px solid', borderColor: alpha('#f59e0b', 0.2), borderRadius: 2, p: 1.5, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>{eventName}</strong> için yeni bilet satışları kapatılacak. Mevcut biletler geçerli kalmaya devam eder.
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
            Bu işlem geri alınabilir — satışları tekrar açabilirsiniz.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button onClick={onConfirm} variant="contained" color="warning" disabled={loading}>
          {loading ? 'İşleniyor...' : 'Satışları Kapat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EDIT EVENT MODAL — Etkinlik bilgilerini düzenle
   ═══════════════════════════════════════════════════════════ */

export interface EditEventData {
  name: string;
  description: string;
  eventTime: Date | null;
  endTime: Date | null;
  maxParticipants: number;
  ticketPrice: number;
  address: AddressValue | null;
  isRegistrationOpen: boolean;
  isPrivate: boolean;
  saleStartDate: Date | null;
  saleEndDate: Date | null;
  coverImage: File | null;
  currentImageUrl: string | null;
}

interface EditEventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: EditEventData) => Promise<void>;
  initialData: EditEventData;
  loading?: boolean;
  isPaid?: boolean;
  eventId?: string;
  seatingEnabled?: boolean;
}

export function EditEventModal({ open, onClose, onSave, initialData, loading, isPaid, eventId, seatingEnabled }: EditEventModalProps) {
  const [form, setForm] = useState<EditEventData>(initialData);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (open) { setForm(initialData); setActiveTab(0); }
  }, [open, initialData]);

  const update = (field: keyof EditEventData, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Etkinliği Düzenle
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Box sx={{ display: 'flex', gap: 0 }}>
          {['Genel', 'Tarih & Konum', 'Satış & Görsel'].map((label, i) => (
            <Button key={i} size="small" onClick={() => setActiveTab(i)}
              sx={{ textTransform: 'none', fontWeight: activeTab === i ? 700 : 400, color: activeTab === i ? 'primary.main' : 'text.secondary', borderBottom: activeTab === i ? '2px solid' : '2px solid transparent', borderColor: activeTab === i ? 'primary.main' : 'transparent', borderRadius: 0, px: 2, py: 1 }}>
              {label}
            </Button>
          ))}
        </Box>
      </Box>
      <DialogContent sx={{ minHeight: 320 }}>
        {/* Tab 0: Genel */}
        {activeTab === 0 && (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField fullWidth label="Etkinlik Adı" value={form.name}
              onChange={e => update('name', e.target.value)} />

            <TextField fullWidth label="Açıklama" value={form.description}
              onChange={e => update('description', e.target.value)}
              multiline rows={4} placeholder="Etkinlik hakkında detaylı bilgi..." />

            {isPaid ? (
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Kapasite: {form.maxParticipants} kişi</strong> — Biletli etkinliklerde kapasite, bilet kontenjanları toplamından belirlenir. Değiştirmek için Biletler sekmesinden kontenjanları düzenleyin.
                </Typography>
              </Box>
            ) : (
              <TextField fullWidth label="Kapasite" type="number" value={form.maxParticipants || ''}
                onChange={e => update('maxParticipants', parseInt(e.target.value, 10) || 0)}
                inputProps={{ min: 1 }} placeholder="Örn: 200" />
            )}
          </Stack>
        )}

        {/* Tab 1: Tarih & Konum */}
        {activeTab === 1 && (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <DateTimePicker label="Etkinlik Başlangıcı" value={form.eventTime}
                onChange={d => update('eventTime', d)} ampm={false}
                minDateTime={new Date()}
                slotProps={{ textField: { fullWidth: true } }} />
              <DateTimePicker label="Etkinlik Bitişi (opsiyonel)" value={form.endTime}
                onChange={d => update('endTime', d)} ampm={false}
                minDateTime={form.eventTime || undefined}
                slotProps={{ textField: { fullWidth: true, helperText: 'Belirtilmezse etkinlik süresiz kabul edilir' } }} />
            </LocalizationProvider>

            <GooglePlacesInput
              value={form.address}
              onChange={v => update('address', v)}
              label="Konum"
              size="medium"
              fullWidth
              showDetails
            />
          </Stack>
        )}

        {/* Tab 2: Satış & Görsel */}
        {activeTab === 2 && (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Kapak Görseli */}
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} sx={{ mb: 1, display: 'block' }}>
                Kapak Görseli
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {(form.coverImage || form.currentImageUrl) ? (
                  <Box sx={{ width: 120, height: 80, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative' }}>
                    <img
                      src={form.coverImage ? URL.createObjectURL(form.coverImage) : (form.currentImageUrl || '')}
                      alt="Kapak"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ width: 120, height: 80, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.disabled">Görsel yok</Typography>
                  </Box>
                )}
                <Stack spacing={1}>
                  <Button variant="outlined" size="small" component="label"
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                    {form.currentImageUrl || form.coverImage ? 'Değiştir' : 'Görsel Yükle'}
                    <input type="file" hidden accept="image/*"
                      onChange={e => { const f = e.target.files?.[0]; if (f) update('coverImage', f); }} />
                  </Button>
                  {(form.coverImage || form.currentImageUrl) && (
                    <Button variant="text" size="small" color="error"
                      onClick={() => { update('coverImage', null); update('currentImageUrl', null); }}
                      sx={{ textTransform: 'none', fontSize: 11 }}>
                      Kaldır
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* Satış Tarihleri */}
            {isPaid && (
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} sx={{ mb: 1.5, display: 'block' }}>
                  Bilet Satış Takvimi
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                  <Stack spacing={2}>
                    <DateTimePicker label="Satış Başlangıcı" value={form.saleStartDate}
                      onChange={d => update('saleStartDate', d)} ampm={false}
                      maxDateTime={form.eventTime || undefined}
                      slotProps={{ textField: { fullWidth: true, helperText: 'Bu tarihten önce bilet satın alınamaz' } }} />
                    <DateTimePicker label="Satış Bitişi" value={form.saleEndDate}
                      onChange={d => update('saleEndDate', d)} ampm={false}
                      minDateTime={form.saleStartDate || undefined}
                      maxDateTime={form.eventTime || undefined}
                      slotProps={{ textField: { fullWidth: true, helperText: 'Belirtilmezse etkinlik başlangıcına kadar açık kalır' } }} />
                  </Stack>
                </LocalizationProvider>
              </Box>
            )}

            {seatingEnabled && eventId && (
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} sx={{ mb: 1, display: 'block' }}>
                  Oturma Düzeni
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Bu etkinlik koltuklu düzende çalışıyor. Salon planı, kategori, sıra ve koltuk yapısını seat map ekranından düzenleyebilirsiniz.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  href={`/admin/events/${eventId}/seat-map`}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                >
                  Koltuk Düzenini Düzenle
                </Button>
              </Box>
            )}

            {/* Toggle'lar */}
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} sx={{ mb: 1, display: 'block' }}>
                Görünürlük
              </Typography>
              {[
                { key: 'isRegistrationOpen' as const, label: 'Bilet Satışı Açık', desc: 'Kapatırsanız yeni bilet satın alınamaz' },
                { key: 'isPrivate' as const, label: 'Gizli Etkinlik', desc: 'Sadece bağlantı ile erişilebilir' },
              ].map(toggle => (
                <Box key={toggle.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{toggle.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{toggle.desc}</Typography>
                  </Box>
                  <Box component="input" type="checkbox"
                    checked={Boolean(form[toggle.key])}
                    onChange={e => update(toggle.key, (e.target as HTMLInputElement).checked)}
                    sx={{ width: 18, height: 18, accentColor: '#16a34a', cursor: 'pointer' }} />
                </Box>
              ))}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button onClick={() => onSave(form)} variant="contained" disabled={!form.name.trim() || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
