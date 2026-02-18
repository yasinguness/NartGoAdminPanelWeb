import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Tabs,
  Tab,
  Button,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  MonetizationOn as MonetizationOnIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Event as EventIcon,
  EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material';

// Import standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { StatCard, StatusChip } from '../../components/Data';
import { LoadingState, ErrorState, ConfirmDialog } from '../../components/Feedback';
import { FormGrid } from '../../components/Form';

import MembersTab from './components/MembersTab';
import AssociationsTab from './components/AssociationsTab';
import { BusinessStatus } from '../../types/enums/businessStatus';
import { useFederationById, useDeleteFederation } from '../../hooks/federations/useFederations';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`federation-tabpanel-${index}`}
      aria-labelledby={`federation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const FederationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!id) return null;

  const { data: federation, isLoading, error } = useFederationById(id);
  const deleteFederation = useDeleteFederation();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    // This would typically open the edit form or navigate to an edit page
    console.log('Edit federation:', id);
  };

  const handleDeleteConfirm = () => {
    deleteFederation.mutate(id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        navigate('/federations');
      },
    });
  };

  if (isLoading) return <LoadingState message="Loading federation details..." />;

  if (error || !federation) {
    return (
      <PageContainer>
        <ErrorState 
          title="Failed to load federation" 
          message={error?.message || "Could not find the requested federation"} 
          onRetry={() => window.location.reload()}
        />
      </PageContainer>
    );
  }

  const {
    name,
    federationCode,
    status,
    logoUrl,
    coverImageUrl,
    description,
    email,
    phoneNumber,
    website,
    address,
    foundationDate,
    stats,
    totalAssociationCount,
  } = federation;

  return (
    <PageContainer>
      <PageHeader
        title={name}
        subtitle={`Federation Code: ${federationCode}`}
        backTo="/federations"
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />} 
              onClick={handleEdit}
            >
              Edit Federation
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<DeleteIcon />} 
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </Stack>
        }
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Federations', path: '/federations' },
          { label: name, active: true },
        ]}
      />

      {/* Hero Banner Section */}
      <Box sx={{
        mb: 4,
        width: '100%',
        height: { xs: 200, md: 300 },
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
      }}>
        <Box
          component="img"
          src={coverImageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=2000'}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
          p: 4,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 3,
        }}>
          <Avatar 
            src={logoUrl} 
            sx={{ 
              width: 100, 
              height: 100, 
              border: '4px solid white',
              boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
              bgcolor: 'background.paper'
            }} 
          >
            {name.charAt(0)}
          </Avatar>
          <Box sx={{ pb: 1 }}>
            <Typography variant="h3" color="white" fontWeight={700} sx={{ mb: 1, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              {name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <StatusChip status={status} />
              <Typography variant="body2" color="rgba(255,255,255,0.8)" fontWeight={500}>
                Founded {foundationDate ? new Date(foundationDate).toLocaleDateString() : 'N/A'}
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Sidebar Info */}
        <Grid item xs={12} md={4}>
          <PageSection title="Federation Info">
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={600}>About</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                  {description || 'No description provided.'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={600}>Contact</Typography>
                <Stack spacing={1} mt={1}>
                  <Typography variant="body2"><strong>Email:</strong> {email || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Phone:</strong> {phoneNumber || 'N/A'}</Typography>
                  <Typography variant="body2">
                    <strong>Website:</strong> {website ? <a href={website} target="_blank" rel="noopener noreferrer">{website}</a> : 'N/A'}
                  </Typography>
                </Stack>
              </Box>

              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={600}>Location</Typography>
                <Typography variant="body2" mt={1}>
                  {address ? `${address.description || ''} ${address.city ? ', ' + address.city : ''}` : 'No address provided'}
                </Typography>
              </Box>
            </Stack>
          </PageSection>
        </Grid>

        {/* Main Tabs Area */}
        <Grid item xs={12} md={8}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab icon={<DashboardIcon />} iconPosition="start" label="Overview" />
              <Tab icon={<BusinessIcon />} iconPosition="start" label="Associations" />
              <Tab icon={<GroupIcon />} iconPosition="start" label="Members" />
              <Tab icon={<EventIcon />} iconPosition="start" label="Coming Soon" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <StatCard 
                  title="Total Associations" 
                  value={String(totalAssociationCount || 0)} 
                  icon={<BusinessIcon />} 
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatCard 
                  title="Total Members" 
                  value={String(stats?.totalMembers || 0)} 
                  icon={<GroupIcon />} 
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatCard 
                  title="Active Members" 
                  value={String(stats?.activeMembers || 0)} 
                  icon={<PersonAddIcon />} 
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatCard 
                  title="Member Participation" 
                  value="88%" 
                  icon={<EmojiEventsIcon />} 
                  color="warning"
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <AssociationsTab federationId={id} />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <MembersTab federationId={id} />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <PageSection>
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <EventIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" gutterBottom>Events & Competitions</Typography>
                <Typography color="text.secondary">This module is currently under development.</Typography>
              </Box>
            </PageSection>
          </TabPanel>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete Federation"
        message={`Are you sure you want to delete ${name}? This action will permanently remove the federation and all its associated data.`}
        severity="error"
        confirmLabel="Delete Permanently"
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
    </PageContainer>
  );
};

export default FederationDetails;
 