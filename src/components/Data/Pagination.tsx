import { Pagination, PaginationProps, Box } from '@mui/material';

interface CustomPaginationProps extends Omit<PaginationProps, 'count' | 'page' | 'onChange'> {
    count: number;
    page: number;
    onChange: (event: React.ChangeEvent<unknown>, page: number) => void;
    showFirstButton?: boolean;
    showLastButton?: boolean;
}

export const CustomPagination = ({
    count,
    page,
    onChange,
    showFirstButton = true,
    showLastButton = true,
    ...props
}: CustomPaginationProps) => {
    return (
        <Box display="flex" justifyContent="center" mt={2} mb={2}>
            <Pagination
                count={count}
                page={page + 1}
                onChange={onChange}
                showFirstButton={showFirstButton}
                showLastButton={showLastButton}
                color="primary"
                size="large"
                {...props}
            />
        </Box>
    );
};

export default CustomPagination;
