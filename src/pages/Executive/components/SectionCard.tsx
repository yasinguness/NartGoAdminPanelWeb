import { Paper, Box, Typography, Stack } from '@mui/material';
import { ReactNode } from 'react';
import { InfoOutlined } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  partial?: boolean;
  partialMessage?: string;
}

export default function SectionCard({ children, partial, partialMessage }: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: '#FFFFFF',
        border: '1px solid rgba(201,162,39,0.12)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {partial && (
        <Box
          sx={{
            mb: 2,
            p: 1.25,
            borderRadius: 1,
            bgcolor: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <InfoOutlined sx={{ fontSize: 16, color: '#f59e0b' }} />
          <Stack>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: 0.5 }}>
              KISMİ VERİ
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(30,41,59,0.70)' }}>
              {partialMessage || 'Bu bölüm için backend endpoint\'i henüz aktif değil. Yaklaşık değerler gösteriliyor.'}
            </Typography>
          </Stack>
        </Box>
      )}
      {children}
    </Paper>
  );
}
