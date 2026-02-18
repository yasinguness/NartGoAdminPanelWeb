import React from 'react';
import { Snackbar, SnackbarProps, SnackbarContent } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface CustomSnackbarProps extends Omit<SnackbarProps, 'children'> {
    message: string;
    severity?: 'success' | 'error' | 'info' | 'warning';
    onClose?: () => void;
}

const icons = {
    success: <CheckCircleIcon />,
    error: <ErrorIcon />,
    info: <InfoIcon />,
    warning: <WarningIcon />,
};

const severityColors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3',
    warning: '#ff9800',
};

export const CustomSnackbar: React.FC<CustomSnackbarProps> = ({
    message,
    severity = 'info',
    onClose,
    ...props
}) => {
    return (
        <Snackbar
            {...props}
            ContentProps={{
                'aria-describedby': 'snackbar-message',
            }}
            action={
                onClose && (
                    <IconButton
                        size="small"
                        aria-label="close"
                        color="inherit"
                        onClick={onClose}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )
            }
        >
            <SnackbarContent
                message={
                    <span id="snackbar-message" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {icons[severity]}
                        {message}
                    </span>
                }
                style={{
                    backgroundColor: severityColors[severity],
                    color: '#fff',
                }}
            />
        </Snackbar>
    );
};

export default CustomSnackbar;
