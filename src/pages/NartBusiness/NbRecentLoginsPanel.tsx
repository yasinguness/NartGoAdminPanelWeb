import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { NbPanel } from '../../components/nartbusiness/ui';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbLoginLogRow } from '../../services/nartbusiness/nbAdminService';

/**
 * Panodaki "son girişler" bölümü.
 *
 * Veri auth_logs'tan geliyor (bkz. NbLoginLogs). Panoda amaç arşiv taramak
 * değil, "kim aktif, kim hiç girmiyor, başarısız deneme var mı" sorusuna
 * bakışta cevap vermek; o yüzden az satır ve başarısız girişler vurgulu.
 */

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} saat önce`;
  const day = Math.round(hour / 24);
  if (day < 30) return `${day} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { dateStyle: 'short' });
}

export default function NbRecentLoginsPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<NbLoginLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    nbAdminService
      .getLoginLogs({ page: 0, size: 8 })
      .then((res) => {
        if (cancelled) return;
        setRows(res.content ?? []);
        setUnavailable(!!res.degraded);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <NbPanel
      title="Son girişler"
      hint="NartBusiness üyeleri"
      icon={<LoginOutlinedIcon />}
      action={
        <Button size="small" onClick={() => navigate('/nartbusiness/login-logs')}>
          Tümü
        </Button>
      }
    >
      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={22} />
        </Box>
      ) : unavailable ? (
        <Typography variant="body2" color="text.secondary" py={2}>
          Kimlik servisine ulaşılamadı. Bu, giriş olmadığı anlamına gelmez.
        </Typography>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" py={2}>
          Henüz giriş kaydı yok.
        </Typography>
      ) : (
        <Stack spacing={0.25}>
          {rows.map((r) => {
            const ok = r.status === 'SUCCESS';
            return (
              <Stack
                key={r.id}
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{ py: 0.75 }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: (t) => (ok ? t.palette.success.main : t.palette.error.main),
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" noWrap>
                    {r.fullName || r.email || 'Bilinmeyen üye'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {relTime(r.occurredAt)}
                    {r.ipAddress ? ` · ${r.ipAddress}` : ''}
                  </Typography>
                </Box>
                {!ok && (
                  <Tooltip title={r.failureReason ?? 'Başarısız giriş'} arrow>
                    <Chip size="small" color="error" variant="outlined" label="Başarısız" />
                  </Tooltip>
                )}
              </Stack>
            );
          })}
        </Stack>
      )}
    </NbPanel>
  );
}
