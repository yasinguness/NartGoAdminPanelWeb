import { Paper, Stack, Avatar, Typography, Box, Chip, Divider, Skeleton, Button } from '@mui/material';
import { Mail as MailIcon, Cake as CakeIcon, Place as PlaceIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { safeDate } from './helpers';

interface Props {
  user: any;
  loading?: boolean;
}

export default function ProfileCard({ user, loading }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)' }}>
        <Skeleton variant="circular" width={80} height={80} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" height={28} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Skeleton variant="text" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
      </Paper>
    );
  }

  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email;
  const initials = (fullName || '?').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
  const roles: string[] = Array.isArray(user.role) ? user.role : (user.role ? Array.from(user.role) : []);
  const status = user.userStatus || user.status;
  const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    ACTIVE: 'success', PENDING: 'warning', BLOCKED: 'error', INACTIVE: 'default',
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.18)' }}>
      <Stack spacing={2} alignItems="center">
        <Avatar
          src={user.profileImage || user.imageUrl}
          sx={{
            width: 84, height: 84,
            bgcolor: 'rgba(201,162,39,0.15)',
            color: '#C9A227',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 700,
            border: '2px solid rgba(201,162,39,0.3)',
          }}
        >
          {initials}
        </Avatar>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: 20,
            fontWeight: 700,
            color: '#F3EEE0',
            lineHeight: 1.2,
          }}>
            {fullName}
          </Typography>
          {status && (
            <Chip
              label={status}
              size="small"
              color={statusColor[status] || 'default'}
              sx={{ mt: 1, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}
            />
          )}
        </Box>

        {roles.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center">
            {roles.slice(0, 3).map((r, i) => (
              <Chip
                key={i}
                label={r}
                size="small"
                sx={{
                  bgcolor: 'rgba(201,162,39,0.1)',
                  color: '#C9A227',
                  fontSize: 9,
                  fontWeight: 700,
                  height: 20,
                  letterSpacing: 0.5,
                }}
              />
            ))}
          </Stack>
        )}

        <Divider flexItem sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        <Stack spacing={1} sx={{ width: '100%' }}>
          <InfoRow icon={<MailIcon sx={{ fontSize: 14 }} />} text={user.email || '—'} />
          {user.birthDate && (
            <InfoRow icon={<CakeIcon sx={{ fontSize: 14 }} />} text={safeDate(user.birthDate)} />
          )}
          {(user.currentCity || user.currentDistrict) && (
            <InfoRow
              icon={<PlaceIcon sx={{ fontSize: 14 }} />}
              text={[user.currentCity, user.currentDistrict].filter(Boolean).join(' / ')}
            />
          )}
        </Stack>

        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate(`/users/${user.id}`)}
          fullWidth
          sx={{
            mt: 1,
            borderColor: 'rgba(201,162,39,0.3)',
            color: '#C9A227',
            fontSize: 11,
            fontWeight: 700,
            '&:hover': { borderColor: '#C9A227', bgcolor: 'rgba(201,162,39,0.08)' },
          }}
        >
          Tam Profile Git
        </Button>
      </Stack>
    </Paper>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ color: 'rgba(243,238,224,0.4)', display: 'flex' }}>{icon}</Box>
      <Typography sx={{
        fontSize: 12,
        color: 'rgba(243,238,224,0.8)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flex: 1,
      }}>
        {text}
      </Typography>
    </Stack>
  );
}
