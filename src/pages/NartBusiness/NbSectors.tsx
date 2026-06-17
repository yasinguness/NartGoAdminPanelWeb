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
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { Sector } from '../../services/nartbusiness/nbTypes';
import { CatalogAutocomplete, useNbMobile } from '../../components/nartbusiness';

const EMPTY: Sector = {
  code: '',
  parentCode: '',
  nameTr: '',
  nameEn: '',
  description: '',
  sortOrder: 0,
  active: true,
};

const CODE_RX = /^[A-Z][A-Z0-9_]{1,49}$/;

export default function NbSectors() {
  const fullScreen = useNbMobile();
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

  const isExisting = useMemo(
    () => (editing ? items.some((s) => s.code === editing.code) : false),
    [editing, items],
  );

  // Validation
  const codeValid = !!editing && CODE_RX.test(editing.code);
  const codeDuplicate =
    !!editing && !isExisting && items.some((s) => s.code === editing.code);
  const nameTrValid = !!editing?.nameTr.trim();
  const parentValid =
    !editing?.parentCode ||
    items.some((s) => s.code === editing.parentCode && s.code !== editing.code);

  const formValid = !!editing && codeValid && !codeDuplicate && nameTrValid && parentValid;

  // Existing record deactivation warning (only when toggling active off on existing record)
  const willDeactivate =
    !!editing && isExisting && !editing.active &&
    !!items.find((s) => s.code === editing.code)?.active;

  // Parent candidates: all sectors except self (and self's descendants — but tree depth ignored here)
  const parentCandidates = useMemo(
    () => items.filter((s) => !editing || s.code !== editing.code),
    [items, editing],
  );

  const save = async () => {
    if (!editing || !formValid) return;
    setSubmitting(true);
    try {
      await nbAdminService.upsertSector({
        ...editing,
        parentCode: editing.parentCode?.trim() ? editing.parentCode : undefined,
      });
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Kaydetme başarısız');
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
            Üyelerin profil + ilan oluştururken seçtiği sektör listesini buradan yönetin.
            Pasif sektörler seçim listelerinden düşer, mevcut üyelerin verisi etkilenmez.
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
                <TableCell>Parent</TableCell>
                <TableCell>Sıra</TableCell>
                <TableCell>Durum</TableCell>
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
                  <TableCell>
                    {s.parentCode ? (
                      <Typography fontFamily="monospace" variant="body2" color="text.secondary">
                        {s.parentCode}
                      </Typography>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell>
                    {s.active ? (
                      <Chip size="small" color="success" label="Aktif" />
                    ) : (
                      <Chip size="small" variant="outlined" label="Pasif" />
                    )}
                  </TableCell>
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

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth fullScreen={fullScreen}>
        <DialogTitle>{isExisting ? 'Sektör Düzenle' : 'Yeni Sektör'}</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Stack spacing={2}>
              <TextField
                label="Kod *"
                value={editing.code}
                onChange={(e) =>
                  setEditing({ ...editing, code: e.target.value.toUpperCase() })
                }
                disabled={isExisting}
                error={
                  editing.code.length > 0 && (!codeValid || codeDuplicate)
                }
                helperText={
                  codeDuplicate
                    ? 'Bu kod zaten kullanılıyor — başka bir kod seç.'
                    : editing.code.length > 0 && !codeValid
                    ? 'Geçersiz: büyük harf ile başlamalı, A-Z 0-9 _ kullanılabilir (2-50 char)'
                    : 'Örnek: CONSTRUCTION, REAL_ESTATE, IT_SOFTWARE'
                }
                fullWidth
              />
              <TextField
                label="İsim (TR) *"
                value={editing.nameTr}
                onChange={(e) => setEditing({ ...editing, nameTr: e.target.value })}
                error={editing.nameTr.length > 0 && !nameTrValid}
                fullWidth
              />
              <TextField
                label="İsim (EN)"
                value={editing.nameEn ?? ''}
                onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
                fullWidth
              />
              <CatalogAutocomplete<Sector>
                label="Parent Sektör (opsiyonel)"
                options={parentCandidates}
                value={
                  parentCandidates.find((s) => s.code === editing.parentCode) ?? null
                }
                onChange={(v) =>
                  setEditing({ ...editing, parentCode: v?.code ?? '' })
                }
                getOptionLabel={(s) => `${s.nameTr} (${s.code})`}
                isOptionEqualToValue={(a, b) => a.code === b.code}
                placeholder="Hiyerarşi için üst sektör seç"
                helperText="Boş bırakırsan root sektör olur."
              />
              <TextField
                label="Açıklama"
                value={editing.description ?? ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                multiline
                rows={2}
                fullWidth
                helperText="UI'da gösterilmez; admin notu / dokümantasyon."
              />
              <TextField
                label="Sıra"
                type="number"
                value={editing.sortOrder}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                helperText="Düşük değer önce gösterilir. Aynı parent altında farklı olmalı."
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
                  Bu sektörü pasifleştiriyorsun. <b>Yeni başvurularda</b> seçim
                  listelerinden düşer. Mevcut üyelerin <code>sectorCode</code>
                  değeri korunur (data integrity bozulmaz), ama profil sayfasında
                  "(pasif)" işaretiyle görünür.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Vazgeç</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!formValid || submitting}
          >
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
