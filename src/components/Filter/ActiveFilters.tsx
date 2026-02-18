/**
 * ActiveFilters Component
 * 
 * Displays a list of active filter chips with remove buttons.
 * Useful for showing user what filters are currently applied.
 * 
 * Usage:
 * ```tsx
 * <ActiveFilters
 *   filters={[
 *     { id: 'status', label: 'Status: Active', onRemove: () => setStatus('') },
 *     { id: 'role', label: 'Role: Admin', onRemove: () => setRole('') }
 *   ]}
 *   onClearAll={clearAllFilters}
 * />
 * ```
 */

import { Chip, Stack, Button, Box, Typography } from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { componentSpacing } from '../../theme/spacing';

export interface ActiveFilterItem {
  id: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFiltersProps {
  /** List of active filters */
  filters: ActiveFilterItem[];
  /** Handler to clear all filters */
  onClearAll?: () => void;
  /** Custom styles */
  sx?: object;
  /** Bottom margin */
  mb?: number;
}

export default function ActiveFilters({
  filters,
  onClearAll,
  sx,
  mb = 2,
}: ActiveFiltersProps) {
  if (!filters || filters.length === 0) return null;

  return (
    <Box sx={{ mb, ...sx }}>
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          Active filters:
        </Typography>
        
        {filters.map((filter) => (
          <Chip
            key={filter.id}
            label={filter.label}
            onDelete={filter.onRemove}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ borderRadius: componentSpacing.chipGap }}
          />
        ))}

        {filters.length > 1 && onClearAll && (
          <Button
            size="small"
            onClick={onClearAll}
            startIcon={<ClearIcon />}
            sx={{ ml: 1, textTransform: 'none' }}
          >
            Clear all
          </Button>
        )}
      </Stack>
    </Box>
  );
}
