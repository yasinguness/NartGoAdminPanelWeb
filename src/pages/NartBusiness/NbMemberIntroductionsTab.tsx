import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Pagination, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  nbAdminService,
  NB_INTRODUCTION_STATUS_LABEL,
  type NbIntroduction,
  type NbIntroductionStatus,
} from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { nb, nbRadius, nbType } from '../../theme/nbBrand';
import { useRole } from '../../hooks/useRole';
import { formatDate } from './nbIntroMatch';

const STATUSES: NbIntroductionStatus[] = ['INTRODUCED', 'MEETING_PENDING', 'MET', 'CLOSED_SUCCESS', 'CLOSED_NO_RESULT'];

/**
 * Üye detayındaki "Tanıştırmalar" sekmesi: bu üyenin bütün tanıştırmaları.
 *
 * Eskiden yalnız genel "Tanıştırmalar" ekranında görünüyordu; üyeye bakan
 * admin onun daha önce kimlerle tanıştırıldığını ve sonucunu bilmeden yeni
 * bir tanıştırmaya girişiyordu. Durum ve not buradan da güncellenebiliyor.
 * Her satırda bu üyenin gördüğü metin gösteriliyor (taraflı metin varsa o).
 */
export default function NbMemberIntroductionsTab({
  memberId,
  onIntroduce,
  refreshKey,
}: {
  memberId: string;
  onIntroduce: () => void;
  /** Yeni tanıştırma sonrası listeyi tazelemek için. */
  refreshKey?: number;
}) {
  const navigate = useNavigate();
  const { isAdmin, hasRole } = useRole();
  const canManage = isAdmin || hasRole('NB_ADMIN');
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [pages, setPages] = useState(0);
  const [stats, setStats] = useState<{ total: number; open: number; successful: number }>();
  const [items, setItems] = useState<NbIntroduction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setItems(null);
    setError(null);
    nbAdminService
      .listIntroductions({ memberId, page, size: 20 })
      .then((r) => { if (active) { setItems(r.items); setPages(r.totalPages); setStats(r.stats); } })
      .catch((e) => {
        if (!active) return;
        setError(nbErrorMessage(e, 'Tanıştırmalar alınamadı.'));
      });
    return () => { active = false; };
  }, [memberId, refreshKey, page, reload]);

  const save = async (row: NbIntroduction, patch: { status?: NbIntroductionStatus; adminNote?: string }) => {
    setError(null);
    setSavingId(row.id);
    try {
      const updated = await nbAdminService.updateIntroduction(row.id, patch);
      setReload((v) => v + 1);
      setItems((list) => list?.map((i) => (i.id === row.id ? { ...i, ...updated } : i)) ?? null);
    } catch (e) {
      setError(nbErrorMessage(e, 'Güncellenemedi.'));
    } finally {
      setSavingId(null);
    }
  };

  if (items === null && !error) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }



  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 13, color: nb.textMuted, flex: 1 }}>
          {stats ? `${stats.total} tanıştırma · ${stats.open} açık · ${stats.successful} iş birliğine döndü` : 'Tanıştırma geçmişi ve sonuç takibi'}
        </Typography>
        <Button disabled={!canManage} variant="contained" onClick={onIntroduce} sx={{ textTransform: 'none', bgcolor: nb.navy, '&:hover': { bgcolor: nb.navySoft } }}>
          Yeni tanıştırma
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={() => setReload((v) => v + 1)}>Tekrar dene</Button>}>{error}</Alert>}

      {items?.length === 0 && !error && <Typography sx={{ mb: 2 }}>Bu sayfada tanıştırma bulunmuyor.</Typography>}
      <Stack spacing={1.25}>
        {items?.map((row) => {
          const isA = row.memberAId === memberId;
          const otherId = isA ? row.memberBId : row.memberAId;
          const otherName = isA ? row.memberBName : row.memberAName;
          const seen = (isA ? row.reasonForA : row.reasonForB) || row.reason;
          const note = notes[row.id] ?? row.adminNote ?? '';
          return (
            <Box key={row.id} sx={{ p: 2, borderRadius: `${nbRadius.card}px`, bgcolor: nb.surface, border: `1px solid ${nb.border}` }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Button
                    onClick={() => navigate(`/nartbusiness/members/${otherId}`)}
                    sx={{ p: 0, minWidth: 0, textTransform: 'none', fontSize: 14.5, fontWeight: 600, color: nb.text, justifyContent: 'flex-start' }}
                  >
                    {otherName}
                  </Button>
                  <Typography sx={{ fontSize: 11.5, color: nb.textFaint, fontFamily: nbType.mono }}>
                    {formatDate(row.createdAt)}
                  </Typography>
                </Box>
                <TextField
                  label="Tanıştırma durumu"
                  select
                  size="small"
                  value={row.status}
                  disabled={!!savingId || !canManage}
                  onChange={(e) => void save(row, { status: e.target.value as NbIntroductionStatus })}
                  sx={{ minWidth: 190, bgcolor: nb.inputBg }}
                >
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {NB_INTRODUCTION_STATUS_LABEL[s]}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Typography sx={{ mt: 1.25, fontSize: 12.5, color: nb.text, whiteSpace: 'pre-wrap' }}>
                <Box component="span" sx={{ ...nbType.label, color: nb.textFaint, mr: 1 }}>Bu üyenin gördüğü</Box>
                {seen}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                <TextField
                  size="small"
                  label="Takip notu"
                  multiline
                  inputProps={{ maxLength: 4000 }}
                  disabled={!canManage || !!savingId}
                  value={note}
                  onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                  fullWidth
                  sx={{ bgcolor: nb.inputBg }}
                />
                <Button
                  size="small"
                  disabled={!canManage || !!savingId || note === (row.adminNote ?? '')}
                  onClick={() => void save(row, { adminNote: note })}
                  sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                  Notu kaydet
                </Button>
              </Stack>
            </Box>
          );
        })}
      </Stack>
      {pages > 1 && <Pagination sx={{ mt: 2 }} count={pages} page={page + 1} disabled={!!savingId} onChange={(_, v) => setPage(v - 1)} />}
    </Box>
  );
}
