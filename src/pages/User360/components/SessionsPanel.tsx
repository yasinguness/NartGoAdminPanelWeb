import { Paper, Typography, Stack, Box, Skeleton, Chip } from '@mui/material';
import { Laptop as DeviceIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import { relativeTime } from './helpers';

interface Session {
  id?: string;
  deviceInfo?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  createdAt?: string;
  loggedInAt?: string;
  status?: string;
}

interface Props {
  sessions?: Session[];
  totalLogins?: number;
  totalFailed?: number;
  lastLogin?: string;
  loading?: boolean;
}

export default function SessionsPanel({ sessions, totalLogins, totalFailed, lastLogin, loading }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', height: '100%' }}>
      <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase', mb: 2 }}>
        Son Oturumlar
      </Typography>

      {/* Login stats */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {totalLogins !== undefined && (
          <Chip
            size="small"
            label={`${totalLogins} giriş`}
            sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 10, fontWeight: 700, height: 20 }}
          />
        )}
        {totalFailed !== undefined && totalFailed > 0 && (
          <Chip
            size="small"
            label={`${totalFailed} başarısız`}
            sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 10, fontWeight: 700, height: 20 }}
          />
        )}
        {lastLogin && (
          <Chip
            size="small"
            label={`son: ${relativeTime(lastLogin)}`}
            sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(243,238,224,0.7)', fontSize: 10, fontWeight: 600, height: 20 }}
          />
        )}
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rectangular" height={48} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
          ))}
        </Stack>
      ) : !sessions || sessions.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
            Oturum kaydı yok
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {sessions.slice(0, 10).map((s, idx) => (
            <Box
              key={s.id || idx}
              sx={{
                p: 1.25,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <DeviceIcon sx={{ fontSize: 12, color: 'rgba(243,238,224,0.5)' }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#F3EEE0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.deviceInfo || s.userAgent?.split(' ')[0] || 'Bilinmeyen cihaz'}
                    </Typography>
                  </Stack>
                  {(s.ipAddress || s.location) && (
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                      <LocationIcon sx={{ fontSize: 10, color: 'rgba(243,238,224,0.4)' }} />
                      <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.5)', fontFamily: 'monospace' }}>
                        {[s.ipAddress, s.location].filter(Boolean).join(' · ')}
                      </Typography>
                    </Stack>
                  )}
                </Box>
                <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.4)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {relativeTime(s.loggedInAt || s.createdAt)}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
