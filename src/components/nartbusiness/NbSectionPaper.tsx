import { useState, type ReactNode } from 'react';
import { Box, Collapse, Paper, Stack, Typography } from '@mui/material';

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
  /**
   * Bölüm katlanabilir olsun mu ve başlangıçta kapalı mı açılsın.
   *
   * Rutin bilgiyi taşıyan uzun bölümler (ör. onaylanmış bir başvurunun komite
   * zaman çizelgesi) sayfanın üstünü işgal edip asıl aksiyonu aşağı itiyordu.
   * `collapsible` ile bölüm kapanabilir hâle gelir; `defaultCollapsed` ile de
   * varsayılan olarak kapalı açılır — kullanıcı isterse açar.
   *
   * Ok yalnız gerçekten katlandığında görünür (statik caret yanıltıcıdır).
   */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

export default function NbSectionPaper({
  title,
  hint,
  trailing,
  spacing = 2.5,
  collapsible = false,
  defaultCollapsed = false,
  children,
}: Props) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const canToggle = collapsible;

  return (
    <Paper
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <Box
        component={canToggle ? 'button' : 'div'}
        type={canToggle ? 'button' : undefined}
        onClick={canToggle ? () => setOpen((v) => !v) : undefined}
        aria-expanded={canToggle ? open : undefined}
        sx={{
          width: '100%',
          font: 'inherit',
          fontFamily: 'inherit',
          textAlign: 'left',
          border: 'none',
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: canToggle ? 'pointer' : 'default',
          '&:hover': canToggle ? { bgcolor: 'action.selected' } : undefined,
        }}
      >
        {canToggle && (
          <Box
            component="span"
            aria-hidden
            sx={{
              display: 'inline-flex',
              flexShrink: 0,
              color: 'text.secondary',
              transition: 'transform 0.15s',
              transform: open ? 'rotate(90deg)' : 'none',
            }}
          >
            <svg viewBox="0 0 8 12" width={7} height={10}>
              <path d="M1 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </Box>
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} letterSpacing={0}>
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
      <Collapse in={open} unmountOnExit>
        <Box sx={{ p: 2.5 }}>
          <Stack spacing={spacing}>{children}</Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
