import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VerifiedIcon from '@mui/icons-material/Verified';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  NbMember,
  NbMemberStatus,
  MembershipTier,
  PagedResult,
} from '../../services/nartbusiness/nbTypes';
import NbCreateMemberDialog from './NbCreateMemberDialog';

const STATUS_LABELS: Record<NbMemberStatus, string> = {
  SUBMITTED: 'Komite İnceliyor',
  NEEDS_INFO: 'Ek Bilgi Bekleniyor',
  REJECTED: 'Reddedildi',
  APPROVED_PENDING_PAYMENT: 'Onay - Ödeme Bekliyor',
  APPROVED_EXPIRED: 'Onay Süresi Doldu',
  ACTIVE: 'Aktif',
  EXPIRED: 'Süresi Geçti',
  SUSPENDED: 'Askıda',
  CANCELLED: 'İptal',
  PENDING_VERIFICATION: 'Doğrulama Bekliyor (eski)',
};

const STATUS_COLORS: Record<
  NbMemberStatus,
  'success' | 'warning' | 'error' | 'default' | 'info' | 'primary'
> = {
  ACTIVE: 'success',
  SUBMITTED: 'primary',
  NEEDS_INFO: 'warning',
  REJECTED: 'error',
  APPROVED_PENDING_PAYMENT: 'info',
  APPROVED_EXPIRED: 'error',
  EXPIRED: 'error',
  SUSPENDED: 'error',
  CANCELLED: 'default',
  PENDING_VERIFICATION: 'warning',
};

const TIER_LABELS: Record<MembershipTier, string> = {
  KURUCU: 'Kurucu',
  STANDART: 'Standart',
  GENC_GIRISIMCI: 'Genç Girişimci',
  PATRON: 'Patron',
};

export default function NbMembers() {
  const [data, setData] = useState<PagedResult<NbMember> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<NbMemberStatus | ''>('');
  const [tier, setTier] = useState<MembershipTier | ''>('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => {
    setLoading(true);
    nbAdminService
      .listMembers({
        status: status || undefined,
        tier: tier || undefined,
        page,
        size: 25,
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? 'Veri yüklenemedi');
        setLoading(false);
      });
  };

  useEffect(load, [page, status, tier]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight={600}>
          NartBusiness — Üyeler
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Manuel Üye Oluştur
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Durum</InputLabel>
          <Select
            label="Durum"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as NbMemberStatus | '');
              setPage(0);
            }}
          >
            <MenuItem value="">Hepsi</MenuItem>
            {(Object.keys(STATUS_LABELS) as NbMemberStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Kademe</InputLabel>
          <Select
            label="Kademe"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value as MembershipTier | '');
              setPage(0);
            }}
          >
            <MenuItem value="">Hepsi</MenuItem>
            {(Object.keys(TIER_LABELS) as MembershipTier[]).map((t) => (
              <MenuItem key={t} value={t}>
                {TIER_LABELS[t]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && data && (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Şirket</TableCell>
                  <TableCell>Kademe</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Halk · Sülale</TableCell>
                  <TableCell>Şehir</TableCell>
                  <TableCell>Rozet</TableCell>
                  <TableCell>Katılım</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.content.map((m) => (
                  <TableRow key={m.memberId} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {m.companyName ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {m.memberId.substring(0, 8)}…
                      </Typography>
                    </TableCell>
                    <TableCell>{TIER_LABELS[m.tier]}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_LABELS[m.status]}
                        color={STATUS_COLORS[m.status]}
                      />
                    </TableCell>
                    <TableCell>
                      {m.race ? `${m.race} · ${m.clanName ?? '—'}` : '—'}
                    </TableCell>
                    <TableCell>{m.city ?? '—'}</TableCell>
                    <TableCell>
                      {m.verifiedBusiness && (
                        <Chip
                          size="small"
                          icon={<VerifiedIcon />}
                          label="Doğrulanmış"
                          color="info"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(m.joinedAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))}
                {data.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        Üye bulunamadı.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack alignItems="center" sx={{ mt: 2 }}>
            <Pagination
              count={data.totalPages}
              page={page + 1}
              onChange={(_, p) => setPage(p - 1)}
            />
          </Stack>
        </>
      )}

      <NbCreateMemberDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </Box>
  );
}
