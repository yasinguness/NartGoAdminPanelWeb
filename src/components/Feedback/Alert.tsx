import React from 'react';
import { Alert as MuiAlert, AlertProps as MuiAlertProps, AlertTitle } from '@mui/material';

interface AlertProps extends Omit<MuiAlertProps, 'severity'> {
    severity?: 'success' | 'info' | 'warning' | 'error';
    title?: string;
    children?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
    severity = 'info',
    title,
    children,
    ...props
}) => {
    return (
        <MuiAlert severity={severity} {...props}>
            {title && <AlertTitle>{title}</AlertTitle>}
            {children}
        </MuiAlert>
    );
};

export default Alert;
