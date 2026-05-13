import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { Sector } from '../../services/nartbusiness/nbTypes';

const EMPTY: Sector = {
  code: '',
  parentCode: '',
  nameTr: '',
  nameEn: '',
  description: '',
  sortOrder: 0,
  active: true,
};

export default function NbSectors() {
  const [items, setItems] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    nbAdminService
      .listSectors()
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

  const save = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await nbAdminService.upsertSector(editing);
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Kaydetme başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            NartBusiness — Sektör Katalogu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Üyelerin profil + ilan oluştururken seçtiği sektör listesini buradan
            yönetin.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditing({ ...EMPTY })}
        >
          Yeni Sektör
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
                <TableCell>Kod</TableCell>
                <TableCell>İsim (TR)</TableCell>
                <TableCell>İsim (EN)</TableCell>
                <TableCell>Sıra</TableCell>
                <TableCell>Aktif</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.code} hover>
                  <TableCell>
                    <Typography fontFamily="monospace">{s.code}</Typography>
                  </TableCell>
                  <TableCell>{s.nameTr}</TableCell>
                  <TableCell>{s.nameEn ?? '—'}</TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell>{s.active ? 'Aktif' : 'Pasif'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setEditing({ ...s })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing && items.find((s) => s.code === editing.code) ? 'Sektör Düzenle' : 'Yeni Sektör'}
        </DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Stack spacing={2}>
              <TextField
                label="Kod (BÜYÜK_HARF)"
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                helperText="A-Z, 0-9, alt çizgi. Örn: CONSTRUCTION, REAL_ESTATE"
                fullWidth
                disabled={!!items.find((s) => s.code === editing.code)}
              />
              <TextField
                label="İsim (TR)"
                value={editing.nameTr}
                onChange={(e) => setEditing({ ...editing, nameTr: e.target.value })}
                fullWidth
              />
              <TextField
                label="İsim (EN)"
                value={editing.nameEn ?? ''}
                onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
                fullWidth
              />
              <TextField
                label="Parent Sector (kod)"
                value={editing.parentCode ?? ''}
                onChange={(e) => setEditing({ ...editing, parentCode: e.target.value })}
                fullWidth
              />
              <TextField
                label="Sıra"
                type="number"
                value={editing.sortOrder}
                onChange={(e) =>
                  setEditing({ ...editing, sortOrder: parseInt(e.target.value, 10) || 0 })
                }
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
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Vazgeç</Button>
          <Button variant="contained" onClick={save} disabled={submitting}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
