import React from 'react';
import { CircularProgress, CircularProgressProps } from '@mui/material';

interface SpinnerProps extends CircularProgressProps {
    size?: number | string;
    color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit';
}

export const Spinner: React.FC<SpinnerProps> = ({
    size = 40,
    color = 'primary',
    ...props
}) => {
    return (
        <CircularProgress
            size={size}
            color={color}
            {...props}
        />
    );
};

export default Spinner;
