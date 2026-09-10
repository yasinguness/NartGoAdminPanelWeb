import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
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
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import PageContainer from '../../components/Page/PageContainer';
import PageHeader from '../../components/Page/PageHeader';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbLoginLogRow } from '../../services/nartbusiness/nbAdminService';

/**
 * NB üyelerinin giriş kayıtları.
 *
 * Kayıtlar yeni tutulmaya başlanmadı: auth-service zaten her girişi
 * `auth_logs` tablosuna yazıyordu (kullanıcı, IP, cihaz, sonuç). Burada
 * yapılan, o veriyi NB üyeleriyle sınırlayıp görünür kılmak. Dolayısıyla
 * geçmiş kayıtlar da listede.
 */
export default function NbLoginLogs() {
  const [rows, setRows] = useState<NbLoginLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    nbAdminService
      .getLoginLogs({
        status: status || undefined,
        // <input type="datetime-local"> "YYYY-MM-DDTHH:mm" verir; backend
        // ISO bekliyor, saniye eklenince ikisi uyuşuyor.
        from: from ? `${from}:00` : undefined,
        to: to ? `${to}:00` : undefined,
        page,
        size: 25,
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.content ?? []);
        setTotal(res.totalElements ?? 0);
        setTotalPages(res.totalPages ?? 0);
        setDegraded(!!res.degraded);
        setError(null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.response?.data?.message ?? e?.message ?? 'Kayıtlar yüklenemedi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, from, to, page]);

  return (
    <PageContainer maxWidth={1200}>
      <PageHeader
        title="Giriş Kayıtları"
        subtitle="NartBusiness üyelerinin hesap girişleri. Şüpheli giriş ve hesap paylaşımını burada görebilirsiniz."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {degraded && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Kimlik servisine ulaşılamadı; liste eksik olabilir. Bu, kayıt olmadığı
          anlamına gelmez.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Sonuç</InputLabel>
          <Select
            label="Sonuç"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Hepsi</MenuItem>
            <MenuItem value="SUCCESS">Başarılı</MenuItem>
            {/* Enum değeri FAILURE; "FAILED" gönderildiğinde sunucu filtreyi
                sessizce yok sayıyor ve hepsi listeleniyordu. */}
            <MenuItem value="FAILURE">Başarısız</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="datetime-local"
          label="Başlangıç"
          InputLabelProps={{ shrink: true }}
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(0);
          }}
        />
        <TextField
          size="small"
          type="datetime-local"
          label="Bitiş"
          InputLabelProps={{ shrink: true }}
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(0);
          }}
        />
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Üye</TableCell>
                  <TableCell>Sonuç</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>Cihaz</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {new Date(r.occurredAt).toLocaleString('tr-TR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.fullName || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.email ?? ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.status === 'SUCCESS' ? (
                        <Chip size="small" color="success" variant="outlined" label="Başarılı" />
                      ) : (
                        <Tooltip title={r.failureReason ?? 'Başarısız'} arrow>
                          <Chip size="small" color="error" label="Başarısız" />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {r.ipAddress ?? '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        title={r.userAgent ?? ''}
                        sx={{ display: 'block' }}
                      >
                        {r.deviceInfo || r.userAgent || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Stack alignItems="center" py={4} spacing={1}>
                        <LoginOutlinedIcon color="disabled" />
                        <Typography variant="body2" color="text.secondary">
                          Seçilen aralıkta giriş kaydı yok.
                        </Typography>
                      </Stack>
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
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block', textAlign: 'right' }}
          >
            Toplam {total} kayıt
          </Typography>
        </>
      )}
    </PageContainer>
  );
}
