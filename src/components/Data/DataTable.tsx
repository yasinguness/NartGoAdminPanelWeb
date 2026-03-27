/**
 * DataTable Component
 * 
 * A standardized table component for admin data display.
 * Includes loading, empty states, pagination, and row actions.
 * 
 * Usage:
 * ```tsx
 * <DataTable
 *   columns={[
 *     { id: 'name', label: 'Name' },
 *     { id: 'email', label: 'Email' },
 *     { id: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
 *   ]}
 *   data={users}
 *   loading={isLoading}
 *   onRowClick={(row) => navigate(`/users/${row.id}`)}
 *   pagination={{
 *     page: 1,
 *     pageSize: 10,
 *     total: 100,
 *     onPageChange: setPage,
 *   }}
 * />
 * ```
 */

import { ReactNode, MouseEvent } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Skeleton,
  Pagination,
  Stack,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import { MoreVert as MoreVertIcon, CheckBox as CheckBoxIcon, CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon } from '@mui/icons-material';
import { Checkbox } from '@mui/material';
import EmptyState from './EmptyState';

// Column definition
export interface DataTableColumn<T> {
  /** Unique column identifier */
  id: string;
  /** Column header label */
  label: string;
  /** Column width (CSS value) */
  width?: string | number;
  /** Minimum width */
  minWidth?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom render function */
  render?: (row: T, index: number) => ReactNode;
  /** Accessor key for data (if no render function) */
  accessor?: keyof T;
  /** Hide on mobile */
  hideOnMobile?: boolean;
  /** Sortable column */
  sortable?: boolean;
}

// Pagination config
export interface DataTablePagination {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total items */
  total: number;
  /** Page change handler */
  onPageChange: (page: number) => void;
}

// Main props
interface DataTableProps<T> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Data rows */
  data: T[];
  /** Loading state */
  loading?: boolean;
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number;
  /** Row key accessor */
  getRowKey?: (row: T, index: number) => string | number;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Pagination config */
  pagination?: DataTablePagination;
  /** Empty state props */
  emptyState?: {
    title?: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
  };
  /** Actions column render */
  renderRowActions?: (row: T) => ReactNode;
  /** Custom table styles */
  sx?: object;
  /** Minimum table width */
  minWidth?: number;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row IDs */
  selectedIds?: (string | number)[];
  /** Selection change handler */
  onSelectionChange?: (ids: (string | number)[]) => void;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  getRowKey,
  onRowClick,
  pagination,
  emptyState,
  renderRowActions,
  sx,
  minWidth = 650,
  stickyHeader = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const theme = useTheme();

  // Generate row key
  const getKey = (row: T, index: number) => {
    if (getRowKey) return getRowKey(row, index);
    if ('id' in row) return row.id;
    return index;
  };

  // Render cell content
  const renderCell = (column: DataTableColumn<T>, row: T, index: number) => {
    if (column.render) {
      return column.render(row, index);
    }
    if (column.accessor) {
      const value = row[column.accessor];
      return value !== undefined && value !== null ? String(value) : '-';
    }
    if (column.id in row) {
      const value = row[column.id];
      return value !== undefined && value !== null ? String(value) : '-';
    }
    return '-';
  };

  // Handle row click
  const handleRowClick = (row: T) => (e: MouseEvent) => {
    // Don't trigger row click if clicking on actions
    if ((e.target as HTMLElement).closest('.row-actions')) {
      return;
    }
    onRowClick?.(row);
  };

  // Calculate total pages
  const totalPages = pagination 
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 0;

  // Handle page change
  const handlePageChange = (_: any, page: number) => {
    pagination?.onPageChange(page);
  };

  // Selection handlers
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (event.target.checked) {
      const allIds = data.map((row, index) => getKey(row, index));
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (row: T, index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    const id = getKey(row, index);
    const newSelected = event.target.checked
      ? [...selectedIds, id]
      : selectedIds.filter((item) => item !== id);
    onSelectionChange(newSelected);
  };

  const isSelected = (row: T, index: number) => {
    return selectedIds.includes(getKey(row, index));
  };

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  // Loading skeleton
  if (loading) {
    return (
      <Paper elevation={0} sx={sx}>
        <TableContainer>
          <Table sx={{ minWidth }} stickyHeader={stickyHeader}>
            <TableHead>
              <TableRow>
                {selectable && (
                  <TableCell padding="checkbox" sx={{ width: 48 }}>
                    <Checkbox disabled />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    sx={{ 
                      width: column.width,
                      minWidth: column.minWidth,
                      fontWeight: 600,
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                {renderRowActions && <TableCell align="right" sx={{ width: 80 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: skeletonRows }).map((_, index) => (
                <TableRow key={index}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Skeleton variant="circular" width={24} height={24} />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton variant="text" width="80%" />
                    </TableCell>
                  ))}
                  {renderRowActions && (
                    <TableCell>
                      <Skeleton variant="circular" width={32} height={32} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Paper elevation={0} sx={sx}>
        <TableContainer>
          <Table sx={{ minWidth }} stickyHeader={stickyHeader}>
            <TableHead>
              <TableRow>
                {selectable && (
                  <TableCell padding="checkbox" sx={{ width: 48 }}>
                    <Checkbox disabled />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    sx={{ 
                      width: column.width,
                      minWidth: column.minWidth,
                      fontWeight: 600,
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                {renderRowActions && <TableCell align="right" sx={{ width: 80 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>
        <EmptyState
          title={emptyState?.title || 'No data found'}
          description={emptyState?.description}
          icon={emptyState?.icon}
          action={emptyState?.action}
          compact
        />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={sx}>
      <TableContainer>
        <Table sx={{ minWidth }} stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  <Checkbox
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={handleSelectAll}
                    color="primary"
                    size="small"
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{ 
                    width: column.width,
                    minWidth: column.minWidth,
                    fontWeight: 600,
                    display: column.hideOnMobile 
                      ? { xs: 'none', md: 'table-cell' } 
                      : undefined,
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
              {renderRowActions && (
                <TableCell 
                  align="right" 
                  sx={{ width: 80, fontWeight: 600 }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={getKey(row, index)}
                hover
                selected={isSelected(row, index)}
                onClick={onRowClick ? handleRowClick(row) : undefined}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  '&:hover': onRowClick ? {
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                  } : {},
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                    },
                  },
                }}
              >
                {selectable && (
                  <TableCell padding="checkbox" className="row-actions">
                    <Checkbox
                      checked={isSelected(row, index)}
                      onChange={handleSelectRow(row, index)}
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    sx={{
                      display: column.hideOnMobile 
                        ? { xs: 'none', md: 'table-cell' } 
                        : undefined,
                    }}
                  >
                    {renderCell(column, row, index)}
                  </TableCell>
                ))}
                {renderRowActions && (
                  <TableCell align="right" className="row-actions">
                    {renderRowActions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </Typography>
          <Pagination
            count={totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
            size="small"
          />
        </Box>
      )}
    </Paper>
  );
}
