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
  Tooltip,
  Typography,
} from '@mui/material';
import { useNbMobile } from '../../components/nartbusiness';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { NbPageHeader } from '../../components/nartbusiness/ui';
import type {
  Testimonial,
  TestimonialUpsert,
} from '../../services/nartbusiness/nbTypes';

type Draft = TestimonialUpsert & { id?: string };

const EMPTY_DRAFT: Draft = {
  authorName: '',
  authorCompany: '',
  authorTitle: '',
  quote: '',
  avatarUrl: '',
  memberId: '',
  approved: false,
  sortOrder: 0,
};

export default function NbTestimonials() {
  const fullScreen = useNbMobile();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Testimonial | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await nbAdminService.listTestimonials());
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Referanslar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setDraft({ ...EMPTY_DRAFT, sortOrder: items.length });
  }

  function openEdit(t: Testimonial) {
    setDraft({
      id: t.id,
      authorName: t.authorName,
      authorCompany: t.authorCompany ?? '',
      authorTitle: t.authorTitle ?? '',
      quote: t.quote,
      avatarUrl: t.avatarUrl ?? '',
      memberId: '',
      approved: t.approved,
      sortOrder: t.sortOrder,
    });
  }

  async function save() {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: TestimonialUpsert = {
        authorName: draft.authorName.trim(),
        authorCompany: draft.authorCompany?.trim() || undefined,
        authorTitle: draft.authorTitle?.trim() || undefined,
        quote: draft.quote.trim(),
        avatarUrl: draft.avatarUrl?.trim() || undefined,
        memberId: draft.memberId?.trim() || undefined,
        approved: draft.approved,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      if (draft.id) {
        await nbAdminService.updateTestimonial(draft.id, body);
      } else {
        await nbAdminService.createTestimonial(body);
      }
      setDraft(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setSubmitting(true);
    setError(null);
    try {
      await nbAdminService.deleteTestimonial(id);
      setConfirmDelete(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Silinemedi');
    } finally {
      setSubmitting(false);
    }
  }

  const draftValid = !!draft && draft.authorName.trim() && draft.quote.trim();

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <NbPageHeader
        eyebrow="NartBusiness"
        title="Referanslar"
        subtitle="Küratörlü üye sözleri. Yalnızca “Onaylı” olanlar web vitrininde gösterilir."
        actions={
          <>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Yeni Referans
            </Button>
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={60}>Sıra</TableCell>
              <TableCell>Yazar</TableCell>
              <TableCell>Firma / Ünvan</TableCell>
              <TableCell>Söz</TableCell>
              <TableCell width={110}>Durum</TableCell>
              <TableCell width={110} align="right">
                İşlem
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    Henüz referans yok. “Yeni Referans” ile ekleyin.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.sortOrder}</TableCell>
                  <TableCell>{t.authorName}</TableCell>
                  <TableCell>
                    {[t.authorTitle, t.authorCompany].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 360,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.secondary',
                    }}
                  >
                    {t.quote}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={t.approved ? 'Onaylı' : 'Taslak'}
                      color={t.approved ? 'success' : 'default'}
                      variant={t.approved ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Düzenle">
                      <IconButton size="small" onClick={() => openEdit(t)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setConfirmDelete(t)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Oluştur / Düzenle */}
      <Dialog open={!!draft} onClose={() => setDraft(null)} maxWidth="sm" fullWidth fullScreen={fullScreen}>
        <DialogTitle>{draft?.id ? 'Referansı Düzenle' : 'Yeni Referans'}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Yazar adı"
                required
                fullWidth
                value={draft.authorName}
                onChange={(e) => setDraft({ ...draft, authorName: e.target.value })}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Firma"
                  fullWidth
                  value={draft.authorCompany}
                  onChange={(e) => setDraft({ ...draft, authorCompany: e.target.value })}
                />
                <TextField
                  label="Ünvan"
                  fullWidth
                  value={draft.authorTitle}
                  onChange={(e) => setDraft({ ...draft, authorTitle: e.target.value })}
                />
              </Stack>
              <TextField
                label="Söz (alıntı)"
                required
                fullWidth
                multiline
                minRows={3}
                value={draft.quote}
                onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
              />
              <TextField
                label="Avatar URL (opsiyonel)"
                fullWidth
                value={draft.avatarUrl}
                onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Sıra"
                  type="number"
                  sx={{ width: 120 }}
                  value={draft.sortOrder}
                  onChange={(e) =>
                    setDraft({ ...draft, sortOrder: Number(e.target.value) })
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={draft.approved}
                      onChange={(e) => setDraft({ ...draft, approved: e.target.checked })}
                    />
                  }
                  label="Onaylı (vitrinde göster)"
                />
              </Stack>
              <TextField
                label="Üye ID (opsiyonel)"
                fullWidth
                value={draft.memberId}
                onChange={(e) => setDraft({ ...draft, memberId: e.target.value })}
                helperText="Söze ait NB üyesinin memberId'si (bağlamak istersen)."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraft(null)} disabled={submitting}>
            Vazgeç
          </Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!draftValid || submitting}
          >
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme onayı */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} fullScreen={fullScreen}>
        <DialogTitle>Referansı sil</DialogTitle>
        <DialogContent>
          <Typography>
            “{confirmDelete?.authorName}” referansı kalıcı olarak silinsin mi?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} disabled={submitting}>
            Vazgeç
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => confirmDelete && remove(confirmDelete.id)}
            disabled={submitting}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
