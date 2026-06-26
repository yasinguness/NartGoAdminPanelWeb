import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { JobTitle } from '../../services/nartbusiness/nbTypes';
import { useNbMobile } from '../../components/nartbusiness';

const EMPTY: JobTitle = {
  label: '',
  sortOrder: 0,
  active: true,
};

export default function NbJobTitles() {
  const fullScreen = useNbMobile();
  const [items, setItems] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<JobTitle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<JobTitle | null>(null);

  const load = () => {
    setLoading(true);
    nbAdminService
      .listJobTitles()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? 'Veri yüklenemedi');
        setLoading(false);
      });
  };

  useEffect(load, []);

  const isExisting = !!editing?.id;

  // Validation
  const labelTrimmed = editing?.label.trim() ?? '';
  const labelValid = labelTrimmed.length > 0 && labelTrimmed.length <= 120;
  const labelDuplicate =
    !!editing &&
    items.some(
      (t) =>
        t.id !== editing.id &&
        t.label.toLocaleLowerCase('tr-TR') === labelTrimmed.toLocaleLowerCase('tr-TR'),
    );

  const formValid = !!editing && labelValid && !labelDuplicate;

  const willDeactivate =
    !!editing && isExisting && !editing.active &&
    !!items.find((t) => t.id === editing.id)?.active;

  const save = async () => {
    if (!editing || !formValid) return;
    setSubmitting(true);
    try {
      await nbAdminService.upsertJobTitle({ ...editing, label: editing.label.trim() });
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Kaydetme başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting?.id) return;
    setSubmitting(true);
    try {
      await nbAdminService.deleteJobTitle(deleting.id);
      setDeleting(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Silme başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            NartBusiness — Ünvan / Pozisyon Katalogu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Profesyonel üyelerin başvuru/profilinde seçtiği ünvan listesini buradan yönetin.
            Pasif ünvanlar yeni başvuru seçim listelerinden düşer; "Diğer" ile girilen serbest
            metinler bu listeden bağımsızdır.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditing({ ...EMPTY, sortOrder: (items.at(-1)?.sortOrder ?? 0) + 10 })}
        >
          Yeni Ünvan
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ünvan / Pozisyon</TableCell>
                <TableCell>Sıra</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.label}</TableCell>
                  <TableCell>{t.sortOrder}</TableCell>
                  <TableCell>
                    {t.active ? (
                      <Chip size="small" color="success" label="Aktif" />
                    ) : (
                      <Chip size="small" variant="outlined" label="Pasif" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setEditing({ ...t })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleting(t)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography color="text.secondary" align="center" py={2}>
                      Henüz ünvan eklenmemiş.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Düzenle / Yeni */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth fullScreen={fullScreen}>
        <DialogTitle>{isExisting ? 'Ünvan Düzenle' : 'Yeni Ünvan'}</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Stack spacing={2}>
              <TextField
                label="Ünvan / Pozisyon *"
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                error={editing.label.length > 0 && (!labelValid || labelDuplicate)}
                helperText={
                  labelDuplicate
                    ? 'Bu ünvan zaten listede var.'
                    : editing.label.length > 0 && !labelValid
                    ? 'En fazla 120 karakter, boş olamaz.'
                    : 'Örnek: Genel Müdür, Satınalma Müdürü, Direktör'
                }
                fullWidth
                autoFocus
              />
              <TextField
                label="Sıra"
                type="number"
                value={editing.sortOrder}
                onChange={(e) =>
                  setEditing({ ...editing, sortOrder: parseInt(e.target.value, 10) || 0 })
                }
                helperText="Düşük değer önce gösterilir."
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  />
                }
                label="Aktif"
              />
              {willDeactivate && (
                <Alert severity="warning">
                  Bu ünvanı pasifleştiriyorsun. <b>Yeni başvurularda</b> seçim listesinden
                  düşer; mevcut profillerdeki metin korunur.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Vazgeç</Button>
          <Button variant="contained" onClick={save} disabled={!formValid || submitting}>
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sil onayı */}
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Ünvanı Sil</DialogTitle>
        <DialogContent dividers>
          <Typography>
            <b>{deleting?.label}</b> ünvanını kalıcı olarak silmek istediğine emin misin?
            Bunun yerine <i>Pasif</i> yapmak, mevcut başvuru geçmişiyle uyumu korur.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Vazgeç</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={submitting}>
            {submitting ? 'Siliniyor…' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
