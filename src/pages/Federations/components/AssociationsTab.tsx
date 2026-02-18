import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { BusinessStatus } from '../../../types/enums/businessStatus';
import { useFederationAssociations } from '../../../hooks/federations/useFederations';
import { AssociationDto } from '../../../types/association/associationDto';

interface AssociationsTabProps {
  federationId: string;
}

const AssociationsTab: React.FC<AssociationsTabProps> = ({ federationId }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: associations, isLoading, error } = useFederationAssociations(federationId);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleAddAssociation = () => {
    navigate(`/associations/new?federationId=${federationId}`);
  };

  const handleEditAssociation = (id: number) => {
    navigate(`/associations/${id}/edit`);
  };

  const handleDeleteAssociation = (id: number) => {
    // Implement delete functionality
    console.log('Delete association:', id);
  };

  const handleViewDetails = (id: number) => {
    navigate(`/associations/${id}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load associations.</Alert>;
  }

  const filteredAssociations = associations?.content.filter((association: AssociationDto) =>
    association.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (association.associationCode?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          placeholder="Search associations..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAssociation}
          sx={{ textTransform: 'none' }}
        >
          Add Association
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Association</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Location</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAssociations?.map((association) => (
              <TableRow
                key={association.id}
                hover
                onClick={() => handleViewDetails(Number(association.id))}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={association.logoUrl} alt={association.name} />
                    <Typography variant="body1">{association.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{association.associationCode}</TableCell>
                <TableCell>
                  <Chip
                    label={association.status}
                    color={association.status === BusinessStatus.ACTIVE ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{association.stats?.activeMembers ?? 0}</TableCell>
                <TableCell>
                  {association.address?.city}, {association.address?.country}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAssociation(Number(association.id));
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAssociation(Number(association.id));
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AssociationsTab; 