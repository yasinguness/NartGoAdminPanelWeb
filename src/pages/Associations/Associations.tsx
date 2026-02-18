import React, { useState, useMemo } from 'react';
import {
  Typography,
  Button,
  Stack,
  Avatar,
  Box,
  Grid,
} from '@mui/material';
import { ActionButton, ActionMenu } from '../../components/Actions';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Import standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { StatCard, DataTable, StatusChip } from '../../components/Data';
import { FilterBar } from '../../components/Filter';
import { ConfirmDialog } from '../../components/Feedback';

import { useAssociations, useCreateAssociation, useUpdateAssociation, useDeleteAssociation } from '../../hooks/associations/useAssociations';
import { AssociationCreateRequest } from '../../types/association/associationCreateRequest';
import { AssociationUpdateRequest } from '../../types/association/associationUpdateRequest';
import AssociationForm from './AssociationForm';
import { AssociationCharts } from './components/AssociationCharts';
import { AssociationSummaryResponse } from '../../types/association/associationSummaryResponse';

const Associations = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editAssociationId, setEditAssociationId] = useState<string | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [associationToDelete, setAssociationToDelete] = useState<AssociationSummaryResponse | null>(null);

  // CRUD hooks
  const { data: associations, isLoading, error } = useAssociations({ searchTerm });
  const createAssociation = useCreateAssociation();
  const updateAssociation = useUpdateAssociation();
  const deleteAssociation = useDeleteAssociation();

  const handleCreateAssociation = () => {
    setIsEdit(false);
    setEditAssociationId(undefined);
    setIsFormOpen(true);
  };

  const handleEditAssociation = (association: AssociationSummaryResponse) => {
    setIsEdit(true);
    setEditAssociationId(association.id);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (association: AssociationSummaryResponse) => {
    setAssociationToDelete(association);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (associationToDelete) {
      deleteAssociation.mutate(associationToDelete.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setAssociationToDelete(null);
        },
      });
    }
  };

  const handleFormSubmit = (values: AssociationCreateRequest) => {
    if (isEdit && editAssociationId) {
      const updateRequest: AssociationUpdateRequest = {
        name: values.name,
        description: values.description,
        taxNumber: values.taxNumber,
        website: values.website,
        email: values.email,
        phoneNumber: values.phoneNumber,
        membershipFee: values.membershipFee,
        membershipDurationMonths: values.membershipDurationMonths,
      };

      updateAssociation.mutate({
        id: editAssociationId,
        request: updateRequest,
      }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditAssociationId(undefined);
        },
      });
    } else {
      createAssociation.mutate(values, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  const handleViewAssociation = (association: AssociationSummaryResponse) => {
    navigate(`/associations/${association.id}/${association.ownerId}`);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const content = associations?.content || [];
    return {
      total: content.length,
      active: content.length, // Placeholder logic
      members: 0,
      growth: '+12%',
    };
  }, [associations]);

  const columns = [
    {
      id: 'name',
      label: 'Association',
      render: (row: AssociationSummaryResponse) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar 
            sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: 'primary.light',
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}
          >
            {row.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 200 }}>
              {row.description || 'No description'}
            </Typography>
          </Box>
        </Stack>
      )
    },
    {
      id: 'taxNumber',
      label: 'Tax ID',
      accessor: 'taxNumber' as keyof AssociationSummaryResponse,
    },
    {
      id: 'status',
      label: 'Status',
      render: () => <StatusChip status="ACTIVE" />,
    },
    {
      id: 'createdAt',
      label: 'Created',
      render: (row: AssociationSummaryResponse) => (
        <Typography variant="body2" color="text.secondary">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'}
        </Typography>
      )
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Association Management"
        subtitle="Manage member organizations, tax details, and subscriptions"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateAssociation}
          >
            Create Association
          </Button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Associations', active: true },
        ]}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Associations"
            value={String(stats.total)}
            icon={<BusinessIcon />}
            trend={8}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Groups"
            value={String(stats.active)}
            icon={<TrendingUpIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Members"
            value="1.2k"
            icon={<PeopleIcon />}
            trend={15}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Revenue Growth"
            value={stats.growth}
            icon={<AssessmentIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      <PageSection title="Analytics Overview" sx={{ mb: 4 }}>
        <AssociationCharts />
      </PageSection>

      <PageSection title="Associations Directory">
        <FilterBar
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "Search by name, description or tax ID...",
          }}
          sx={{ mb: 3 }}
        />
        
        <DataTable
          columns={columns}
          data={associations?.content || []}
          loading={isLoading}
          onRowClick={handleViewAssociation}
          renderRowActions={(row) => (
            <ActionMenu>
                <MenuItem onClick={() => handleViewAssociation(row)}>
                  <ListItemIcon>
                    <VisibilityIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>View</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleEditAssociation(row)}>
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleDeleteClick(row)} sx={{ color: 'error.main' }}>
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Delete</ListItemText>
                </MenuItem>
            </ActionMenu>
          )}
        />
      </PageSection>

      <AssociationForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        associationId={editAssociationId}
        isEdit={isEdit}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete Association"
        message={`Are you sure you want to delete ${associationToDelete?.name}? This will remove all associated member data.`}
        severity="error"
        confirmText="Delete Permanently"
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
    </PageContainer>
  );
};

export default Associations;
 