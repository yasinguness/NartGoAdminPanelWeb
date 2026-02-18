/**
 * PageHeader Component
 * 
 * A standardized header for all admin pages that includes:
 * - Breadcrumb navigation
 * - Page title and optional subtitle
 * - Action buttons aligned to the right
 * 
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="User Details"
 *   subtitle="View and manage user account information"
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Users', href: '/users' },
 *     { label: 'User Details' },
 *   ]}
 *   actions={
 *     <>
 *       <Button variant="outlined">Cancel</Button>
 *       <Button variant="contained">Save</Button>
 *     </>
 *   }
 * />
 * ```
 */

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { spacing } from '../../theme';
import Breadcrumbs, { BreadcrumbItem } from './Breadcrumbs';

export { type BreadcrumbItem };

interface PageHeaderProps {
  /** Page title (required) */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons to display on the right */
  actions?: ReactNode;
  /** Show back button instead of/in addition to breadcrumbs */
  showBackButton?: boolean;
  /** Custom back navigation handler */
  onBack?: () => void;
  /** Back navigation path (defaults to -1 history) */
  backPath?: string;
  /** Loading state - shows skeletons */
  loading?: boolean;
  /** Bottom margin (MUI spacing units) */
  mb?: number;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  showBackButton = false,
  onBack,
  backPath,
  loading = false,
  mb = 4,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <Box mb={mb}>
        <Skeleton variant="text" width={200} height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={36} />
        <Skeleton variant="text" width={400} height={20} sx={{ mt: 0.5 }} />
      </Box>
    );
  }

  return (
    <Box mb={mb}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}

      {/* Title Row */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
      >
        {/* Left: Back Button + Title */}
        <Box display="flex" alignItems="center" gap={spacing.sm}>
          {showBackButton && (
            <IconButton
              onClick={handleBack}
              size="small"
              sx={{
                mr: 1,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right: Actions */}
        {actions && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-end', sm: 'flex-start' },
            }}
          >
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
