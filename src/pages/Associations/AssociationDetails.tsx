import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  alpha,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// Standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { LoadingState, ErrorState, ConfirmDialog } from '../../components/Feedback';

import { getAssociationBenefits, getAssociationTimeline, getAssociationLocation } from '../../services/association/associationService';
import { AssociationBenefit } from '../../services/association/types';
import AssociationStats from './components/AssociationStats';
import AssociationInfoSidebar from './components/AssociationInfoSidebar';
import AssociationTabs from './components/AssociationTabs';
import { useAssociationMembers } from '../../hooks/associationMembers/useAssociationMembers';
import { useAssociationById, useAssociationStats, useAssociationEvents } from '../../hooks/associations/useAssociations';

function AssociationDetails() {
  const navigate = useNavigate();
  const { associationId, ownerId } = useParams<{ associationId: string; ownerId: string }>();
  
  const [tabValue, setTabValue] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [benefitsList, setBenefitsList] = useState<AssociationBenefit[]>([]);
  const [isBenefitDialogOpen, setIsBenefitDialogOpen] = useState(false);
  const [isDeleteBenefitDialogOpen, setIsDeleteBenefitDialogOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<AssociationBenefit | null>(null);
  const [benefitForm, setBenefitForm] = useState<Partial<AssociationBenefit>>({});

  const { data: association, isLoading: isAssociationLoading, error: associationError } = useAssociationById(associationId);
  const { data: stats } = useAssociationStats(associationId);
  const { data: eventSummary, isLoading: isLoadingEvents } = useAssociationEvents(ownerId || '');
  const { members, isLoading: isLoadingMembers } = useAssociationMembers(associationId!);
  
  const { data: timeline } = useQuery({
    queryKey: ['association-timeline', associationId],
    queryFn: () => getAssociationTimeline(associationId!),
    enabled: !!associationId,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBack = () => navigate('/associations');
  const handleEdit = () => { /* Implement edit */ };
  const handleDelete = () => setIsDeleteDialogOpen(true);

  const handleDeleteConfirm = () => {
    setIsDeleteDialogOpen(false);
    navigate('/associations');
  };

  const handleBenefitFormSave = () => {
    if (selectedBenefit) {
      setBenefitsList((prev) => prev.map((b) => b.id === selectedBenefit.id ? { ...selectedBenefit, ...benefitForm } as AssociationBenefit : b));
    } else {
      setBenefitsList((prev) => [...prev, { ...benefitForm, id: Date.now().toString(), status: 'Active' } as AssociationBenefit]);
    }
    setIsBenefitDialogOpen(false);
    setBenefitForm({});
    setSelectedBenefit(null);
  };

  if (isAssociationLoading) return <LoadingState message="Fetching association details..." />;
  if (associationError || !association) return <ErrorState message="Could not load association details" onRetry={() => window.location.reload()} />;

  return (
    <PageContainer>
      <PageHeader
        title={association.name}
        subtitle={association.description || 'Association Profile'}
        backTo="/associations"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Associations', path: '/associations' },
          { label: association.name, active: true },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Stack>
        }
      />

      {/* Stats Summary */}
      <AssociationStats stats={stats} />

      <Grid container spacing={4}>
        {/* Left Column - Detailed Content */}
        <Grid item xs={12} lg={8}>
          <PageSection noPadding>
            <AssociationTabs
              tabValue={tabValue}
              onTabChange={handleTabChange}
              members={members}
              isLoadingMembers={isLoadingMembers}
              eventSummary={eventSummary}
              isLoadingEvents={isLoadingEvents}
              benefitsList={benefitsList}
              onAddMember={() => setIsAddMemberDialogOpen(true)}
              onAddEvent={() => setIsAddEventDialogOpen(true)}
              onAddBenefit={() => setIsBenefitDialogOpen(true)}
              onEditBenefit={(benefit) => { setSelectedBenefit(benefit); setBenefitForm(benefit); setIsBenefitDialogOpen(true); }}
              onDeleteBenefit={(benefit) => { setSelectedBenefit(benefit); setIsDeleteBenefitDialogOpen(true); }}
              handleRowClick={(item) => console.log('Item clicked:', item)}
              associationId={associationId!}
            />
          </PageSection>
        </Grid>

        {/* Right Column - Info Sidebar & Timeline */}
        <Grid item xs={12} lg={4}>
          <AssociationInfoSidebar 
            association={association}
            timeline={timeline || []}
          />
        </Grid>
      </Grid>

      {/* Dialogs */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete Association"
        message="Are you sure you want to delete this association? This action cannot be undone and will remove all related data."
        severity="error"
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteDialogOpen(false)}
      />

      {/* Add Member Dialog (Simplified for refactor) */}
      <Dialog open={isAddMemberDialogOpen} onClose={() => setIsAddMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Member</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="First Name" /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Last Name" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Email" type="email" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsAddMemberDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Add Member</Button>
        </DialogActions>
      </Dialog>

      {/* Benefit Form Dialog */}
      <Dialog open={isBenefitDialogOpen} onClose={() => setIsBenefitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedBenefit ? 'Edit Benefit' : 'Add Benefit'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Benefit Name"
              value={benefitForm.name || ''}
              onChange={e => setBenefitForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={benefitForm.description || ''}
              onChange={e => setBenefitForm(f => ({ ...f, description: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsBenefitDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBenefitFormSave}>Save Benefit</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

export default AssociationDetails;
 