import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { relativeDate, fullDate } from '../../utils/nbDisplay';
import { Replay as ReplayIcon } from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbDlqEntry } from '../../services/nartbusiness/nbTypes';

const SERVICES = [
  { id: 'membership', label: 'Membership' },
  { id: 'verification', label: 'Verification' },
  { id: 'directory', label: 'Directory' },
  { id: 'needs', label: 'Needs' },
  { id: 'messaging', label: 'Messaging' },
];

export default function NbDlqPanel() {
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<NbDlqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replaying, setReplaying] = useState<string | null>(null);

  const service = SERVICES[tab].id;

  const load = () => {
    setLoading(true);
    setError(null);
    nbAdminService
      .listDlqEntries(service)
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? 'Veri yüklenemedi');
        setLoading(false);
      });
  };

  useEffect(load, [service]);

  const replay = async (id: string) => {
    setReplaying(id);
    try {
      await nbAdminService.replayDlqEntry(service, id);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Tekrar deneme başarısız');
    } finally {
      setReplaying(null);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        NartBusiness — Dead Letter Queue
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Outbox event'leri 10 deneme sonrası publish edilemezse DLQ topic'ine
        taşınır ve burada listelenir. Replay = retry sayacı sıfırlanır, event
        bir sonraki publisher tick'inde tekrar Kafka'ya gönderilir.
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          {SERVICES.map((s) => (
            <Tab key={s.id} label={s.label} />
          ))}
        </Tabs>
      </Paper>

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
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Konu (Topic)</TableCell>
                <TableCell>Olay Tipi</TableCell>
                <TableCell>Aggregate ID</TableCell>
                <TableCell>Deneme</TableCell>
                <TableCell>Hata</TableCell>
                <TableCell>DLQ Tarihi</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {e.topic}
                    </Typography>
                  </TableCell>
                  <TableCell>{e.eventType}</TableCell>
                  <TableCell>
                    <Tooltip title={e.aggregateId} arrow>
                      <Typography variant="body2" fontFamily="monospace" sx={{ cursor: 'default' }}>
                        {e.aggregateId.substring(0, 8)}…
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{e.retryCount}</TableCell>
                  <TableCell>
                    {e.lastError ? (
                      <Tooltip title={e.lastError}>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {e.lastError}
                        </Typography>
                      </Tooltip>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={fullDate(e.deadLetteredAt)} arrow>
                      <Typography variant="body2">{relativeDate(e.deadLetteredAt)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<ReplayIcon />}
                      onClick={() => replay(e.id)}
                      disabled={replaying === e.id}
                    >
                      Tekrar Dene
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      DLQ boş 🎉
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
