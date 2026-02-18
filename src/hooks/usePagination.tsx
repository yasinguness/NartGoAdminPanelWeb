import { useState, useCallback } from 'react';

interface UsePaginationReturn {
    page: number;
    rowsPerPage: number;
    totalPages: number;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
    resetPage: () => void;
    setTotalItems: (total: number) => void;
}

export const usePagination = (initialRowsPerPage: number = 10): UsePaginationReturn => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
    const [totalItems, setTotalItems] = useState(0);

    const handleChangePage = useCallback((_event: unknown, newPage: number) => {
        setPage(newPage - 1);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    const resetPage = useCallback(() => {
        setPage(0);
    }, []);

    const totalPages = Math.ceil(totalItems / rowsPerPage);

    return {
        page,
        rowsPerPage,
        totalPages,
        handleChangePage,
        handleChangeRowsPerPage,
        resetPage,
        setTotalItems,
    };
};

export default usePagination;
