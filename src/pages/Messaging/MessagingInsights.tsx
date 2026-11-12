import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../services/api';

/**
 * Uygulama içi mesajlaşmanın özeti (content-service /content/admin/insights/messaging).
 * Yalnız sayılar: mesaj metni ve kişi bilgisi bu sayfaya gelmez.
 */
interface Insights {
  periodDays: number;
  rooms: { opened: number; with_messages: number };
  messages: { messages: number; senders: number; active_rooms: number; read: number };
  conversations: { rooms: number; two_way: number; five_plus: number; median_messages: number };
  weekly: { week: string; messages: number; senders: number }[];
  requests: { state: string; rooms: number }[];
  reports: { report_type: string; reason: string; status: string; total: number }[];
  blocks: number;
}

const REQUEST_LABEL: Record<string, string> = {
  PENDING: 'Bekleyen istek',
  ACCEPTED: 'Kabul edilen istek',
  DECLINED: 'Silinen istek',
  LEGACY: 'İstek akışından önce açılan',
};

const pct = (part: number, whole: number) => (whole > 0 ? `%${Math.round((100 * part) / whole)}` : '—');

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={700}>{value}</Typography>
      {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
    </Paper>
  );
}

export default function MessagingInsights() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<any>('/content/admin/insights/messaging', { params: { days } })
      .then((res) => { if (active) setData(res.data?.data ?? null); })
      .catch((e: any) => { if (active) setError(e?.response?.data?.message ?? e?.message ?? 'Mesajlaşma özeti yüklenemedi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Mesajlaşma Özeti</Typography>
          <Typography variant="body2" color="text.secondary">
            Yalnız sayılar gösterilir; mesaj içerikleri panelde okunamaz.
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={days} onChange={(_, v) => v && setDays(v)}>
          <ToggleButton value={7}>7 gün</ToggleButton>
          <ToggleButton value={30}>30 gün</ToggleButton>
          <ToggleButton value={90}>90 gün</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box textAlign="center" py={6}><CircularProgress /></Box>}

      {!loading && data && (
        <>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={6} md={3}><Stat label="Mesaj" value={data.messages.messages} note={`${pct(data.messages.read, data.messages.messages)} okundu`} /></Grid>
            <Grid item xs={6} md={3}><Stat label="Mesaj atan kişi" value={data.messages.senders} /></Grid>
            <Grid item xs={6} md={3}><Stat label="Açılan sohbet" value={data.rooms.opened} note={`${data.rooms.with_messages} tanesinde mesaj var`} /></Grid>
            <Grid item xs={6} md={3}>
              <Stat
                label="Karşılık alan sohbet"
                value={pct(data.conversations.two_way, data.conversations.rooms)}
                note={`${data.conversations.two_way} / ${data.conversations.rooms} sohbet; ${data.conversations.five_plus} tanesi 5+ mesaj`}
              />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" mb={1}>Haftalık mesaj sayısı</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.weekly.map((w) => ({ ...w, label: new Date(w.week).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v: number, name: string) => [v, name === 'messages' ? 'Mesaj' : 'Gönderen']} />
                <Bar dataKey="messages" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" mb={1}>Mesaj istekleri</Typography>
                <Table size="small">
                  <TableBody>
                    {data.requests.map((r) => (
                      <TableRow key={r.state}>
                        <TableCell>{REQUEST_LABEL[r.state] ?? r.state}</TableCell>
                        <TableCell align="right">{r.rooms}</TableCell>
                      </TableRow>
                    ))}
                    {data.requests.length === 0 && <TableRow><TableCell>Bu dönemde sohbet açılmadı.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" mb={1}>Şikâyet ve engelleme</Typography>
                <Typography variant="body2" mb={1}>{data.blocks} engelleme</Typography>
                {data.reports.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Bu dönemde şikâyet yok.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow><TableCell>Tür</TableCell><TableCell>Neden</TableCell><TableCell>Durum</TableCell><TableCell align="right">Adet</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {data.reports.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.report_type}</TableCell><TableCell>{r.reason}</TableCell><TableCell>{r.status}</TableCell>
                          <TableCell align="right">{r.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
