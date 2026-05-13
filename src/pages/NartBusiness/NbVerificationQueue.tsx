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
  Divider,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
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
  Typography,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import GavelIcon from '@mui/icons-material/Gavel';
import ReplyIcon from '@mui/icons-material/Reply';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  CaseTimelineEntry,
  CaseTimelineEntryType,
  NbRace,
  VerificationCase,
  VerificationCaseStatus,
} from '../../services/nartbusiness/nbTypes';

const STATUS_LABELS: Record<VerificationCaseStatus, string> = {
  SUBMITTED: 'Yeni',
  IN_REVIEW: 'İncelemede',
  NEEDS_INFO: 'Ek Bilgi Gerekli',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};

const STATUS_COLORS: Record<
  VerificationCaseStatus,
  'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'
> = {
  SUBMITTED: 'primary',
  IN_REVIEW: 'info',
  NEEDS_INFO: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

const RACE_LABELS: Record<NbRace, string> = {
  adige: 'Adige',
  abhaz: 'Abhaz',
  cecen: 'Çeçen',
  karacay: 'Karaçay',
  dagistan: 'Dağıstan',
  oset: 'Oset',
  other: 'Diğer',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  VERGI_LEVHASI: 'Vergi Levhası',
  TICARET_SICIL: 'Ticaret Sicil',
  IMZA_SIRKULERI: 'İmza Sirküleri',
  KIMLIK: 'Kimlik',
  KULTUREL_BEYAN: 'Kültürel Beyan',
};

const STATUS_FILTERS: Array<VerificationCaseStatus | 'ALL'> = [
  'ALL',
  'SUBMITTED',
  'NEEDS_INFO',
  'IN_REVIEW',
];

export default function NbVerificationQueue() {
  const [queue, setQueue] = useState<VerificationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<VerificationCase | null>(null);
  const [timeline, setTimeline] = useState<CaseTimelineEntry[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [voteNote, setVoteNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
      })
      .catch((err) => {
        setError(err?.message ?? 'Veri yüklenemedi');
        setLoading(false);
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [statusFilter]);

  const openDetail = async (caseId: string) => {
    setDetail(null);
    setTimeline(null);
    setTimelineLoading(true);
    const [c, tl] = await Promise.all([
      nbAdminService.getVerificationCase(caseId),
      nbAdminService.getCaseTimeline(caseId).catch(() => []),
    ]);
    setDetail(c);
    setTimeline(tl);
    setTimelineLoading(false);
  };

  const vote = async (v: 'APPROVE' | 'REJECT' | 'NEEDS_INFO') => {
    if (!detail) return;
    setSubmitting(true);
    try {
      await nbAdminService.submitCommitteeVote(detail.caseId, { vote: v, note: voteNote });
      setDetail(null);
      setVoteNote('');
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Oy gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        NartBusiness — Doğrulama Kuyruğu
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sprint 23 — Komite-onaylı-sonra-öde akışı. Üye ön başvuruda hafif KYC
        verir (sosyal kanıt + Kafkas kimliği); komite onaylar; üye 7 gün
        içinde öder. NEEDS_INFO döngüsü 2 turla sınırlıdır (3.'de otomatik REJECTED).
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

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Durum</TableCell>
                <TableCell>Şirket</TableCell>
                <TableCell>Sektör</TableCell>
                <TableCell>Şehir</TableCell>
                <TableCell>Halk · Sülale</TableCell>
                <TableCell>NartGo</TableCell>
                <TableCell>NEEDS_INFO</TableCell>
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
                  <TableCell>{c.sectorCode ?? '—'}</TableCell>
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
                    {new Date(c.submittedAt).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openDetail(c.caseId)}>
                      İncele
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
      )}

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>Başvuru İncelemesi</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  size="small"
                  label={STATUS_LABELS[detail.status]}
                  color={STATUS_COLORS[detail.status]}
                />
                {detail.tier && (
                  <Chip size="small" label={detail.tier} variant="outlined" />
                )}
                {detail.needsInfoCount != null && detail.needsInfoCount > 0 && (
                  <Chip
                    size="small"
                    color={detail.needsInfoCount >= 2 ? 'error' : 'warning'}
                    label={`NEEDS_INFO ${detail.needsInfoCount}/2`}
                  />
                )}
              </Stack>

              {/* Şirket bilgisi */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Şirket Bilgisi
                </Typography>
                <Stack spacing={0.5}>
                  <Row label="Şirket adı" value={detail.companyName} />
                  <Row label="Sektör" value={detail.sectorCode} />
                  <Row label="Şehir" value={detail.city} />
                </Stack>
              </Box>

              <Divider />

              {/* Kafkas kimliği */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Kafkas Kimliği
                </Typography>
                <Stack spacing={0.5}>
                  <Row
                    label="Halk"
                    value={detail.race ? RACE_LABELS[detail.race] : undefined}
                  />
                  <Row label="Sülale" value={detail.clanName} />
                  <Row label="Memleket" value={detail.hometownDetail} />
                  <Row
                    label="NartGo tenure"
                    value={
                      detail.nartgoTenureMonths != null
                        ? `${detail.nartgoTenureMonths} ay`
                        : undefined
                    }
                  />
                </Stack>
              </Box>

              <Divider />

              {/* Sosyal kanıt */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sosyal Kanıt
                </Typography>
                <Stack spacing={0.5}>
                  <LinkRow label="LinkedIn" url={detail.linkedinUrl} />
                  <LinkRow label="Web sitesi" url={detail.websiteUrl} />
                  <LinkRow label="Instagram" url={detail.instagramUrl} />
                </Stack>
              </Box>

              <Divider />

              {/* IDs */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sistem Bilgisi
                </Typography>
                <Stack spacing={0.5}>
                  <Row label="Case ID" value={detail.caseId} monospace />
                  <Row label="Üye ID" value={detail.memberId} monospace />
                  <Row label="Kullanıcı ID" value={detail.userId} monospace />
                </Stack>
              </Box>

              <Divider />

              {/* Sprint 23 — Vakanın tarihçesi */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <HistoryIcon fontSize="small" />
                  <Typography variant="subtitle2">Vaka Tarihçesi</Typography>
                </Stack>
                <CaseTimelineList entries={timeline} loading={timelineLoading} />
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Yüklenen Belgeler
                </Typography>
                {detail.documents.length === 0 ? (
                  <Alert severity="info">
                    Belge yüklenmedi — hafif KYC akışında ön başvuru için belge
                    zorunlu değil. Komite ek belge isterse NEEDS_INFO ile talep eder.
                  </Alert>
                ) : (
                  <Stack spacing={1}>
                    {detail.documents.map((d) => (
                      <Stack
                        key={d.id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="body2">
                          {DOC_TYPE_LABELS[d.type] ?? d.type}
                        </Typography>
                        <Link href={d.mediaUrl} target="_blank" rel="noreferrer">
                          Görüntüle
                        </Link>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>

              <TextField
                label="Oy Notu (opsiyonel)"
                value={voteNote}
                onChange={(e) => setVoteNote(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Kapat</Button>
          <Button
            color="warning"
            onClick={() => vote('NEEDS_INFO')}
            disabled={submitting}
          >
            Ek Bilgi
          </Button>
          <Button color="error" onClick={() => vote('REJECT')} disabled={submitting}>
            Reddet
          </Button>
          <Button
            color="success"
            variant="contained"
            startIcon={<VerifiedIcon />}
            onClick={() => vote('APPROVE')}
            disabled={submitting}
          >
            Onayla (Ödemeye Açar)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Row({
  label,
  value,
  monospace,
}: {
  label: string;
  value?: string | null;
  monospace?: boolean;
}) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontFamily={monospace ? 'monospace' : undefined}>
        {value ?? '—'}
      </Typography>
    </Stack>
  );
}

function LinkRow({ label, url }: { label: string; url?: string }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
        {label}
      </Typography>
      {url ? (
        <Link href={url} target="_blank" rel="noreferrer" variant="body2">
          {url}
        </Link>
      ) : (
        <Typography variant="body2">—</Typography>
      )}
    </Stack>
  );
}

function CaseTimelineList({
  entries,
  loading,
}: {
  entries: CaseTimelineEntry[] | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={1}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  if (!entries || entries.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Henüz aksiyon yok.
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5} sx={{ pl: 0.5 }}>
      {entries.map((e, i) => (
        <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
          {timelineIcon(e.type)}
          <Stack flex={1}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="body2" fontWeight={600}>
                {e.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(e.at).toLocaleString('tr-TR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </Typography>
            </Stack>
            {e.actorUserId && (
              <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                {e.actorUserId.substring(0, 8)}…
              </Typography>
            )}
            {e.detail && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}
              >
                {e.detail}
              </Typography>
            )}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

function timelineIcon(type: CaseTimelineEntryType) {
  const props = { fontSize: 'small' as const, sx: { mt: 0.25 } };
  switch (type) {
    case 'SUBMITTED':
      return <ReplyIcon color="primary" {...props} />;
    case 'VOTE':
      return <GavelIcon color="info" {...props} />;
    case 'NEEDS_INFO':
      return <AssignmentLateIcon color="warning" {...props} />;
    case 'USER_RESPONSE':
      return <ReplyIcon color="primary" {...props} />;
    case 'APPROVED':
      return <CheckCircleIcon color="success" {...props} />;
    case 'REJECTED':
      return <CancelIcon color="error" {...props} />;
    default:
      return <HistoryIcon {...props} />;
  }
}
