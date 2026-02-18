import React from 'react';
import { Box, Typography, Avatar, Chip, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface AssociationHeaderProps {
  association: any;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const AssociationHeader: React.FC<AssociationHeaderProps> = ({ association, onBack, onEdit, onDelete }) => {
  return (
    <Box sx={{ mb: 4, mt: 2, maxWidth: '100%' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ mb: 2 }}
      >
        Back to Federation
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', maxWidth: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={association.logo} sx={{ width: 56, height: 56 }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {association.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip label={association.code} size="small" />
              <Chip
                label={association.status}
                color={association.status === 'Active' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </Box>
        <Box>
          <Button onClick={onEdit} color="primary" startIcon={<EditIcon />} sx={{ mr: 1 }}>
            Edit
          </Button>
          <Button onClick={onDelete} color="error" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AssociationHeader; 