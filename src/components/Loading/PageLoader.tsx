import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

interface PageLoaderProps {
    message?: string;
    size?: number;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
    message = 'Loading...',
    size = 60
}) => {
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            gap={2}
        >
            <CircularProgress size={size} color="primary" />
            <Typography variant="body1" color="text.secondary">
                {message}
            </Typography>
        </Box>
    );
};

export default PageLoader;
