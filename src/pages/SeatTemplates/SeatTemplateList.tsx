import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, CardActions, Grid, Chip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, alpha, useTheme, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, EventSeat as SeatIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { seatTemplateService, SeatTemplate } from '../../services/ticket/seatTemplateService';

/** Küçük koltuk grid preview */
const MiniSeatPreview: React.FC<{ rows: { name: string; seatCount: number }[] }> = ({ rows }) => {
  const theme = useTheme();
  if (!rows || rows.length === 0) return null;

  const maxSeats = Math.max(...rows.map(r => r.seatCount));
  const displayRows = rows.slice(0, 12); // Max 12 sıra göster

  return (
    <Box sx={{ py: 1 }}>
      {displayRows.map((row) => (
        <Box key={row.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mb: 0.3 }}>
          <Typography variant="caption" sx={{ width: 24, fontSize: 9, color: 'text.secondary', textAlign: 'right' }}>
            {row.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: '1px' }}>
            {Array.from({ length: Math.min(row.seatCount, 22) }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: Math.max(4, Math.min(8, 180 / maxSeats)),
                  height: Math.max(4, Math.min(8, 180 / maxSeats)),
                  borderRadius: '1px',
                  bgcolor: alpha(theme.palette.primary.main, 0.5),
                }}
              />
            ))}
          </Box>
          {row.seatCount > 22 && (
            <Typography variant="caption" sx={{ fontSize: 8, color: 'text.disabled' }}>
              +{row.seatCount - 22}
            </Typography>
          )}
        </Box>
      ))}
      {rows.length > 12 && (
        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', ml: 3 }}>
          +{rows.length - 12} sıra daha...
        </Typography>
      )}
      <Box sx={{
        mt: 0.5, mx: 'auto', width: '60%', height: 3,
        bgcolor: alpha(theme.palette.warning.main, 0.5), borderRadius: 1,
        textAlign: 'center',
      }}>
        <Typography variant="caption" sx={{ fontSize: 7, lineHeight: '3px', color: 'warning.dark' }}>
          SAHNE
        </Typography>
      </Box>
    </Box>
  );
};

export default function SeatTemplateList() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState<SeatTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await seatTemplateService.listTemplates();
      if (res.success) {
        setTemplates(res.data || []);
      }
    } catch (e) {
      enqueueSnackbar('Şablonlar yüklenirken hata oluştu', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await seatTemplateService.deleteTemplate(deleteDialog);
      enqueueSnackbar('Şablon silindi', { variant: 'success' });
      setDeleteDialog(null);
      fetchTemplates();
    } catch {
      enqueueSnackbar('Silme hatası', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Salon Planları</Typography>
          <Typography variant="body2" color="text.secondary">
            Kayıtlı salon planı şablonlarını yönetin
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/seat-templates/new')}
          sx={{ borderRadius: 2 }}
        >
          Yeni Plan Oluştur
        </Button>
      </Box>

      {/* Template grid */}
      {templates.length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 8,
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 3,
        }}>
          <SeatIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Henüz salon planı yok
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            PDF veya PNG yükleyerek salon planını otomatik oluşturabilirsiniz
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate('/seat-templates/new')}
          >
            İlk Planı Oluştur
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {templates.map((tpl) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={tpl.id}>
              <Card sx={{
                height: '100%', display: 'flex', flexDirection: 'column',
                border: '1px solid', borderColor: 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
              }}>
                <CardContent sx={{ flexGrow: 1, pb: 0 }}>
                  <Typography variant="subtitle1" fontWeight={600} noWrap>
                    {tpl.name}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 1 }}>
                    <Chip
                      icon={<SeatIcon sx={{ fontSize: 14 }} />}
                      label={`${tpl.totalSeats || '?'} koltuk`}
                      size="small"
                      variant="outlined"
                    />
                    {tpl.layout?.rows && (
                      <Chip
                        label={`${tpl.layout.rows.length} sıra`}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    )}
                  </Box>

                  {/* Mini preview */}
                  {tpl.layout?.rows && <MiniSeatPreview rows={tpl.layout.rows} />}

                  {tpl.createdAt && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <CalendarIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">
                        {new Date(tpl.createdAt).toLocaleDateString('tr-TR')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1.5 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => navigate(`/seat-templates/new?templateId=${tpl.id}`)}
                  >
                    Kullan
                  </Button>
                  <Tooltip title="Şablonu Sil">
                    <IconButton size="small" color="error" onClick={() => setDeleteDialog(tpl.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Şablonu Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu salon planı şablonunu silmek istediğinize emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
