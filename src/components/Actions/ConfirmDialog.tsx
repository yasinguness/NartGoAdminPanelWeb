/**
 * ConfirmDialog Component
 * 
 * A reusable confirmation dialog for destructive or important actions.
 * 
 * Usage:
 * ```tsx
 * <ConfirmDialog
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Account"
 *   message="Are you sure you want to delete this account? This action cannot be undone."
 *   confirmText="Delete Permanently"
 *   severity="error"
 * />
 * ```
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Warning as WarningIcon, Error as ErrorIcon, Info as InfoIcon } from '@mui/icons-material';

interface ConfirmDialogProps {
  /** Control dialog visibility */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Confirm handler */
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Label for confirm button */
  confirmText?: string;
  /** Label for cancel button */
  cancelText?: string;
  /** Severity affects color and icon */
  severity?: 'error' | 'warning' | 'info';
  /** Loading state for confirm button */
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  
  const getIcon = () => {
    switch (severity) {
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return null;
    }
  };

  const getButtonColor = () => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getIcon()}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          variant="text"
          color="inherit"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={getButtonColor() as any}
          disabled={loading}
          autoFocus
        >
          {loading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
