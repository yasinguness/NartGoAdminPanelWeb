import React, { useState } from 'react';
import { Button, Stack, Tooltip, IconButton, Box } from '@mui/material';
import { 
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Business as BusinessIcon,
    People as PeopleIcon,
    HourglassEmpty as HourglassEmptyIcon,
    MonetizationOn as MonetizationOnIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import FederationForm, { FederationFormValues } from './FederationForm';
import { useFederations, useCreateFederation, useUpdateFederation, useDeleteFederation } from '../../hooks/federations/useFederations';
import { FederationDto } from '../../types/federation/federationDto';
import { FederationCreateRequest } from '../../types/federation/federationCreateRequest';
import { FederationUpdateRequest } from '../../types/federation/federationUpdateRequest';
import { BusinessStatus } from '../../types/enums/businessStatus';

// Import standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable, StatCard, StatusChip } from '../../components/Data';
import { FilterBar, FilterSelect } from '../../components/Filter';
import { LoadingState, ErrorState, ConfirmDialog } from '../../components/Feedback';
import { ActionButton, ActionMenu } from '../../components/Actions';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';

const mapDtoToFormValues = (federation: FederationDto): FederationFormValues => ({
  name: federation.name || '',
  code: federation.federationCode || '',
  description: federation.description || '',
  contactEmail: federation.email || '',
  contactPhone: federation.phoneNumber || '',
  address: federation.address?.description || '',
  website: federation.website || '',
  establishedDate: federation.foundationDate ? new Date(federation.foundationDate).toISOString().split('T')[0] : '',
  status: (federation.status as FederationFormValues['status']) || 'PENDING',
  logo: federation.logoUrl || '',
  coverImage: federation.coverImageUrl || '',
  socialMedia: {
    facebook: '',
    twitter: '',
    instagram: '',
  },
});

const mapFormValuesToCreateRequest = (values: FederationFormValues): FederationCreateRequest => ({
  name: values.name,
  description: values.description,
  foundationDate: values.establishedDate ? new Date(values.establishedDate) : undefined,
  logoUrl: typeof values.logo === 'string' ? values.logo : undefined,
  coverImageUrl: typeof values.coverImage === 'string' ? values.coverImage : undefined,
  website: values.website,
  email: values.contactEmail,
  phoneNumber: values.contactPhone,
  address: values.address ? { description: values.address, city: '', district: '', country: '', isDefault: false, id: '' } : undefined,
  socialMedia: [], // Not mapped from form
  ownerId: '', // Set this as needed
});

const mapFormValuesToUpdateRequest = (values: FederationFormValues): FederationUpdateRequest => ({
  name: values.name,
  description: values.description,
  logoUrl: typeof values.logo === 'string' ? values.logo : undefined,
  website: values.website,
  email: values.contactEmail,
  phoneNumber: values.contactPhone,
  status: values.status as BusinessStatus,
});

const Federations: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedFederation, setSelectedFederation] = useState<FederationFormValues | undefined>();
  const [editFederationId, setEditFederationId] = useState<string | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [federationToDelete, setFederationToDelete] = useState<string | null>(null);

  // CRUD hooks
  const { data: federations, isLoading, isError, error } = useFederations({ searchTerm });
  const createFederation = useCreateFederation();
  const updateFederation = useUpdateFederation();
  const deleteFederation = useDeleteFederation();

  const handleCreateFederation = () => {
    setIsEdit(false);
    setSelectedFederation(undefined);
    setEditFederationId(undefined);
    setIsFormOpen(true);
  };

  const handleEditFederation = (federation: FederationDto) => {
    setIsEdit(true);
    setEditFederationId(federation.id);
    setSelectedFederation(mapDtoToFormValues(federation));
    setIsFormOpen(true);
  };

  const handleDeleteClick = (federationId: string) => {
    setFederationToDelete(federationId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (federationToDelete) {
      deleteFederation.mutate(federationToDelete, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setFederationToDelete(null);
        },
      });
    }
  };

  const handleFormSubmit = (values: FederationFormValues) => {
    if (isEdit && editFederationId) {
      updateFederation.mutate({
        id: editFederationId,
        request: mapFormValuesToUpdateRequest(values),
        logoImage: typeof values.logo !== 'string' ? values.logo : undefined,
      }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditFederationId(undefined);
        },
      });
    } else {
      createFederation.mutate({
        request: mapFormValuesToCreateRequest(values),
        logoImage: typeof values.logo !== 'string' ? values.logo : undefined,
        coverImage: typeof values.coverImage !== 'string' ? values.coverImage : undefined,
      }, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  const handleViewFederation = (federationId: string) => {
    navigate(`/federations/${federationId}`);
  };

  const filteredFederations = federations?.filter(fed => {
    const term = searchTerm.toLowerCase();
    const status = statusFilter.toLowerCase();
    return (
      (fed.name.toLowerCase().includes(term) || (fed.federationCode?.toLowerCase() || '').includes(term)) &&
      (status === 'all' || fed.status.toLowerCase() === status)
    );
  }) || [];

  const columns = [
    { 
      id: 'name', 
      label: 'Federation Name',
      render: (row: FederationDto) => (
        <Box fontWeight={600} color="primary.main">{row.name}</Box>
      )
    },
    { id: 'federationCode', label: 'Code' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row: FederationDto) => <StatusChip status={row.status} />
    },
    { 
      id: 'members', 
      label: 'Members',
      align: 'center' as const,
      render: (row: FederationDto) => row.stats?.totalMembers ?? '0'
    },
    { 
      id: 'associations', 
      label: 'Associations',
      align: 'center' as const,
      render: (row: FederationDto) => row.associationIds?.length ?? '0'
    },
    { 
      id: 'date', 
      label: 'Foundation Date',
      render: (row: FederationDto) => row.foundationDate ? new Date(row.foundationDate).toLocaleDateString() : '-'
    }
  ];

  if (isError) {
    return (
      <PageContainer>
        <ErrorState 
          title="Error loading federations" 
          message={error?.message || "An unexpected error occurred"} 
          onRetry={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Federations"
        subtitle="Manage national sporting federations and their hierarchies"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateFederation}
          >
            Add Federation
          </Button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Federations', active: true },
        ]}
      />

      {/* Statistics Row */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mb={4}>
        <StatCard 
          title="Total Associations" 
          value="24" 
          trend={2} 
          icon={<BusinessIcon />} 
          color="primary"
        />
        <StatCard 
          title="Active Members" 
          value="1,234" 
          trend={156} 
          icon={<PeopleIcon />} 
          color="success"
        />
        <StatCard 
          title="Pending Approvals" 
          value="5" 
          trend={-2} 
          icon={<HourglassEmptyIcon />} 
          color="warning"
        />
        <StatCard 
          title="Monthly Revenue" 
          value="$45,678" 
          trend={12} 
          icon={<MonetizationOnIcon />} 
          color="info"
        />
      </Stack>

      {/* Filter Section */}
      <PageSection>
        <FilterBar
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "Search by name or code...",
          }}
          filters={
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as string)}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Pending', value: 'pending' },
                { label: 'Suspended', value: 'suspended' },
              ]}
            />
          }
        />
      </PageSection>

      {/* Main Content Table */}
      <PageSection>
        <DataTable
          columns={columns}
          data={filteredFederations}
          loading={isLoading}
          onRowClick={(row) => handleViewFederation(row.id)}
          renderRowActions={(row) => (
            <ActionMenu>
              <MenuItem onClick={(e) => { e.stopPropagation(); handleViewFederation(row.id); }}>
                <ListItemIcon>
                  <VisibilityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>View Details</ListItemText>
              </MenuItem>
              <MenuItem onClick={(e) => { e.stopPropagation(); handleEditFederation(row); }}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit Federation</ListItemText>
              </MenuItem>
              <MenuItem onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id); }} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </ActionMenu>
          )}
        />
      </PageSection>

      {/* Federation Form Dialog */}
      <FederationForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialValues={selectedFederation}
        isEdit={isEdit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete Federation"
        message="Are you sure you want to delete this federation? This action is permanent and will affect all associated associations and members."
        severity="error"
        confirmText='Delete Federation'
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
    </PageContainer>
  );
};

export default Federations;
