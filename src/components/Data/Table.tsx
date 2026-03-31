import React, { useState, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    TableSortLabel,
    Box,
    Checkbox,
    Skeleton,
    Typography,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/InboxOutlined';

type SortDirection = 'asc' | 'desc';

interface Column {
    id: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: any) => React.ReactNode;
    sortable?: boolean;
}

interface DataTableProps {
    columns: Column[];
    data: any[];
    page: number;
    rowsPerPage: number;
    totalRows: number;
    onPageChange: (event: unknown, newPage: number) => void;
    onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: any, index: number) => void;
    selectable?: boolean;
    selectedRows?: any[];
    onSelectionChange?: (selectedRows: any[]) => void;
    rowKey?: string;
    sortBy?: string;
    sortDirection?: SortDirection;
    onSortChange?: (columnId: string, direction: SortDirection) => void;
    ariaLabel?: string;
    stickyHeader?: boolean;
    maxHeight?: number | string;
}

export const DataTable = ({
    columns,
    data,
    page,
    rowsPerPage,
    totalRows,
    onPageChange,
    onRowsPerPageChange,
    loading = false,
    emptyMessage,
    onRowClick,
    selectable = false,
    selectedRows: controlledSelectedRows,
    onSelectionChange,
    rowKey,
    sortBy: controlledSortBy,
    sortDirection: controlledSortDirection,
    onSortChange,
    ariaLabel = 'Veri tablosu',
    stickyHeader = true,
    maxHeight,
}: DataTableProps) => {
    const [internalSortBy, setInternalSortBy] = useState<string>('');
    const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>('asc');
    const [internalSelectedRows, setInternalSelectedRows] = useState<any[]>([]);

    const activeSortBy = controlledSortBy ?? internalSortBy;
    const activeSortDirection = controlledSortDirection ?? internalSortDirection;
    const activeSelectedRows = controlledSelectedRows ?? internalSelectedRows;

    const getRowKey = useCallback(
        (row: any, index: number): string | number => {
            if (rowKey && row[rowKey] != null) return row[rowKey];
            return index;
        },
        [rowKey]
    );

    const isRowSelected = useCallback(
        (row: any, index: number): boolean => {
            const key = getRowKey(row, index);
            return activeSelectedRows.some((sr, si) => getRowKey(sr, si) === key);
        },
        [activeSelectedRows, getRowKey]
    );

    const handleSortClick = (columnId: string) => {
        const isCurrentSort = activeSortBy === columnId;
        const newDirection: SortDirection = isCurrentSort && activeSortDirection === 'asc' ? 'desc' : 'asc';
        if (onSortChange) {
            onSortChange(columnId, newDirection);
        } else {
            setInternalSortBy(columnId);
            setInternalSortDirection(newDirection);
        }
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSelected = event.target.checked ? [...data] : [];
        if (onSelectionChange) onSelectionChange(newSelected);
        else setInternalSelectedRows(newSelected);
    };

    const handleSelectRow = (row: any, index: number) => {
        const isSelected = isRowSelected(row, index);
        const key = getRowKey(row, index);
        const newSelected = isSelected
            ? activeSelectedRows.filter((sr, si) => getRowKey(sr, si) !== key)
            : [...activeSelectedRows, row];
        if (onSelectionChange) onSelectionChange(newSelected);
        else setInternalSelectedRows(newSelected);
    };

    const totalColumns = selectable ? columns.length + 1 : columns.length;
    const allSelected = data.length > 0 && activeSelectedRows.length === data.length;
    const someSelected = activeSelectedRows.length > 0 && activeSelectedRows.length < data.length;

    const renderSkeletonRows = () =>
        Array.from({ length: Math.min(rowsPerPage, 5) }).map((_, rowIndex) => (
            <TableRow key={`skeleton-${rowIndex}`}>
                {selectable && (
                    <TableCell padding="checkbox">
                        <Skeleton variant="rectangular" width={20} height={20} sx={{ borderRadius: 0.5 }} />
                    </TableCell>
                )}
                {columns.map((column) => (
                    <TableCell key={column.id} align={column.align || 'left'}>
                        <Skeleton variant="text" width={`${55 + Math.random() * 35}%`} height={24} animation="wave" />
                    </TableCell>
                ))}
            </TableRow>
        ));

    const renderEmptyState = () => (
        <TableRow>
            <TableCell colSpan={totalColumns} align="center" sx={{ py: 8, border: 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                    <InboxIcon sx={{ fontSize: 56, opacity: 0.3 }} />
                    <Typography variant="body1" fontWeight={500} color="text.secondary">
                        {emptyMessage || 'Veri bulunamadı'}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        Arama veya filtrelerinizi değiştirmeyi deneyin
                    </Typography>
                </Box>
            </TableCell>
        </TableRow>
    );

    return (
        <Box>
            <TableContainer
                component={Paper}
                sx={{
                    ...(maxHeight ? { maxHeight } : stickyHeader ? { maxHeight: '70vh' } : {}),
                    borderRadius: 2,
                }}
            >
                <Table stickyHeader={stickyHeader} aria-label={ariaLabel}>
                    <TableHead>
                        <TableRow>
                            {selectable && (
                                <TableCell
                                    padding="checkbox"
                                    component="th"
                                    scope="col"
                                    sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}
                                >
                                    <Checkbox
                                        indeterminate={someSelected}
                                        checked={allSelected}
                                        onChange={handleSelectAll}
                                        inputProps={{ 'aria-label': 'Tüm satırları seç' }}
                                        disabled={loading}
                                    />
                                </TableCell>
                            )}
                            {columns.map((column) => {
                                const isSortable = column.sortable !== false;
                                const isActive = activeSortBy === column.id;
                                return (
                                    <TableCell
                                        key={column.id}
                                        align={column.align || 'left'}
                                        component="th"
                                        scope="col"
                                        sortDirection={isActive ? activeSortDirection : false}
                                        sx={{ fontWeight: 'bold', backgroundColor: 'background.paper', whiteSpace: 'nowrap' }}
                                    >
                                        {isSortable ? (
                                            <TableSortLabel
                                                active={isActive}
                                                direction={isActive ? activeSortDirection : 'asc'}
                                                onClick={() => handleSortClick(column.id)}
                                            >
                                                {column.label}
                                            </TableSortLabel>
                                        ) : (
                                            column.label
                                        )}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading
                            ? renderSkeletonRows()
                            : data.length === 0
                              ? renderEmptyState()
                              : data.map((row, rowIndex) => {
                                    const key = getRowKey(row, rowIndex);
                                    const selected = selectable && isRowSelected(row, rowIndex);
                                    return (
                                        <TableRow
                                            key={key}
                                            hover
                                            selected={selected}
                                            onClick={() => onRowClick?.(row, rowIndex)}
                                            role={onRowClick ? 'button' : undefined}
                                            tabIndex={onRowClick ? 0 : undefined}
                                            onKeyDown={
                                                onRowClick
                                                    ? (e) => {
                                                          if (e.key === 'Enter' || e.key === ' ') {
                                                              e.preventDefault();
                                                              onRowClick(row, rowIndex);
                                                          }
                                                      }
                                                    : undefined
                                            }
                                            sx={{
                                                cursor: onRowClick ? 'pointer' : 'default',
                                                '&:last-child td, &:last-child th': { border: 0 },
                                                transition: 'background-color 150ms ease-in-out',
                                            }}
                                        >
                                            {selectable && (
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selected}
                                                        onChange={() => handleSelectRow(row, rowIndex)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        inputProps={{ 'aria-label': `Satır ${rowIndex + 1} seç` }}
                                                    />
                                                </TableCell>
                                            )}
                                            {columns.map((column) => (
                                                <TableCell key={column.id} align={column.align || 'left'}>
                                                    {column.render ? column.render(row[column.id], row) : row[column.id]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalRows}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                labelRowsPerPage="Sayfa başına satır:"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}–${to} / ${count !== -1 ? count : `${to}'den fazla`}`
                }
            />
        </Box>
    );
};

export default DataTable;
