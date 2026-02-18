import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, Box } from '@mui/material';

interface Column {
    id: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: any) => React.ReactNode;
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
    emptyMessage = 'No data available'
}: DataTableProps) => {
    return (
        <Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell
                                    key={column.id}
                                    align={column.align || 'left'}
                                    sx={{ fontWeight: 'bold' }}
                                >
                                    {column.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, rowIndex) => (
                                <TableRow
                                    key={rowIndex}
                                    hover
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            align={column.align || 'left'}
                                        >
                                            {column.render
                                                ? column.render(row[column.id], row)
                                                : row[column.id]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
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
            />
        </Box>
    );
};

export default DataTable;
