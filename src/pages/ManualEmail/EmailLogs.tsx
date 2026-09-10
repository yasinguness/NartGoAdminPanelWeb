import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
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
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { emailTemplateService, type EmailLogEntry } from '../../services/emailTemplateService';
import EmailLogDetailDialog from './EmailLogDetailDialog';

/**
 * Gönderilen e-postaların kaydı — admin görünürlüğü. notification-service her
 * gönderimi (SENT/FAILED) yazar; bu ekran sayfalı + filtreli listeler, satıra
 * tıklanınca gövdesini ve gönderimde kullanılan bilgileri gösterir.
 *
 * `lockedProduct` verildiğinde ürün süzgeci gizlenir ve sabitlenir: NartBusiness
 * paneli aynı ekranı yalnız kendi e-postalarıyla kullanır.
 */
export default function EmailLogs({
  lockedProduct,
  heading = 'E-posta Kayıtları',
  subheading = 'Sistemden giden tüm e-postalar (otomatik + elle). Durum, alıcı ve ürüne göre süzülebilir.',
}: {
  lockedProduct?: string;
  heading?: string;
  subheading?: string;
} = {}) {
  const [items, setItems] = useState<EmailLogEntry[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [debouncedRecipient, setDebouncedRecipient] = useState('');
  const [status, setStatus] = useState('');
  const [product, setProduct] = useState(lockedProduct ?? '');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedRecipient(recipient.trim()), 300);
    return () => clearTimeout(t);
  }, [recipient]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    emailTemplateService
      .logs({
        recipient: debouncedRecipient || undefined,
        status: status || undefined,
        product: lockedProduct ?? (product || undefined),
        page,
        size: 25,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.content ?? []);
        setTotalPages(res.totalPages ?? 0);
        setTotal(res.totalElements ?? 0);
        setError(null);
        setLoading(false);
      })
      .catch((e: any) => {
        if (cancelled) return;
        const code = e?.response?.status;
        if (code === 404 || code === 501) {
          setItems([]);
          setError(null);
        } else {
          setError(e?.response?.data?.message ?? e?.message ?? 'Loglar yüklenemedi');
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedRecipient, status, product, page, lockedProduct]);

  return (
    <Box p={3} maxWidth={1000} mx="auto">
      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <HistoryOutlinedIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          {heading}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {subheading}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Alıcı e-posta ara…"
          value={recipient}
          onChange={(e) => {
            setRecipient(e.target.value);
            setPage(0);
          }}
          sx={{ flexGrow: 1, minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Durum</InputLabel>
          <Select label="Durum" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <MenuItem value="">Hepsi</MenuItem>
            <MenuItem value="SENT">Gönderildi</MenuItem>
            <MenuItem value="FAILED">Başarısız</MenuItem>
          </Select>
        </FormControl>
        {!lockedProduct && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Ürün</InputLabel>
            <Select label="Ürün" value={product} onChange={(e) => { setProduct(e.target.value); setPage(0); }}>
              <MenuItem value="">Hepsi</MenuItem>
              <MenuItem value="NartGo">NartGo</MenuItem>
              <MenuItem value="NartBusiness">NartBusiness</MenuItem>
            </Select>
          </FormControl>
        )}
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Alıcı</TableCell>
                  <TableCell>Ürün / Kategori</TableCell>
                  <TableCell>Konu</TableCell>
                  <TableCell>Durum</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((e) => (
                  <TableRow
                    key={e.id}
                    hover
                    onClick={() => setDetailId(e.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {new Date(e.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>{e.recipient}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {e.product && (
                          <Chip
                            size="small"
                            color={e.product.toLowerCase().includes('business') ? 'secondary' : 'primary'}
                            label={e.product}
                          />
                        )}
                        {e.category && <Chip size="small" variant="outlined" label={e.category} />}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" noWrap title={e.subject ?? ''}>
                        {e.subject ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {e.templateName ?? ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {e.status === 'SENT' ? (
                        <Chip size="small" color="success" variant="outlined" label="Gönderildi" />
                      ) : (
                        <Tooltip title={e.errorMessage ?? 'Başarısız'} arrow>
                          <Chip size="small" color="error" label="Başarısız" />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" py={4}>
                        Kayıt bulunamadı.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} />
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
            Toplam {total} kayıt · Gövdesini görmek için bir satıra tıklayın
          </Typography>
        </>
      )}

      <EmailLogDetailDialog id={detailId} onClose={() => setDetailId(null)} />
    </Box>
  );
}
