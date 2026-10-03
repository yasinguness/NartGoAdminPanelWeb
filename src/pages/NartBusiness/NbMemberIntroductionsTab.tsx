import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  nbAdminService,
  NB_INTRODUCTION_STATUS_LABEL,
  type NbIntroduction,
  type NbIntroductionStatus,
} from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { nb, nbRadius, nbType } from '../../theme/nbBrand';
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
  const [items, setItems] = useState<NbIntroduction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setItems(null);
    setError(null);
    nbAdminService
      .listIntroductions({ memberId, page: 0, size: 100 })
      .then((r) => setItems(r.items))
      .catch((e) => {
        setItems([]);
        setError(nbErrorMessage(e, 'Tanıştırmalar alınamadı.'));
      });
  }, [memberId, refreshKey]);

  const save = async (row: NbIntroduction, patch: { status?: NbIntroductionStatus; adminNote?: string }) => {
    setSavingId(row.id);
    try {
      const updated = await nbAdminService.updateIntroduction(row.id, patch);
      setItems((list) => list?.map((i) => (i.id === row.id ? { ...i, ...updated } : i)) ?? null);
    } catch (e) {
      setError(nbErrorMessage(e, 'Güncellenemedi.'));
    } finally {
      setSavingId(null);
    }
  };

  if (items === null) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  const won = items.filter((i) => i.status === 'CLOSED_SUCCESS').length;
  const open = items.filter((i) => !i.status.startsWith('CLOSED')).length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 13, color: nb.textMuted, flex: 1 }}>
          {items.length === 0
            ? 'Bu üye henüz kimseyle tanıştırılmadı.'
            : `${items.length} tanıştırma · ${open} açık · ${won} iş birliğine döndü`}
        </Typography>
        <Button variant="contained" onClick={onIntroduce} sx={{ textTransform: 'none', bgcolor: nb.navy, '&:hover': { bgcolor: nb.navySoft } }}>
          Yeni tanıştırma
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={1.25}>
        {items.map((row) => {
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
                  select
                  size="small"
                  value={row.status}
                  disabled={savingId === row.id}
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
                  placeholder="Takip notu…"
                  value={note}
                  onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                  fullWidth
                  sx={{ bgcolor: nb.inputBg }}
                />
                <Button
                  size="small"
                  disabled={savingId === row.id || note === (row.adminNote ?? '')}
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
    </Box>
  );
}
