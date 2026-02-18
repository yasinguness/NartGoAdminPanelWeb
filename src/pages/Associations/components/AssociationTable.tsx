import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Card,
  Avatar,
  Tooltip,
  Fade,
  alpha,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { AssociationSummaryResponse } from '../../../types/association/associationSummaryResponse';

interface AssociationTableProps {
  associations: AssociationSummaryResponse[];
  isLoading: boolean;
  error: string | null;
  onEdit: (association: AssociationSummaryResponse) => void;
  onDelete: (association: AssociationSummaryResponse) => void;
  onView: (association: AssociationSummaryResponse) => void;
}

export const AssociationTable: React.FC<AssociationTableProps> = ({
  associations,
  isLoading,
  error,
  onEdit,
  onDelete,
  onView,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredAssociations = associations.filter(association =>
    association.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    association.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedAssociations = filteredAssociations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} sx={{ mb: 2, p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={60} height={60} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" sx={{ fontSize: '1.5rem', width: '40%' }} />
                <Skeleton variant="text" sx={{ fontSize: '1rem', width: '60%' }} />
                <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '30%' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="circular" width={40} height={40} />
              </Box>
            </Box>
          </Card>
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          <Typography variant="h6">Error loading associations</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Search Bar */}
      <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#667eea', 0.1)}` }}>
        <TextField
          fullWidth
          placeholder="Search associations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha('#667eea', 0.02),
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Association Cards for Mobile, Table for Desktop */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {paginatedAssociations.map((association, index) => (
          <Fade in timeout={300 + index * 100} key={association.id}>
            <Card 
              sx={{ 
                m: 2, 
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                }
              }}
              onClick={() => onView(association)}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 60, 
                      height: 60,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontSize: '1.5rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {association.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="600" sx={{ mb: 0.5 }}>
                      {association.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {association.description}
                    </Typography>
                    <Chip 
                      size="small" 
                      label="Active" 
                      color="success"
                      sx={{ borderRadius: 2 }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onView(association); }}
                      sx={{ bgcolor: alpha('#667eea', 0.1) }}
                    >
                      <VisibilityIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onEdit(association); }}
                      sx={{ bgcolor: alpha('#f093fb', 0.1) }}
                    >
                      <EditIcon sx={{ color: '#f093fb' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onDelete(association); }}
                      sx={{ bgcolor: alpha('#f5576c', 0.1) }}
                    >
                      <DeleteIcon sx={{ color: '#f5576c' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Card>
          </Fade>
        ))}
      </Box>

      {/* Desktop Table */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#667eea', 0.08) }}>
                <TableCell sx={{ fontWeight: 600, py: 2 }}>Association</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contact Info</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedAssociations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">
                        No associations found
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        Try adjusting your search or create a new association
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAssociations.map((association, index) => (
                  <Fade in timeout={300 + index * 100} key={association.id}>
                    <TableRow 
                      hover 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha('#667eea', 0.04) },
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => onView(association)}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            sx={{ 
                              width: 50, 
                              height: 50,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              fontWeight: 'bold'
                            }}
                          >
                            {association.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight="600">
                              {association.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {association.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                       {/*  <Box>
                          {association.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <EmailIcon fontSize="small" color="disabled" />
                              <Typography variant="body2">{association.email}</Typography>
                            </Box>
                          )}
                          {association.phoneNumber && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon fontSize="small" color="disabled" />
                              <Typography variant="body2">{association.phoneNumber}</Typography>
                            </Box>
                          )}
                          {!association.email && !association.phoneNumber && (
                            <Typography variant="body2" color="text.disabled">
                              No contact info
                            </Typography>
                          )}
                        </Box> */}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label="Active" 
                          color="success" 
                          size="small"
                          sx={{ borderRadius: 2, fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {association.createdAt ? new Date(association.createdAt).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={(e) => { e.stopPropagation(); onView(association); }}
                              sx={{ 
                                bgcolor: alpha('#667eea', 0.1),
                                '&:hover': { bgcolor: alpha('#667eea', 0.2) }
                              }}
                            >
                              <VisibilityIcon color="primary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small"
                              onClick={(e) => { e.stopPropagation(); onEdit(association); }}
                              sx={{ 
                                bgcolor: alpha('#f093fb', 0.1),
                                '&:hover': { bgcolor: alpha('#f093fb', 0.2) }
                              }}
                            >
                              <EditIcon sx={{ color: '#f093fb' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small"
                              onClick={(e) => { e.stopPropagation(); onDelete(association); }}
                              sx={{ 
                                bgcolor: alpha('#f5576c', 0.1),
                                '&:hover': { bgcolor: alpha('#f5576c', 0.2) }
                              }}
                            >
                              <DeleteIcon sx={{ color: '#f5576c' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </Fade>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ 
          borderTop: `1px solid ${alpha('#667eea', 0.1)}`,
          bgcolor: alpha('#667eea', 0.02)
        }}>
          <TablePagination
            component="div"
            count={filteredAssociations.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{ '& .MuiTablePagination-toolbar': { px: 3 } }}
          />
        </Box>
      </Box>
    </Box>
  );
}; 