import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  Switch,
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
import {
  nbAdminService,
  type NbPartnerOrg,
  type NbPartnerOrgPayload,
} from '../../services/nartbusiness/nbAdminService';
import { useNbMobile } from '../../components/nartbusiness';

/**
 * Kurum kataloğu yönetimi.
 *
 * Kurum, üyenin ağa hangi kuruluş aracılığıyla geldiğini söyler. Üyenin hangi
 * kapıdan girdiğini söyleyen kaynak alanından ayrıdır; o kapalı bir küme, bu
 * ise iş geliştirme ilerledikçe büyüyen açık uçlu bir liste. Bu yüzden burada
 * yönetiliyor: yeni bir iş birliğinde kod değişikliği ve sürüm gerekmesin.
 */

const CODE_RX = /^[A-Z][A-Z0-9_]{1,39}$/;

interface FormState {
  id?: string;
  code: string;
  name: string;
  shortName: string;
  city: string;
  logoUrl: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

const EMPTY: FormState = {
  code: '',
  name: '',
  shortName: '',
  city: '',
  logoUrl: '',
  description: '',
  sortOrder: 0,
  active: true,
};

export default function NbPartnerOrgs() {
  const fullScreen = useNbMobile();
  const [items, setItems] = useState<NbPartnerOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    nbAdminService
      .listPartnerOrgs()
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err) => setError(err?.message ?? 'Kurumlar yüklenemedi'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => setEditing({ ...EMPTY });

  const openEdit = (o: NbPartnerOrg) =>
    setEditing({
      id: o.id,
      code: o.code,
      name: o.name,
      shortName: o.shortName,
      city: o.city ?? '',
      logoUrl: o.logoUrl ?? '',
      description: o.description ?? '',
      sortOrder: o.sortOrder,
      active: o.active,
    });

  const isNew = editing != null && !editing.id;
  const codeValid = !isNew || CODE_RX.test(editing?.code ?? '');
  const canSave =
    editing != null &&
    codeValid &&
    editing.name.trim().length > 0 &&
    editing.shortName.trim().length > 0;

  const save = async () => {
    if (!editing || !canSave) return;
    setSubmitting(true);
    const payload: NbPartnerOrgPayload = {
      name: editing.name.trim(),
      shortName: editing.shortName.trim(),
      city: editing.city.trim() || null,
      logoUrl: editing.logoUrl.trim() || null,
      description: editing.description.trim() || null,
      sortOrder: editing.sortOrder,
      active: editing.active,
    };
    try {
      if (editing.id) {
        await nbAdminService.updatePartnerOrg(editing.id, payload);
      } else {
        await nbAdminService.createPartnerOrg({ ...payload, code: editing.code.trim() });
      }
      setEditing(null);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (o: NbPartnerOrg) => {
    // Kalıcı silme bilerek yok: kayıt silinirse o kurumdan gelen üyelerin
    // geçmişi de silinir. Pasif kurum yeni atamalarda seçilemez, mevcut
    // bağlar durur.
    const ok = window.confirm(
      `${o.shortName} pasifleştirilsin mi?\n\n` +
        'Yeni üye atamalarında seçilemez olur. Bu kurumdan gelen ' +
        `${o.memberCount} üyenin kaydı ve rozeti değişmez.`,
    );
    if (!ok) return;
    try {
      await nbAdminService.deactivatePartnerOrg(o.id);
      load();
    } catch (err: any) {
      setError(err?.message ?? 'Pasifleştirilemedi');
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Kurumlar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Üyenin ağa hangi kuruluş aracılığıyla geldiği. Dizin filtresi ve
            profil rozeti bu listeden beslenir.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Kurum Ekle
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Henüz kurum eklenmemiş. Kurum eklemeden üyelere kurum ataması
            yapılamaz.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kısa Ad</TableCell>
                <TableCell>Tam Ad</TableCell>
                <TableCell>Kod</TableCell>
                <TableCell>Şehir</TableCell>
                <TableCell align="right">Üye</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{o.shortName}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{o.name}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {o.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{o.city || '—'}</TableCell>
                  <TableCell align="right">{o.memberCount}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={o.active ? 'Aktif' : 'Pasif'}
                      color={o.active ? 'success' : 'default'}
                      variant={o.active ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(o)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {o.active && (
                      <Button size="small" color="inherit" onClick={() => deactivate(o)}>
                        Pasifleştir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={editing != null}
        onClose={() => setEditing(null)}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreen}
      >
        <DialogTitle>{isNew ? 'Kurum Ekle' : 'Kurumu Düzenle'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Kod"
              value={editing?.code ?? ''}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, code: e.target.value.toUpperCase() } : s))
              }
              disabled={!isNew}
              error={!codeValid && (editing?.code ?? '').length > 0}
              helperText={
                isNew
                  ? 'Sabit teknik anahtar, örn. KAFSIAD. Sonradan değiştirilemez, ekranda gösterilmez.'
                  : 'Kod değiştirilemez.'
              }
              fullWidth
            />
            <TextField
              label="Tam Ad"
              value={editing?.name ?? ''}
              onChange={(e) => setEditing((s) => (s ? { ...s, name: e.target.value } : s))}
              helperText="Kurumun resmî adı."
              fullWidth
            />
            <TextField
              label="Kısa Ad"
              value={editing?.shortName ?? ''}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, shortName: e.target.value } : s))
              }
              helperText={
                editing?.shortName
                  ? `Rozette "${editing.shortName} üyesi" olarak görünür.`
                  : 'Rozette ve filtrede görünen ad.'
              }
              fullWidth
            />
            <TextField
              label="Şehir"
              value={editing?.city ?? ''}
              onChange={(e) => setEditing((s) => (s ? { ...s, city: e.target.value } : s))}
              fullWidth
            />
            <TextField
              label="Logo bağlantısı"
              value={editing?.logoUrl ?? ''}
              onChange={(e) => setEditing((s) => (s ? { ...s, logoUrl: e.target.value } : s))}
              fullWidth
            />
            <TextField
              label="Açıklama"
              value={editing?.description ?? ''}
              onChange={(e) =>
                setEditing((s) => (s ? { ...s, description: e.target.value } : s))
              }
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Sıra"
              type="number"
              value={editing?.sortOrder ?? 0}
              onChange={(e) =>
                setEditing((s) =>
                  s ? { ...s, sortOrder: Number(e.target.value) || 0 } : s,
                )
              }
              helperText="Küçük olan listede önce görünür."
              fullWidth
            />
            {!isNew && (
              <FormControlLabel
                control={
                  <Switch
                    checked={editing?.active ?? true}
                    onChange={(e) =>
                      setEditing((s) => (s ? { ...s, active: e.target.checked } : s))
                    }
                  />
                }
                label="Aktif"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Vazgeç</Button>
          <Button variant="contained" onClick={save} disabled={!canSave || submitting}>
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
