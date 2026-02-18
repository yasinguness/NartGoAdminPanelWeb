/**
 * StatCard Component
 * 
 * Displays a single metric/statistic in a card format.
 * Consistent styling for dashboard and list page stats.
 * 
 * Usage:
 * ```tsx
 * <StatCard
 *   title="Total Users"
 *   value={1234}
 *   icon={<PeopleIcon />}
 *   color="success"
 *   subtitle="Active users"
 *   trend={5.2}
 * />
 * ```
 */

import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Skeleton,
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
  trend?: number;
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
  
  // Get the color from theme palette
  const colorValue = theme.palette[color]?.main || theme.palette.primary.main;

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            <Box flex={1}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={16} />
            </Box>
          </Box>
          <Skeleton variant="text" width="50%" height={40} />
        </CardContent>
      </Card>
    );
  }

  // Format the value if it's a number
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        {/* Header: Icon + Title + Trend */}
        <Box display="flex" alignItems="flex-start" mb={2}>
          {icon && (
            <Box
              sx={{
                backgroundColor: alpha(colorValue, 0.12),
                borderRadius: '50%',
                p: 1,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colorValue,
              }}
            >
              {icon}
            </Box>
          )}
          <Box flex={1}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.tertiary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {trend !== undefined && (
            <Box
              display="flex"
              alignItems="center"
              sx={{
                color: trend >= 0 ? 'success.main' : 'error.main',
                bgcolor: trend >= 0 
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
                borderRadius: 1,
                px: 0.75,
                py: 0.25,
              }}
            >
              {trend >= 0 ? (
                <TrendingUp sx={{ fontSize: '1rem', mr: 0.25 }} />
              ) : (
                <TrendingDown sx={{ fontSize: '1rem', mr: 0.25 }} />
              )}
              <Typography
                variant="caption"
                sx={{ fontWeight: 600 }}
              >
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Value */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            lineHeight: 1.2,
          }}
        >
          {displayValue}
        </Typography>
      </CardContent>
    </Card>
  );
}
