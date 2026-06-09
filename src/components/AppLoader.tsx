/**
 * AppLoader — Tam ekran yükleme overlay'i.
 * Layout + sidebar'ı tamamen örter, z-index çok yüksek.
 * Kullanım: auth hydration, role-based redirect kararı, initial bootstrap durumlarında.
 */
import { Box, CircularProgress, Typography } from '@mui/material';

interface Props {
  label?: string;
  /** true ise position: fixed ile tüm viewport'u kaplar (default). false ise normal akış. */
  fullscreen?: boolean;
}

export default function AppLoader({ label, fullscreen = true }: Props) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : 'auto',
        width: fullscreen ? '100vw' : '100%',
        height: fullscreen ? '100vh' : '100%',
        minHeight: fullscreen ? undefined : 240,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: '#0F1A14',
        color: 'rgba(255,255,255,0.85)',
        zIndex: fullscreen ? 9999 : 'auto',
      }}
    >
      <CircularProgress size={44} sx={{ color: '#C9A227' }} />
      {label && (
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
