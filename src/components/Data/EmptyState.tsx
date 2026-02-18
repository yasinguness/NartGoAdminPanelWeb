/**
 * EmptyState Component
 * 
 * Displayed when a list/table has no data.
 * Provides helpful message and optional action button.
 * 
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon={<PeopleIcon />}
 *   title="No users found"
 *   description="Try adjusting your search or filters"
 *   action={<Button>Add User</Button>}
 * />
 * ```
 */

import { ReactNode } from 'react';
import { Box, Typography, Button, SxProps, Theme } from '@mui/material';
import { SearchOff, FolderOpen, Inbox } from '@mui/icons-material';

interface EmptyStateProps {
  /** Icon to display (defaults to Inbox icon) */
  icon?: ReactNode;
  /** Main title/message */
  title?: string;
  /** Description text */
  description?: string;
  /** Action button or element */
  action?: ReactNode;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Custom styles */
  sx?: SxProps<Theme>;
}

const defaultIcons = {
  search: <SearchOff sx={{ fontSize: 64 }} />,
  folder: <FolderOpen sx={{ fontSize: 64 }} />,
  inbox: <Inbox sx={{ fontSize: 64 }} />,
};

export default function EmptyState({
  icon,
  title = 'No data found',
  description,
  action,
  compact = false,
  sx,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: compact ? 4 : 8,
        px: 3,
        ...sx,
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          color: 'text.disabled',
          mb: compact ? 1 : 2,
          '& svg': {
            fontSize: compact ? 48 : 64,
          },
        }}
      >
        {icon || defaultIcons.inbox}
      </Box>

      {/* Title */}
      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        color="text.primary"
        gutterBottom
        sx={{ fontWeight: 500 }}
      >
        {title}
      </Typography>

      {/* Description */}
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            maxWidth: 400,
            mb: action ? 3 : 0,
          }}
        >
          {description}
        </Typography>
      )}

      {/* Action */}
      {action && (
        <Box sx={{ mt: compact ? 2 : 3 }}>
          {action}
        </Box>
      )}
    </Box>
  );
}

// Pre-configured empty states for common scenarios
export function NoSearchResults({
  searchTerm,
  onClear,
}: {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={<SearchOff sx={{ fontSize: 64 }} />}
      title="No results found"
      description={
        searchTerm
          ? `No results found for "${searchTerm}". Try adjusting your search or filters.`
          : 'Try adjusting your search or filters.'
      }
      action={
        onClear && (
          <Button variant="outlined" onClick={onClear}>
            Clear Filters
          </Button>
        )
      }
    />
  );
}

export function NoDataYet({
  resourceName = 'items',
  onAdd,
  addLabel,
}: {
  resourceName?: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <EmptyState
      icon={<FolderOpen sx={{ fontSize: 64 }} />}
      title={`No ${resourceName} yet`}
      description={`Get started by adding your first ${resourceName.replace(/s$/, '')}.`}
      action={
        onAdd && (
          <Button variant="contained" onClick={onAdd}>
            {addLabel || `Add ${resourceName.replace(/s$/, '')}`}
          </Button>
        )
      }
    />
  );
}
