import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle>Delete Federation</DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to delete this federation? This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm} color="error" variant="contained">
        Delete
      </Button>
    </DialogActions>
  </Dialog>
); 