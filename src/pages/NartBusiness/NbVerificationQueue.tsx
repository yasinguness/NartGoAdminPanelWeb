import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { formatDateTime } from '../../utils/dateUtils';
import type {
  Sector,
  VerificationCase,
  VerificationCaseStatus,
} from '../../services/nartbusiness/nbTypes';
import { RACE_LABELS, STATUS_COLORS, STATUS_LABELS } from './verificationShared';
import NbVerificationDecideDialog from './NbVerificationDecideDialog';

const STATUS_FILTERS: Array<VerificationCaseStatus | 'ALL'> = [
  'ALL',
  'SUBMITTED',
  'NEEDS_INFO',
  'IN_REVIEW',
];

export default function NbVerificationQueue() {
  const [queue, setQueue] = useState<VerificationCase[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decideCaseId, setDecideCaseId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VerificationCaseStatus | 'ALL'>(
    'ALL',
  );

  const load = () => {
    setLoading(true);
    const status = statusFilter === 'ALL' ? undefined : statusFilter;
    nbAdminService
      .listVerificationQueue(0, 50, status)
      .then((res) => {
        setQueue(res?.content ?? []);
        setLoading(false);
        setLoaded(true);
      })
      .catch((err) => {
        setError(err?.message ?? 'Veri yüklenemedi');
        setLoading(false);
        setLoaded(true);
      });
  };

  useEffect(() => {
    nbAdminService.listSectors().then(setSectors).catch(() => {});
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [statusFilter]);

  const sectorName = useMemo(
    () => (codes?: string[], code?: string) => {
      const list = codes?.length ? codes : code ? [code] : [];
      if (!list.length) return '—';
      return list.map((c) => sectors.find((s) => s.code === c)?.nameTr ?? c).join(', ');
    },
    [sectors],
  );

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        NartBusiness — Doğrulama Kuyruğu
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Komite-onaylı-sonra-öde akışı. Üye ön başvuruda hafif KYC verir
        (sosyal kanıt + Kafkas kimliği); komite onaylar; üye 7 gün içinde öder.
        Ek Bilgi döngüsü 2 turla sınırlıdır (3.'de otomatik reddedilir).
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Durum filtresi</InputLabel>
          <Select
            value={statusFilter}
            label="Durum filtresi"
            onChange={(e) =>
              setStatusFilter(e.target.value as VerificationCaseStatus | 'ALL')
            }
          >
            {STATUS_FILTERS.map((s) => (
              <MenuItem key={s} value={s}>
                {s === 'ALL' ? 'Tümü (aksiyon bekleyenler)' : STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" onClick={load}>
          Yenile
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !loaded ? (
        <QueueSkeleton />
      ) : (
        <>
          <Box sx={{ height: 4, mb: 0.5 }}>{loading && <LinearProgress />}</Box>
          <TableContainer component={Paper}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Durum</TableCell>
                <TableCell>Şirket</TableCell>
                <TableCell>Sektör</TableCell>
                <TableCell>Şehir</TableCell>
                <TableCell>Halk · Sülale</TableCell>
                <TableCell>NartGo Kıdemi</TableCell>
                <TableCell>Ek Bilgi Turu</TableCell>
                <TableCell>Başvuru</TableCell>
                <TableCell>Aksiyon</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queue.map((c) => (
                <TableRow key={c.caseId} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS_LABELS[c.status]}
                      color={STATUS_COLORS[c.status]}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {c.companyName ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{sectorName(c.sectorCodes, c.sectorCode)}</TableCell>
                  <TableCell>{c.city ?? '—'}</TableCell>
                  <TableCell>
                    {c.race ? `${RACE_LABELS[c.race]} · ${c.clanName ?? '—'}` : '—'}
                  </TableCell>
                  <TableCell>
                    {c.nartgoTenureMonths != null
                      ? `${c.nartgoTenureMonths} ay`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {c.needsInfoCount && c.needsInfoCount > 0 ? (
                      <Chip
                        size="small"
                        label={`${c.needsInfoCount}/2`}
                        color={c.needsInfoCount >= 2 ? 'error' : 'warning'}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(c.submittedAt)}
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => setDecideCaseId(c.caseId)}>
                      İncele & Karar Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {queue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      Kuyruk boş — incelenecek başvuru yok.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </>
      )}

      <NbVerificationDecideDialog
        open={!!decideCaseId}
        caseId={decideCaseId}
        onClose={() => setDecideCaseId(null)}
        onDecided={() => {
          setDecideCaseId(null);
          load();
        }}
      />
    </Box>
  );
}

/** İlk yükleme iskeleti — 9 kolonlu kuyruk tablosuyla hizalı. */
function QueueSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      <Box sx={{ height: 4, mb: 0.5 }}>
        <LinearProgress />
      </Box>
      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>Durum</TableCell>
              <TableCell>Şirket</TableCell>
              <TableCell>Sektör</TableCell>
              <TableCell>Şehir</TableCell>
              <TableCell>Halk · Sülale</TableCell>
              <TableCell>NartGo Kıdemi</TableCell>
              <TableCell>Ek Bilgi Turu</TableCell>
              <TableCell>Başvuru</TableCell>
              <TableCell>Aksiyon</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton variant="rounded" width={90} height={22} /></TableCell>
                <TableCell><Skeleton variant="text" width={140} /></TableCell>
                <TableCell><Skeleton variant="text" width={110} /></TableCell>
                <TableCell><Skeleton variant="text" width={70} /></TableCell>
                <TableCell><Skeleton variant="text" width={120} /></TableCell>
                <TableCell><Skeleton variant="text" width={50} /></TableCell>
                <TableCell><Skeleton variant="text" width={40} /></TableCell>
                <TableCell><Skeleton variant="text" width={90} /></TableCell>
                <TableCell><Skeleton variant="rounded" width={120} height={28} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
