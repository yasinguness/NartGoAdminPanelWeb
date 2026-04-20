import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Grid, Card, CardContent, CardActions, Chip, CircularProgress, IconButton,
  alpha, useTheme, TextField, Select, MenuItem, FormControl, InputLabel,
  Divider, Alert, AlertTitle,
} from '@mui/material';
import {
  Close as CloseIcon, EventSeat as SeatIcon, Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  seatTemplateService, SeatTemplate, SeatTemplateCategory,
} from '../../../services/ticket/seatTemplateService';
import { seatService } from '../../../services/ticket/seatService';

interface CurrentSeatStats {
  rows: number;
  totalSeats: number;
  available: number;
  blocked: number;
}

interface TicketType {
  id: string;
  name: string;
}

interface TemplateSelectorModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  ticketTypes: TicketType[];
  onApplied: (created: number) => void;
}

/** Küçük grid preview */
const MiniGrid: React.FC<{ rows: { name: string; seatCount: number }[]; categories?: SeatTemplateCategory[] }> = ({ rows, categories }) => {
  const theme = useTheme();
  if (!rows?.length) return null;

  const getColor = (rowName: string) => {
    if (!categories) return theme.palette.primary.main;
    const cat = categories.find(c => c.rows?.includes(rowName));
    return cat?.color || theme.palette.primary.main;
  };

  return (
    <Box sx={{ py: 0.5 }}>
      {rows.slice(0, 8).map((row) => (
        <Box key={row.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mb: 0.3 }}>
          <Typography variant="caption" sx={{ width: 20, fontSize: 8, color: 'text.disabled', textAlign: 'right' }}>
            {row.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: '1px' }}>
            {Array.from({ length: Math.min(row.seatCount, 20) }).map((_, i) => (
              <Box key={i} sx={{
                width: 5, height: 5, borderRadius: '1px',
                bgcolor: alpha(getColor(row.name), 0.5),
              }} />
            ))}
          </Box>
        </Box>
      ))}
      {rows.length > 8 && (
        <Typography variant="caption" sx={{ fontSize: 8, color: 'text.disabled', ml: 2.5 }}>
          +{rows.length - 8} sira
        </Typography>
      )}
    </Box>
  );
};

