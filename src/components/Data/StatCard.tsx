/**
 * StatCard Component
 *
 * Displays a single metric/statistic in a card format.
 * Consistent styling for dashboard and list page stats.
 */

import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Skeleton,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

export type StatCardColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

interface StatCardProps {
  /** Stat title/label */
  title: string;
  /** Stat value (number or string) */
  value: number | string;
  /** Icon to display */
  icon?: ReactNode;
  /** Color theme for the card */
  color?: StatCardColor;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Trend percentage (positive = up, negative = down) */
  trend?: number | { value: number; label?: string };
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  icon,
  color = 'primary',
  subtitle,
  trend,
  loading = false,
  onClick,
}: StatCardProps) {
  const theme = useTheme();
  const colorValue = theme.palette[color]?.main || theme.palette.primary.main;
  const colorLight = theme.palette[color]?.light || theme.palette.primary.light;

  const trendValue = typeof trend === 'object' ? trend.value : trend;
  const trendLabel = typeof trend === 'object' ? trend.label : undefined;

  if (loading) {
    return (
      <Card
        elevation={0}
        sx={{
          height: '100%',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Skeleton width={80} height={16} />
              <Skeleton width={60} height={36} sx={{ mt: 0.75 }} />
            </Box>
            <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 2.5 }} />
          </Stack>
          <Skeleton width={100} height={20} sx={{ mt: 1.5 }} />
        </CardContent>
      </Card>
    );
  }

  const displayValue = typeof value === 'number' ? value.toLocaleString('tr-TR') : value;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        background: `linear-gradient(135deg, ${alpha(colorValue, 0.06)} 0%, ${alpha(colorLight, 0.02)} 100%)`,
        border: `1px solid ${alpha(colorValue, 0.12)}`,
        borderRadius: 3,
        transition: 'all 0.2s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          borderColor: alpha(colorValue, 0.25),
          boxShadow: `0 8px 24px ${alpha(colorValue, 0.12)}`,
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: colorValue, mt: 0.75, lineHeight: 1.2 }}
            >
              {displayValue}
            </Typography>
          </Box>
          {icon && (
            <Box
              sx={{
                bgcolor: alpha(colorValue, 0.12),
                borderRadius: 2.5,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colorValue,
              }}
            >
              {icon}
            </Box>
          )}
        </Stack>

        {trendValue !== undefined && (
          <Stack direction="row" alignItems="center" spacing={0.75} mt={1.5}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                color: trendValue >= 0 ? 'success.dark' : 'error.dark',
                bgcolor: trendValue >= 0
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
                borderRadius: 1.5,
                px: 0.75,
                py: 0.25,
              }}
            >
              {trendValue >= 0 ? (
                <TrendingUp sx={{ fontSize: 14 }} />
              ) : (
                <TrendingDown sx={{ fontSize: 14 }} />
              )}
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>
                {Math.abs(trendValue)}%
              </Typography>
            </Box>
            {trendLabel && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                {trendLabel}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
