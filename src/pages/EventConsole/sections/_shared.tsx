import { Box, Paper, Typography, Stack, CircularProgress, Skeleton } from '@mui/material';
import { InboxOutlined as InboxIcon } from '@mui/icons-material';

/** Section loading state — her section'da tutarlı görünüm */
export function SectionLoading({ message = 'Yükleniyor...' }: { message?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 6, borderRadius: 2 }}>
      <Stack spacing={2} alignItems="center">
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">{message}</Typography>
      </Stack>
    </Paper>
  );
}

/** Section empty state */
export function SectionEmpty({
  icon = <InboxIcon sx={{ fontSize: 40 }} />,
  title,
  message,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 5, borderRadius: 2, textAlign: 'center' }}>
      <Stack spacing={1.5} alignItems="center">
        <Box sx={{ color: 'text.disabled' }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
      </Stack>
    </Paper>
  );
}

/** Section list skeleton — satır bazlı loading */
export function SectionListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={36} height={36} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="40%" height={18} />
              <Skeleton width="25%" height={14} />
            </Box>
            <Skeleton width={60} height={22} />
          </Stack>
        </Box>
      ))}
    </Paper>
  );
}
