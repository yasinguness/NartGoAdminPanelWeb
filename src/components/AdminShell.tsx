/**
 * AdminShell — Admin sayfaları için ortak wrapper (light tema).
 * Stratejik/finans/güvenlik/büyüme sayfaları bu bileşeni kullanır.
 * Tema tutarlılığı (bg, text, border, spacing) tek yerden yönetilir.
 */
import { Box, Container, Stack, Typography, Chip, IconButton, Tooltip, Alert, Button } from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { darkAdmin } from '../theme/darkAdmin';
import { ReactNode, useMemo } from 'react';

interface AdminShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  label?: string;             // "STRATEJİK PANEL • YALNIZCA ADMIN"
  children: ReactNode;
  actions?: ReactNode;        // Sağda ekstra action'lar
  isFetching?: boolean;
  lastUpdatedAt?: number | null;
  onRefresh?: () => void;
  showEmptyDataAlert?: boolean;
  emptyDataMessage?: string;
  onEmptyDataRetry?: () => void;
  footerText?: string;
  /** True ise içerik Container'a sarmalanmaz (Paper olarak direkt render edilir, tam genişlik) */
  fluid?: boolean;
}

function formatRelative(ts: number | null | undefined): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
  return new Date(ts).toLocaleTimeString('tr-TR');
}

export default function AdminShell({
  title,
  subtitle,
  icon,
  iconBgColor = 'rgba(201,162,39,0.12)',
  iconColor = '#C9A227',
  label,
  children,
  actions,
  isFetching,
  lastUpdatedAt,
  onRefresh,
  showEmptyDataAlert,
  emptyDataMessage,
  onEmptyDataRetry,
  footerText,
  fluid,
}: AdminShellProps) {
  const lastUpdatedText = useMemo(() => formatRelative(lastUpdatedAt), [lastUpdatedAt]);

  const content = (
    <>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            {label && (
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: darkAdmin.text.accent }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: darkAdmin.text.accent, textTransform: 'uppercase' }}>
                  {label}
                </Typography>
              </Stack>
            )}
            <Stack direction="row" spacing={2} alignItems="center">
              {icon && (
                <Box sx={{
                  width: 48, height: 48, borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: iconBgColor, color: iconColor,
                }}>
                  {icon}
                </Box>
              )}
              <Box>
                <Typography sx={{ ...darkAdmin.sx.pageTitle }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: darkAdmin.text.secondary }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {actions}
            {(lastUpdatedAt !== undefined && lastUpdatedAt !== null) && (
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${isFetching ? '#d97706' : '#16a34a'} !important` }} />}
                label={isFetching ? 'güncelleniyor' : `son: ${lastUpdatedText}`}
                size="small"
                sx={{
                  bgcolor: darkAdmin.bg.cardAlt,
                  color: darkAdmin.text.secondary,
                  fontSize: 11, fontWeight: 600, height: 26,
                  border: `1px solid ${darkAdmin.border.default}`,
                }}
              />
            )}
            {onRefresh && (
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={onRefresh} size="small" sx={{ color: darkAdmin.text.accent, border: `1px solid ${darkAdmin.border.accent}` }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Empty data warning */}
      {showEmptyDataAlert && (
        <Alert
          severity="info"
          icon={false}
          sx={{
            mb: 3,
            bgcolor: 'rgba(217,119,6,0.06)',
            border: '1px solid rgba(217,119,6,0.25)',
            color: darkAdmin.text.primary,
          }}
          action={onEmptyDataRetry ? (
            <Button size="small" onClick={onEmptyDataRetry} sx={{ color: darkAdmin.text.accent, fontSize: 11, fontWeight: 700 }}>
              Tekrar Dene
            </Button>
          ) : undefined}
        >
          <Typography sx={{ fontSize: 12 }}>
            {emptyDataMessage || 'Endpoint\'e ulaşılamadı.'}
          </Typography>
        </Alert>
      )}

      {/* Page content */}
      {children}

      {/* Footer */}
      {footerText && (
        <Box sx={{ mt: 5, pt: 3, borderTop: `1px solid ${darkAdmin.border.subtle}`, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: darkAdmin.text.disabled }}>
            {footerText}
          </Typography>
        </Box>
      )}
    </>
  );

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: darkAdmin.bg.page,
        color: darkAdmin.text.primary,
        mx: { xs: -2, sm: -3 },
        my: -3,
        py: 4,
      }}
    >
      {fluid ? (
        <Box sx={{ px: { xs: 2, sm: 3 } }}>{content}</Box>
      ) : (
        <Container maxWidth="xl">{content}</Container>
      )}
    </Box>
  );
}
