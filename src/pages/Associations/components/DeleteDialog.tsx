import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
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
      <DialogTitle>Derneği Sil</DialogTitle>
      <DialogContent>
        <DialogContentText>
          "{association?.name}" derneğini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          İptal
        </Button>
        <Button onClick={onConfirm} color="error" disabled={isLoading}>
          {isLoading ? 'Siliniyor...' : 'Sil'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 