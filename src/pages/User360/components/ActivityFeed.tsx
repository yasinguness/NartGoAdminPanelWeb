import { Paper, Box, Typography, Stack, Skeleton, Chip } from '@mui/material';
import { relativeTime } from './helpers';

interface ActivityItem {
  id?: string;
  action?: string;
  status?: string;
  createdAt?: string;
  ipAddress?: string;
  deviceInfo?: string;
  failureReason?: string;
}

interface Props {
  items?: ActivityItem[];
  loading?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#22c55e',
  LOGOUT: '#64748b',
  REGISTER: '#3b82f6',
  PASSWORD_RESET: '#f59e0b',
  PASSWORD_CHANGE: '#f59e0b',
  TWO_FACTOR_AUTH: '#8b5cf6',
  EMAIL_VERIFICATION: '#22c55e',
  REFRESH_TOKEN: '#64748b',
};

const ACTION_LABEL: Record<string, string> = {
  LOGIN: 'Giriş',
  LOGOUT: 'Çıkış',
  REGISTER: 'Kayıt',
  PASSWORD_RESET: 'Şifre sıfırlama',
  PASSWORD_CHANGE: 'Şifre değişti',
  TWO_FACTOR_AUTH: '2FA',
  EMAIL_VERIFICATION: 'Mail doğrulama',
  REFRESH_TOKEN: 'Token yenileme',
};

export default function ActivityFeed({ items, loading }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', height: '100%' }}>
      <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase', mb: 2 }}>
        Aktivite Zaman Çizelgesi
      </Typography>

      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="rectangular" height={36} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }} />
          ))}
        </Stack>
      ) : !items || items.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
            Aktivite yok
          </Typography>
        </Box>
      ) : (
        <Box sx={{ maxHeight: 380, overflowY: 'auto', pr: 1 }}>
          <Stack spacing={1.25}>
            {items.map((item, idx) => {
              const action = item.action || '—';
              const color = ACTION_COLORS[action] || '#64748b';
              const label = ACTION_LABEL[action] || action;
              const isFailed = item.status && item.status !== 'SUCCESS';

              return (
                <Stack
                  key={item.id || idx}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{
                    position: 'relative',
                    pl: 2,
                    borderLeft: `2px solid ${isFailed ? '#ef4444' : color}`,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#F3EEE0' }}>
                        {label}
                      </Typography>
                      {isFailed && (
                        <Chip
                          label="BAŞARISIZ"
                          size="small"
                          sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 8, fontWeight: 800, height: 16, letterSpacing: 0.5 }}
                        />
                      )}
                    </Stack>
                    {(item.ipAddress || item.deviceInfo) && (
                      <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.5)', fontFamily: 'monospace', mt: 0.25 }}>
                        {[item.ipAddress, item.deviceInfo].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
                    {item.failureReason && (
                      <Typography sx={{ fontSize: 10, color: '#ef4444', mt: 0.25, fontStyle: 'italic' }}>
                        {item.failureReason}
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.4)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {relativeTime(item.createdAt)}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
