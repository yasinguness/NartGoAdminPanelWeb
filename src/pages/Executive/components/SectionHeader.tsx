import { Box, Typography, Stack, Chip } from '@mui/material';
import { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  refreshLabel?: string;
  action?: ReactNode;
  accent?: string;
}

export default function SectionHeader({ title, subtitle, icon, refreshLabel, action, accent = '#C9A227' }: Props) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        {icon && (
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: `${accent}1A`,
            color: accent,
          }}>
            {icon}
          </Box>
        )}
        <Box>
          <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 22, fontWeight: 700, color: '#1E293B', lineHeight: 1 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: 11, color: 'rgba(30,41,59,0.60)', letterSpacing: 0.5, mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        {refreshLabel && (
          <Chip
            size="small"
            label={refreshLabel}
            sx={{
              bgcolor: 'rgba(0,0,0,0.05)',
              color: 'rgba(30,41,59,0.60)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.5,
              height: 22,
            }}
          />
        )}
        {action}
      </Stack>
    </Stack>
  );
}
