import { useCallback, useEffect, useState } from 'react';
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
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import {
  nbAdminService,
  NB_INTRODUCTION_STATUS_LABEL,
  type NbIntroduction,
  type NbIntroductionStatus,
} from '../../services/nartbusiness/nbAdminService';
import { relativeDate } from '../../utils/nbDisplay';

/**
 * Tanıştırmalar — admin'in iki üyeyi tanıştırdığı kayıtların takip defteri.
 * Kayıt oluşturma üye detayındaki "Tanıştır" butonundan yapılır; burada durum
 * ve not güncellenir (kim kiminle neden tanıştırıldı, sonuç ne oldu).
 * Bkz. docs/plan/nb-admin-iletisim-tanistir.md.
 */
export default function NbIntroductions() {
  const [items, setItems] = useState<NbIntroduction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Satır düzenleme dialogu (durum + not)
  const [editTarget, setEditTarget] = useState<NbIntroduction | null>(null);
  const [editStatus, setEditStatus] = useState<NbIntroductionStatus>('INTRODUCED');
  const [editNote, setEditNote] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await nbAdminService.listIntroductions({ page, size });
      setItems(r.items);
      setTotal(r.totalElements);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Tanıştırmalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: NbIntroduction) => {
    setEditTarget(row);
    setEditStatus(row.status);
    setEditNote(row.adminNote ?? '');
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await nbAdminService.updateIntroduction(editTarget.id, {
        status: editStatus,
        adminNote: editNote,
      });
      setEditTarget(null);
      await load();
    } catch (e: any) {
      setEditError(e?.response?.data?.error?.message ?? e?.message ?? 'Güncellenemedi.');
    } finally {
      setEditBusy(false);
    }
  };

  const statusColor = (
    s: NbIntroductionStatus,
  ): 'default' | 'info' | 'warning' | 'success' | 'error' => {
    switch (s) {
      case 'INTRODUCED':
        return 'info';
      case 'MEETING_PENDING':
        return 'warning';
      case 'MET':
        return 'default';
      case 'CLOSED_SUCCESS':
        return 'success';
      case 'CLOSED_NO_RESULT':
        return 'error';
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Tanıştırmalar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            İki üyeyi tanıştırmak için üye detayındaki "Tanıştır" butonunu kullanın — kayıt
            buraya düşer, durumu buradan takip edin.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">Henüz tanıştırma kaydı yok.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Üyeler</TableCell>
                  <TableCell>Sebep</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Not</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Link
                        component={RouterLink}
                        to={`/nartbusiness/members/${row.memberAId}`}
                        underline="hover"
                      >
                        {row.memberAName}
                      </Link>
                      {' ↔ '}
                      <Link
                        component={RouterLink}
                        to={`/nartbusiness/members/${row.memberBId}`}
                        underline="hover"
                      >
                        {row.memberBName}
                      </Link>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" noWrap title={row.reason}>
                        {row.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statusColor(row.status)}
                        label={NB_INTRODUCTION_STATUS_LABEL[row.status]}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        title={row.adminNote ?? ''}
                      >
                        {row.adminNote ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {relativeDate(row.createdAt)}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => openEdit(row)}
                      >
                        Düzenle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={size}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Satır"
        />
      </Paper>

      {/* Durum + not düzenleme */}
      <Dialog open={!!editTarget} onClose={() => !editBusy && setEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          Tanıştırma Takibi
          {editTarget && (
            <Typography variant="body2" color="text.secondary">
              {editTarget.memberAName} ↔ {editTarget.memberBName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              select
              label="Durum"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as NbIntroductionStatus)}
              disabled={editBusy}
              fullWidth
            >
              {(
                Object.keys(NB_INTRODUCTION_STATUS_LABEL) as NbIntroductionStatus[]
              ).map((k) => (
                <MenuItem key={k} value={k}>
                  {NB_INTRODUCTION_STATUS_LABEL[k]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Takip notu"
              placeholder='Örn. "Görüştüler, teklif aşamasında."'
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              disabled={editBusy}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)} disabled={editBusy}>
            Vazgeç
          </Button>
          <Button variant="contained" onClick={saveEdit} disabled={editBusy}>
            {editBusy ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
