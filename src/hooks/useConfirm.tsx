import { useState } from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
} from '@mui/material';

interface UseConfirmProps {
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'error' | 'primary' | 'success';
}

interface UseConfirmReturn {
    confirm: (props: UseConfirmProps) => void;
    ConfirmDialog: () => JSX.Element | null;
}

export const useConfirm = (): UseConfirmReturn => {
    const [isOpen, setIsOpen] = useState(false);
    const [dialogProps, setDialogProps] = useState<UseConfirmProps | null>(null);

    const confirm = (props: UseConfirmProps) => {
        setDialogProps(props);
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        if (dialogProps?.onCancel) {
            dialogProps.onCancel();
        }
        setDialogProps(null);
    };

    const handleConfirm = () => {
        if (dialogProps?.onConfirm) {
            dialogProps.onConfirm();
        }
        setIsOpen(false);
        setDialogProps(null);
    };

    const ConfirmDialog = () => {
        if (!dialogProps || !isOpen) return null;

        const {
            title = 'Confirm',
            message,
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmColor = 'primary',
        } = dialogProps;

        return (
            <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
                {title && <DialogTitle>{title}</DialogTitle>}
                <DialogContent>
                    <DialogContentText>{message}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="inherit">
                        {cancelText}
                    </Button>
                    <Button onClick={handleConfirm} color={confirmColor} variant="contained" autoFocus>
                        {confirmText}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    return {
        confirm,
        ConfirmDialog,
    };
};

export default useConfirm;
