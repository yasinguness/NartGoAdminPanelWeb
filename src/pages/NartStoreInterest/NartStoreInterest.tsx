import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Container, Typography, Stack, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, CircularProgress, Alert, IconButton, Tooltip, Tabs, Tab, Chip, Button,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Badge, Link,
} from '@mui/material';
import { Refresh as RefreshIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import {
  nartStoreApplicationService,
  nartStoreInterestService,
  NartStoreApplication,
  NartStoreApplicationStatus,
} from '../../services/nartstore/nartStoreInterestService';

/**
 * NartStore: satıcı başvuruları ve "Açılınca haber ver" listesi.
 *
 * Başvurular NartStore'da tutulur (store.nartgo.net/satici-ol). Bu sayfa
 * onları business-service üzerinden okur; onay ve ret NartStore'da çalışır
 * (mağaza açılışı, iyzico alt üye işyeri kaydı, başvurana e-posta dahil).
 * Kimlik ve IBAN burada maskeli; tam kayıt NartStore panelinde.
 */
export default function NartStoreInterest() {
  const [tab, setTab] = useState<'applications' | 'interest'>('applications');
  const pending = useQuery({
    queryKey: ['nartstore-applications', 'pending'],
    queryFn: () => nartStoreApplicationService.pendingCount(),
  });

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700}>NartStore</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        Satıcı başvuruları ve açılış bildirimini bekleyenler.
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab
          value="applications"
          label={
            <Badge color="warning" badgeContent={pending.data ?? 0} invisible={!pending.data}>
              <Box sx={{ pr: pending.data ? 1.5 : 0 }}>Satıcı başvuruları</Box>
            </Badge>
          }
        />
        <Tab value="interest" label="Haber ver listesi" />
      </Tabs>
      {tab === 'applications' ? <Applications /> : <InterestList />}
    </Container>
  );
}

const STATUS_LABEL: Record<NartStoreApplicationStatus, string> = {
  PENDING: 'Bekliyor',
  UNDER_REVIEW: 'İnceleniyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  CANCELED: 'İptal',
};

const STATUS_COLOR: Record<NartStoreApplicationStatus, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELED: 'default',
};

const date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const errorText = (e: any, fallback: string) => e?.response?.data?.message || fallback;

