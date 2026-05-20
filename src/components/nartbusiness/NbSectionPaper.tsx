import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

/**
 * NB admin wizard'larında ortak bölüm kabı — outlined Paper + başlık + opsiyonel
 * alt-hint. Form adımları, onay adımları ve detay paneller bu kabı kullanarak
 * görsel tutarlılık sağlar.
 */
interface Props {
  title: ReactNode;
  hint?: ReactNode;
  /** Sağ üst köşeye chip/badge yerleştirmek için (örn. durum, sayaç). */
  trailing?: ReactNode;
  /** İçeride spacing — default 2 (16px). */
  spacing?: number;
  children: ReactNode;
}

export default function NbSectionPaper({
  title,
  hint,
  trailing,
  spacing = 2.5,
  children,
}: Props) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} letterSpacing={0.1}>
            {title}
          </Typography>
          {hint && (
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={{ mt: 0.25 }}
            >
              {hint}
            </Typography>
          )}
        </Box>
        {trailing && <Box sx={{ flexShrink: 0 }}>{trailing}</Box>}
      </Box>
      <Box sx={{ p: 2.5 }}>
        <Stack spacing={spacing}>{children}</Stack>
      </Box>
    </Paper>
  );
}
