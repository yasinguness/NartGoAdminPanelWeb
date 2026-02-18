/**
 * StatusChip Component
 * 
 * A standardized chip for displaying status values with consistent colors.
 * Automatically maps common status strings to appropriate colors.
 * 
 * Usage:
 * ```tsx
 * <StatusChip status="active" />
 * <StatusChip status="pending" variant="filled" />
 * <StatusChip status="custom" color="info" label="Custom Label" />
 * ```
 */

import { Chip, ChipProps } from '@mui/material';
import {
  CheckCircle,
  Block,
  Pending,
  Cancel,
  Delete,
  Info,
} from '@mui/icons-material';
import { ReactElement } from 'react';

// Common status types
export type StatusType = 
  | 'active' 
  | 'inactive' 
  | 'pending' 
  | 'blocked' 
  | 'deleted' 
  | 'enabled'
  | 'disabled'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'published'
  | string;

interface StatusChipProps {
  /** Status value (will be mapped to color automatically) */
  status: StatusType;
  /** Override the display label */
  label?: string;
  /** Chip variant */
  variant?: 'filled' | 'outlined';
  /** Chip size */
  size?: 'small' | 'medium';
  /** Show status icon */
  showIcon?: boolean;
  /** Override color */
  color?: ChipProps['color'];
}

// Status to color mapping
const statusColorMap: Record<string, ChipProps['color']> = {
  // Active states
  active: 'success',
  enabled: 'success',
  approved: 'success',
  published: 'success',
  verified: 'success',
  completed: 'success',
  online: 'success',
  
  // Warning states  
  pending: 'warning',
  draft: 'warning',
  processing: 'warning',
  review: 'warning',
  
  // Error states
  blocked: 'error',
  rejected: 'error',
  failed: 'error',
  expired: 'error',
  suspended: 'error',
  
  // Inactive states
  inactive: 'default',
  disabled: 'default',
  deleted: 'default',
  archived: 'default',
  offline: 'default',
};

// Status to icon mapping
const statusIconMap: Record<string, ReactElement> = {
  active: <CheckCircle fontSize="small" />,
  enabled: <CheckCircle fontSize="small" />,
  approved: <CheckCircle fontSize="small" />,
  published: <CheckCircle fontSize="small" />,
  verified: <CheckCircle fontSize="small" />,
  completed: <CheckCircle fontSize="small" />,
  
  pending: <Pending fontSize="small" />,
  draft: <Pending fontSize="small" />,
  processing: <Pending fontSize="small" />,
  
  blocked: <Block fontSize="small" />,
  rejected: <Cancel fontSize="small" />,
  failed: <Cancel fontSize="small" />,
  suspended: <Block fontSize="small" />,
  
  inactive: <Info fontSize="small" />,
  disabled: <Info fontSize="small" />,
  deleted: <Delete fontSize="small" />,
};

export default function StatusChip({
  status,
  label,
  variant = 'outlined',
  size = 'small',
  showIcon = false,
  color,
}: StatusChipProps) {
  // Normalize status to lowercase for mapping
  const normalizedStatus = String(status || '').toLowerCase();
  
  // Get color from map or use provided color or default
  const chipColor = color || statusColorMap[normalizedStatus] || 'default';
  
  // Get icon if enabled
  const icon = showIcon ? statusIconMap[normalizedStatus] : undefined;
  
  // Format label: use provided label or capitalize status
  const displayLabel = label || (normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1));

  return (
    <Chip
      label={displayLabel}
      color={chipColor}
      variant={variant}
      size={size}
      icon={icon}
      sx={{
        fontWeight: 500,
        ...(size === 'small' && {
          height: 24,
          '& .MuiChip-label': {
            px: 1,
          },
          '& .MuiChip-icon': {
            fontSize: '0.875rem',
            ml: 0.5,
          },
        }),
      }}
    />
  );
}
