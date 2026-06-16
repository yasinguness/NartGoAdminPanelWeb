/**
 * SavedTemplatesPanel — Profil bazlı kayıtlı salon planı şablonları
 * Şablonlarım: kaydet, yükle, sil, yeniden adlandır
 */
import { useState, useEffect } from 'react';
import {
  Box, Typography, Stack, Button, IconButton, TextField, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  alpha, useTheme, CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon, Delete as DeleteIcon, Upload as LoadIcon,
  Add as AddIcon, FolderOpen as FolderIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ticketService } from '../../../services/ticket/ticketService';
import type { VenueConfig, SeatCategory, SavedVenueTemplate } from '../venueEngine';

interface SavedTemplatesPanelProps {
  currentVenue: VenueConfig;
  currentCategories: SeatCategory[];
  onLoadTemplate: (venue: VenueConfig, categories: SeatCategory[]) => void;
}

export default function SavedTemplatesPanel({
  currentVenue, currentCategories, onLoadTemplate,
}: SavedTemplatesPanelProps) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [templates, setTemplates] = useState<SavedVenueTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Load from localStorage (fallback) + API
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await ticketService.getSavedTemplates();
      if (res.data && res.data.length > 0) {
        setTemplates(res.data);
      } else {
        // Fallback: load from localStorage
        const local = localStorage.getItem('nartgo_seat_templates');
        if (local) setTemplates(JSON.parse(local));
      }
    } catch {
      // Fallback: localStorage
      const local = localStorage.getItem('nartgo_seat_templates');
      if (local) setTemplates(JSON.parse(local));
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const newTemplate: SavedVenueTemplate = {
        id: `tpl-${Date.now()}`,
        name: saveName.trim(),
        description: saveDesc.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        venue: currentVenue,
        categories: currentCategories,
      };

      // Save to API
      try {
        await ticketService.saveTemplate({
          name: newTemplate.name,
          description: newTemplate.description,
          venueData: { venue: currentVenue, categories: currentCategories },
        });
      } catch { /* API fail, save locally */ }

      // Also save locally
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      localStorage.setItem('nartgo_seat_templates', JSON.stringify(updated));

      enqueueSnackbar(`"${saveName}" şablonu kaydedildi`, { variant: 'success' });
      setSaveDialogOpen(false);
      setSaveName('');
      setSaveDesc('');
    } catch {
      enqueueSnackbar('Şablon kaydedilemedi', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await ticketService.deleteTemplate(id);
    } catch { /* ignore API failure */ }

    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('nartgo_seat_templates', JSON.stringify(updated));
    enqueueSnackbar('Şablon silindi', { variant: 'info' });
  };

  const handleLoad = (template: SavedVenueTemplate) => {
    onLoadTemplate(template.venue, template.categories);
    enqueueSnackbar(`"${template.name}" yüklendi`, { variant: 'success' });
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <FolderIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Şablonlarım
          </Typography>
        </Stack>
        <Tooltip title="Mevcut tasarımı şablon olarak kaydet">
          <IconButton size="small" onClick={() => setSaveDialogOpen(true)}>
            <SaveIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={18} /></Box>
      ) : templates.length === 0 ? (
        <Paper variant="outlined" sx={{
          p: 2, borderRadius: 2, textAlign: 'center', borderStyle: 'dashed',
        }}>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
            Henüz kayıtlı şablon yok
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setSaveDialogOpen(true)}
            sx={{ textTransform: 'none', fontSize: 11, borderRadius: 2 }}>
            İlk Şablonu Kaydet
          </Button>
        </Paper>
      ) : (
        <Stack spacing={0.75}>
          {templates.map(tpl => (
            <Paper key={tpl.id} variant="outlined" sx={{
              p: 1.25, borderRadius: 1.5, cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': { borderColor: theme.palette.primary.light, bgcolor: alpha(theme.palette.primary.main, 0.03) },
            }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{
                  width: 32, height: 32, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.08),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                }}>
                  🏛️
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={700} noWrap display="block" sx={{ fontSize: '0.7rem' }}>
                    {tpl.name}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                    {tpl.venue.sections.length} bölüm · {
                        tpl.venue.type === 'proscenium' ? 'Klasik Tiyatro' :
                        tpl.venue.type === 'amphitheater' ? 'Amfitiyatro' :
                        tpl.venue.type === 'arena' ? 'Arena (360°)' :
                        tpl.venue.type === 'thrust' ? 'Thrust Sahne' :
                        tpl.venue.type === 'stadium' ? 'Stadyum' :
                        tpl.venue.type === 'openair' ? 'Açık Hava' : tpl.venue.type
                    }
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0}>
                  <Tooltip title="Yükle">
                    <IconButton size="small" onClick={() => handleLoad(tpl)}>
                      <LoadIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sil">
                    <IconButton size="small" onClick={() => handleDelete(tpl.id)} sx={{ color: 'error.main' }}>
                      <DeleteIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Şablon Olarak Kaydet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mevcut salon planını ileride tekrar kullanmak üzere kaydedin.
          </Typography>
          <Stack spacing={2}>
            <TextField fullWidth label="Şablon Adı" required size="small" value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Ör: Büyük Konser Salonu" autoFocus />
            <TextField fullWidth label="Açıklama (opsiyonel)" size="small" multiline rows={2}
              value={saveDesc} onChange={e => setSaveDesc(e.target.value)}
              placeholder="500 kişilik, 4 bölüm..." />
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>Kaydedilecek:</Typography>
              <Typography variant="caption" color="text.secondary">
                {currentVenue.name} · {currentVenue.type} · {currentVenue.sections.length} bölüm · {currentCategories.length} kategori
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !saveName.trim()}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            {saving ? <CircularProgress size={16} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
