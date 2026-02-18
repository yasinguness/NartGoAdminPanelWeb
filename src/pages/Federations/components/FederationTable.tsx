import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { FederationDto } from '../../../types/federation/federationDto';

interface FederationTableProps {
  federations: FederationDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onEdit: (federation: FederationDto) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'pending':
    case 'pending_approval':
      return 'warning';
    case 'suspended':
    case 'cancelled':
    case 'passive':
      return 'error';
    default:
      return 'default';
  }
};

export const FederationTable: React.FC<FederationTableProps> = ({
  federations,
  isLoading,
  isError,
  error,
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onEdit,
  onDelete,
  onView,
}) => {
  const filteredFederations = federations?.filter(fed => {
    const term = searchTerm.toLowerCase();
    const status = statusFilter.toLowerCase();
    return (
      (fed.name.toLowerCase().includes(term) || (fed.federationCode?.toLowerCase() || '').includes(term)) &&
      (status === 'all' || fed.status.toLowerCase() === status)
    );
  });

  return (
    <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
      <CardHeader
        title="Federations List"
        titleTypographyProps={{ variant: 'h6', fontWeight: 'medium' }}
        action={
          <IconButton>
            <FilterIcon />
          </IconButton>
        }
        sx={{ pt: 2, pb: 1, px: 2 }}
      />
      <CardContent sx={{ pt: 1 }}>
        <Box
          sx={{
            mb: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <TextField
            placeholder="Search federations by name or code..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 300 } }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => onStatusFilterChange(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 1.5, boxShadow: 'none', overflowX: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 1.5 }}>Members</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', py: 1.5 }}>Associations</TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Last Updated</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', py: 1.5 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="subtitle1">Loading federations...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="subtitle1" color="error">
                        {error?.message || 'Failed to load federations.'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filteredFederations && filteredFederations.length > 0 ? (
                filteredFederations.map((federation) => (
                  <TableRow
                    key={federation.id}
                    hover
                    onClick={() => onView(federation.id)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell sx={{ py: 1 }} component="th" scope="row">
                      <Typography variant="body2" fontWeight="medium">{federation.name}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>{federation.federationCode || '-'}</TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Chip
                        label={federation.status}
                        color={getStatusColor(federation.status) as "success" | "warning" | "error" | "default"}
                        size="small"
                        sx={{ textTransform: 'capitalize', fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>{federation.stats?.totalMembers ?? '-'}</TableCell>
                    <TableCell sx={{ py: 1, textAlign: 'center' }}>{federation.associationIds?.length ?? '-'}</TableCell>
                    <TableCell sx={{ py: 1 }}>{federation.foundationDate ? new Date(federation.foundationDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell align="right" sx={{ py: 1 }}>
                      <MuiTooltip title="View Details">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(federation); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </MuiTooltip>
                      <MuiTooltip title="Delete Federation">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(federation.id); }}>
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </MuiTooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="subtitle1" color="textSecondary">
                        No federations match your criteria.
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Try adjusting your search or filters.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}; 