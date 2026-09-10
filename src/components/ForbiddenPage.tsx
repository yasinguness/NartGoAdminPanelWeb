import { Box, Typography, Button, Stack, Paper, Chip, alpha, useTheme } from '@mui/material';
import { Lock as LockIcon, Home as HomeIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRole } from '../hooks/useRole';
import { getRouteAccess } from '../config/roles';

/**
 * 403 Forbidden sayfası — kullanıcı yetkisiz bir route'a erişmeye çalıştığında gösterilir.
 * Kullanıcıya hangi rol gerektiğini açıklar ve güvenli yönlendirme sunar.
 */
export default function ForbiddenPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { roles, fallbackPath } = useRole();

  const access = getRouteAccess(location.pathname);
  const requiredRoles = access?.roles || [];

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 56px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 3,
    }}>
      <Paper variant="outlined" sx={{ maxWidth: 540, p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Box sx={{
          width: 72, height: 72, borderRadius: '50%',
          bgcolor: alpha(theme.palette.error.main, 0.1),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mx: 'auto', mb: 2,
        }}>
          <LockIcon sx={{ fontSize: 36, color: 'error.main' }} />
        </Box>

        <Typography variant="h5" fontWeight={700} gutterBottom>
          Erişim Reddedildi
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsiniz.
        </Typography>

        {/* Path bilgisi */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, letterSpacing: 1, fontSize: 10 }}>
            İSTENEN SAYFA
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1.5 }}>
            {location.pathname}
          </Typography>

          {requiredRoles.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, letterSpacing: 1, fontSize: 10 }}>
                GEREKLİ ROL
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center" useFlexGap>
                {requiredRoles.map(r => (
                  <Chip key={r} label={r} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                ))}
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 0.5, letterSpacing: 1, fontSize: 10 }}>
                MEVCUT ROLÜNÜZ
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center" useFlexGap>
                {roles.length > 0 ? roles.map(r => (
                  <Chip key={r} label={r} size="small" color="primary" variant="outlined" sx={{ fontSize: 10 }} />
                )) : (
                  <Typography variant="caption" color="text.disabled">—</Typography>
                )}
              </Stack>
            </>
          )}
        </Paper>

        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 3 }}>
          Yanlış bir yönlendirme olduğunu düşünüyorsanız sistem yöneticinize başvurun.
        </Typography>

        <Stack direction="row" spacing={1.5} justifyContent="center">
          <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} variant="outlined">
            Geri Dön
          </Button>
          <Button startIcon={<HomeIcon />} onClick={() => navigate(fallbackPath, { replace: true })} variant="contained">
            Ana Sayfaya Git
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