export default function TemplateSelectorModal({
  open, onClose, eventId, ticketTypes, onApplied,
}: TemplateSelectorModalProps) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [templates, setTemplates] = useState<SeatTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SeatTemplate | null>(null);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentStats, setCurrentStats] = useState<CurrentSeatStats | null>(null);

  // Kategori-TicketType eşleştirme
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    seatTemplateService.listTemplates()
      .then(res => {
        if (res.success) setTemplates(res.data || []);
      })
      .catch(() => enqueueSnackbar('Şablonlar yüklenemedi', { variant: 'error' }))
      .finally(() => setLoading(false));

    // Mevcut seat map'i yükle (uyarı diyaloğunda göstermek için)
    if (eventId) {
      seatService.getSeatMap(eventId)
        .then(res => {
          const data = res?.data;
          if (!data || !data.categories?.length) { setCurrentStats(null); return; }
          let rows = 0, available = 0, blocked = 0, occupied = 0;
          data.categories.forEach(cat => {
            rows += cat.rows?.length || 0;
            cat.rows?.forEach(r => {
              available += r.availableSeats?.length || 0;
              occupied += r.occupiedSeats?.length || 0;
              blocked += r.blockedSeats?.length || 0;
            });
          });
          const totalSeats = available + occupied + blocked;
          setCurrentStats({ rows, totalSeats, available, blocked: blocked + occupied });
        })
        .catch(() => setCurrentStats(null));
    }
  }, [open, eventId]);

  // Seçilen şablonun kategorileri
  const selectedCategories = selected?.layout?.categories || [];

  const handleSelect = (tpl: SeatTemplate) => {
    setSelected(tpl);
    // Default mapping: ilk ticket type'ı ata
    const defaultMapping: Record<string, string> = {};
    const cats = tpl.layout?.categories || [];
    cats.forEach(cat => {
      if (ticketTypes.length > 0) {
        defaultMapping[cat.name] = ticketTypes[0].id;
      }
    });
    setMapping(defaultMapping);
  };

  const handleApplyClick = () => {
    if (!selected || !eventId) return;
    // Mevcut koltuklar varsa önce onay iste
    if (currentStats && currentStats.totalSeats > 0) {
      setConfirmOpen(true);
    } else {
      void performApply();
    }
  };

  const performApply = async () => {
    if (!selected || !eventId) return;

    setApplying(true);
    try {
      const res = await seatTemplateService.applyTemplate(eventId, {
        templateId: selected.id,
        categoryTicketTypeMapping: mapping,
      });
      if (res.success) {
        enqueueSnackbar(`${res.data.created} koltuk oluşturuldu`, { variant: 'success' });
        onApplied(res.data.created);
        setConfirmOpen(false);
        onClose();
      } else {
        enqueueSnackbar(res.message || 'Uygulama hatası', { variant: 'error' });
      }
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Şablon uygulama hatası', { variant: 'error' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Kayıtlı Plandan Seç</Typography>
          <Typography variant="body2" color="text.secondary">
            Salon planı şablonu seçin ve etkinliğe uygulayın
          </Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : templates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <SeatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">Kayıtlı salon planı bulunamadı</Typography>
            <Typography variant="body2" color="text.disabled">
              Önce Salon Planları sayfasından bir plan oluşturun
            </Typography>
          </Box>
        ) : (
          <>
            {/* Şablon seçimi */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {templates.map((tpl) => (
                <Grid item xs={12} sm={6} md={4} key={tpl.id}>
                  <Card
                    onClick={() => handleSelect(tpl)}
                    sx={{
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selected?.id === tpl.id ? 'primary.main' : 'divider',
                      transition: 'all 0.2s',
                      position: 'relative',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    {selected?.id === tpl.id && (
                      <CheckIcon sx={{
                        position: 'absolute', top: 8, right: 8,
                        color: 'primary.main', fontSize: 20,
                      }} />
                    )}
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {tpl.name}
                      </Typography>
                      <Chip
                        icon={<SeatIcon sx={{ fontSize: 12 }} />}
                        label={`${tpl.totalSeats || '?'} koltuk`}
                        size="small" variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                      <MiniGrid
                        rows={tpl.layout?.rows || []}
                        categories={tpl.layout?.categories}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Seçilen şablon detay + mapping */}
            {selected && selectedCategories.length > 0 && (
              <>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Kategori - Bilet Türü Eşleştirme
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Her kategoriyi bir bilet türüyle eşleştirin
                </Typography>

                {selectedCategories.map((cat) => (
                  <Box key={cat.name} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Box sx={{
                      width: 16, height: 16, borderRadius: 1,
                      bgcolor: cat.color, flexShrink: 0,
                    }} />
                    <Typography variant="body2" sx={{ width: 140 }}>{cat.name}</Typography>
                    <Chip size="small" label={`${cat.rows?.length || 0} sıra`} variant="outlined" />
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Bilet Türü</InputLabel>
                      <Select
                        value={mapping[cat.name] || ''}
                        label="Bilet Türü"
                        onChange={(e) => setMapping(prev => ({ ...prev, [cat.name]: e.target.value }))}
                      >
                        {ticketTypes.map(tt => (
                          <MenuItem key={tt.id} value={tt.id}>{tt.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                ))}
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>İptal</Button>
        <Button
          variant="contained"
          onClick={handleApplyClick}
          disabled={!selected || applying}
          startIcon={applying ? <CircularProgress size={18} /> : <CheckIcon />}
        >
          {applying ? 'Uygulanıyor...' : 'Uygula'}
        </Button>
      </DialogActions>

      {/* Onay diyaloğu — mevcut layout varsa */}
      <Dialog open={confirmOpen} onClose={() => !applying && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700 }}>
          <WarningIcon sx={{ color: 'warning.main' }} />
          Layout Değişecek
        </DialogTitle>
        <DialogContent dividers>
          {currentStats && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Mevcut durum:</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  • {currentStats.rows} sıra, {currentStats.totalSeats} koltuk
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • {currentStats.available} açık, {currentStats.blocked} kapalı
                </Typography>
              </Box>
            </Box>
          )}
          {selected && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Yeni layout:</Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  • {selected.layout?.rows?.length || 0} sıra, {selected.totalSeats || 0} koltuk
                </Typography>
              </Box>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Koltuklar silinmez</AlertTitle>
            Backend koltuğu silmez, yalnızca yeni layout'ta olmayan koltukları
            BLOCKED'a çevirir. İstediğin zaman UNBLOCK edebilirsin.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={applying}>İptal</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={performApply}
            disabled={applying}
            startIcon={applying ? <CircularProgress size={18} /> : undefined}
          >
            {applying ? 'Uygulanıyor...' : 'Devam Et'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
