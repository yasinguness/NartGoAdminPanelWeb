/**
 * FilterBar Component
 * 
 * A container for search and filter controls.
 * Provides consistent layout and optional expandable advanced filters.
 * 
 * Usage:
 * ```tsx
 * <FilterBar
 *   search={{
 *     value: search,
 *     onChange: setSearch,
 *     placeholder: 'Search users...',
 *   }}
 *   filters={
 *     <>
 *       <FilterSelect label="Status" value={status} onChange={setStatus} options={...} />
 *       <FilterSelect label="Type" value={type} onChange={setType} options={...} />
 *     </>
 *   }
 *   advancedFilters={<AdvancedFiltersContent />}
 *   onClearFilters={clearFilters}
 *   activeFilterCount={3}
 * />
 * ```
 */

import { ReactNode, useState } from 'react';
import {
  Paper,
  Box,
  Button,
  Collapse,
  Divider,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import SearchInput from './SearchInput';

interface FilterBarProps {
  /** Search input configuration */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    loading?: boolean;
    debounceMs?: number;
  };
  /** Quick filter elements (inline) */
  filters?: ReactNode;
  /** Advanced filter elements (collapsible) */
  advancedFilters?: ReactNode;
  /** Clear all filters handler */
  onClearFilters?: () => void;
  /** Number of active filters (for badge) */
  activeFilterCount?: number;
  /** Show clear button */
  showClearButton?: boolean;
  /** Custom styles */
  sx?: object;
  /** Bottom margin */
  mb?: number;
}

export default function FilterBar({
  search,
  filters,
  advancedFilters,
  onClearFilters,
  activeFilterCount = 0,
  showClearButton = true,
  sx,
  mb = 3,
}: FilterBarProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Box sx={{ mb, ...sx }}>
      {/* Main filter bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
        }}
      >
        {/* Search input */}
        {search && (
          <SearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder}
            loading={search.loading}
            debounceMs={search.debounceMs}
            sx={{ flexGrow: 1, minWidth: 250, maxWidth: 400 }}
          />
        )}

        {/* Quick filters */}
        {filters}

        {/* Divider before action buttons */}
        {(advancedFilters || (showClearButton && hasActiveFilters)) && (
          <Divider orientation="vertical" flexItem variant="middle" />
        )}

        {/* Advanced filters toggle */}
        {advancedFilters && (
          <Badge
            badgeContent={hasActiveFilters ? activeFilterCount : 0}
            color="primary"
            max={99}
          >
            <Button
              startIcon={<FilterIcon />}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              color="secondary"
              variant="outlined"
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              More Filters
            </Button>
          </Badge>
        )}

        {/* Clear filters button */}
        {showClearButton && hasActiveFilters && onClearFilters && (
          <Button
            startIcon={<ClearIcon />}
            color="error"
            variant="text"
            onClick={onClearFilters}
            size="small"
          >
            Clear All
          </Button>
        )}
      </Paper>

      {/* Advanced filters collapsible section */}
      {advancedFilters && (
        <Collapse in={expanded}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mt: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.02),
            }}
          >
            {advancedFilters}

            {/* Clear filters in advanced section */}
            {onClearFilters && (
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button
                  startIcon={<ClearIcon />}
                  onClick={onClearFilters}
                  variant="outlined"
                  color="secondary"
                  size="small"
                >
                  Clear Filters
                </Button>
              </Box>
            )}
          </Paper>
        </Collapse>
      )}
    </Box>
  );
}
