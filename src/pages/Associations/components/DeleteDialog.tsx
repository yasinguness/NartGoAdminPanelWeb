import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { AssociationDto } from '../../../types/association/associationDto';
import { AssociationSummaryResponse } from '../../../types/association/associationSummaryResponse';

interface DeleteDialogProps {
  open: boolean;
  association: AssociationSummaryResponse | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  association,
  onClose,
  onConfirm,
  isLoading,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete Association</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete the association "{association?.name}"? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" disabled={isLoading}>
          {isLoading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 