function Applications() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<NartStoreApplicationStatus | ''>('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<NartStoreApplication | null>(null);
  const [rejecting, setRejecting] = useState<NartStoreApplication | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const query = useQuery({
    queryKey: ['nartstore-applications', status, search, page],
    queryFn: () => nartStoreApplicationService.list({ status, search, page, limit: 20 }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['nartstore-applications'] });

  const approve = useMutation({
    mutationFn: (a: NartStoreApplication) => nartStoreApplicationService.approve(a.id),
    onSuccess: (_, a) => {
      setMessage({ type: 'success', text: `${a.storeName} onaylandı; mağaza açıldı ve başvurana e-posta gitti.` });
      setSelected(null);
      refresh();
    },
    onError: (e) => setMessage({ type: 'error', text: errorText(e, 'Onay tamamlanamadı.') }),
  });

  const reject = useMutation({
    mutationFn: ({ a, r }: { a: NartStoreApplication; r: string }) => nartStoreApplicationService.reject(a.id, r),
    onSuccess: (_, { a }) => {
      setMessage({ type: 'success', text: `${a.storeName} başvurusu reddedildi.` });
      setRejecting(null);
      setSelected(null);
      setReason('');
      refresh();
    },
    onError: (e) => setMessage({ type: 'error', text: errorText(e, 'Ret kaydedilemedi.') }),
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));
  const canDecide = (a: NartStoreApplication) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW';

  return (
    <>
      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <TextField
          select size="small" label="Durum" value={status} sx={{ minWidth: 180 }}
          onChange={(e) => { setStatus(e.target.value as NartStoreApplicationStatus | ''); setPage(1); }}
        >
          <MenuItem value="">Tümü</MenuItem>
          {(Object.keys(STATUS_LABEL) as NartStoreApplicationStatus[]).map((s) => (
            <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small" label="Mağaza, ad ya da e-posta" value={search} sx={{ flex: 1 }}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Tooltip title="Yenile">
          <IconButton onClick={refresh} size="small"><RefreshIcon /></IconButton>
        </Tooltip>
      </Stack>

      <Paper variant="outlined">
        {query.isError && (
          <Alert severity="error" sx={{ m: 2 }}>{errorText(query.error, 'Başvurular NartStore\'dan okunamadı.')}</Alert>
        )}
        {query.isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : items.length === 0 && !query.isError ? (
          <Typography sx={{ p: 4, textAlign: 'center' }} color="text.secondary">Bu filtrede başvuru yok.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mağaza</TableCell>
                  <TableCell>Başvuran</TableCell>
                  <TableCell>Tür</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(a)}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{a.storeName}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.whatYouSell || a.city || ''}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{a.applicantName || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.applicantEmail}</Typography>
                    </TableCell>
                    <TableCell>{a.merchantType === 'COMPANY' ? 'Şirket' : 'Bireysel'}</TableCell>
                    <TableCell>{date(a.submittedAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABEL[a.status] ?? a.status} color={STATUS_COLOR[a.status] ?? 'default'} />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {canDecide(a) && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" color="error" onClick={() => setRejecting(a)}>Reddet</Button>
                          <Button
                            size="small" variant="contained" disabled={approve.isPending}
                            onClick={() => approve.mutate(a)}
                          >
                            Onayla
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {pages > 1 && (
          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ p: 1.5 }}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</Button>
            <Typography variant="body2">{page} / {pages}</Typography>
            <Button size="small" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sonraki</Button>
          </Stack>
        )}
      </Paper>

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle>{selected.storeName}</DialogTitle>
            <DialogContent dividers>
              <Detail label="Durum" value={STATUS_LABEL[selected.status] ?? selected.status} />
              <Detail label="Başvuran" value={[selected.applicantName, selected.applicantEmail].filter(Boolean).join(' · ')} />
              <Detail label="E-posta doğrulandı" value={selected.applicantEmailVerified ? 'Evet' : 'Hayır'} />
              <Detail label="Telefon" value={selected.applicantPhone} />
              <Detail label="Ne satacak" value={selected.whatYouSell} />
              <Detail label="Tür" value={selected.merchantType === 'COMPANY' ? 'Şirket' : 'Bireysel'} />
              <Detail label="Şirket" value={selected.companyName} />
              <Detail label="Vergi dairesi / no" value={[selected.taxOffice, selected.taxNumber].filter(Boolean).join(' · ')} />
              <Detail label="T.C. kimlik no" value={selected.tcknMasked} />
              <Detail label="IBAN" value={selected.ibanMasked} />
              <Detail label="Hesap sahibi" value={selected.accountHolderName} />
              <Detail label="Adres" value={[selected.address, selected.city].filter(Boolean).join(', ')} />
              <Detail label="Ret gerekçesi" value={selected.rejectionReason} />
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 2 }}>
                Kimlik ve IBAN maskeli gösterilir. Tam kayıt için{' '}
                <Link href="https://store.nartgo.net/panel/platform/stores" target="_blank" rel="noopener">
                  NartStore paneli <OpenInNewIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} />
                </Link>
                . Onayda mağaza açılır, iyzico alt üye işyeri kaydı yapılır ve başvurana e-posta gider.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelected(null)}>Kapat</Button>
              {canDecide(selected) && (
                <>
                  <Button color="error" onClick={() => setRejecting(selected)}>Reddet</Button>
                  <Button variant="contained" disabled={approve.isPending} onClick={() => approve.mutate(selected)}>
                    Onayla
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Başvuruyu reddet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Gerekçe başvurana e-postayla gider. Neyi düzeltirse yeniden başvurabileceğini yaz.
          </Typography>
          <TextField
            autoFocus fullWidth multiline minRows={3} label="Gerekçe" value={reason}
            inputProps={{ maxLength: 500 }}
            onChange={(e) => setReason(e.target.value)}
            helperText={`${reason.length}/500`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>Vazgeç</Button>
          <Button
            color="error" variant="contained"
            disabled={!reason.trim() || reject.isPending}
            onClick={() => rejecting && reject.mutate({ a: rejecting, r: reason.trim() })}
          >
            Reddet
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

function InterestList() {
  const summary = useQuery({
    queryKey: ['nartstore-interest', 'summary'],
    queryFn: () => nartStoreInterestService.summary(),
  });
  const rows = useQuery({
    queryKey: ['nartstore-interest', 'list'],
    queryFn: () => nartStoreInterestService.list(),
  });
  const items = rows.data?.content ?? [];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="body2" color="text.secondary">Açılınca haber bekleyen</Typography>
          <Typography variant="h4" fontWeight={700}>{summary.isLoading ? '…' : (summary.data?.notifyCount ?? 0)}</Typography>
        </Paper>
        <Tooltip title="Yenile">
          <IconButton onClick={() => { summary.refetch(); rows.refetch(); }} size="small"><RefreshIcon /></IconButton>
        </Tooltip>
      </Stack>
      <Paper variant="outlined">
        {rows.isError && <Alert severity="error" sx={{ m: 2 }}>Liste yüklenemedi.</Alert>}
        {rows.isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : items.length === 0 ? (
          <Typography sx={{ p: 4, textAlign: 'center' }} color="text.secondary">Henüz kayıt yok.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kişi</TableCell>
                  <TableCell>Tarih</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.displayName || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.userEmail}</Typography>
                    </TableCell>
                    <TableCell>{date(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </>
  );
}
