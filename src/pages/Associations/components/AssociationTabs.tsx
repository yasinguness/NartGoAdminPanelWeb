import React, { useState } from 'react';
import { 
    Paper, 
    Tabs, 
    Tab, 
    Box, 
    Button, 
    List, 
    ListItem, 
    ListItemAvatar, 
    Avatar, 
    ListItemText, 
    Chip, 
    IconButton,
    Typography,
    Tooltip,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { 
    Add as AddIcon, 
    Event as EventIcon, 
    People as PeopleIcon, 
    AttachMoney as MoneyIcon,
    Business as BusinessIcon,
    ChevronRight as ChevronRightIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon,
    InfoOutlined as InfoIcon
} from '@mui/icons-material';
import { AssociationEvent, AssociationBenefit } from '../../../services/association/types';
import { UpcomingEvent, AssociationEventSummary } from '../../../types/association/associationEventSummary';
import { AssociationMemberDto } from '../../../types/associationMember/associationMemberDto';
import MemberDetailsDialog from './MemberDetailsDialog';
import AssociationTransactions from './AssociationTransactions';

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
      id={`association-detail-tabpanel-${index}`}
      aria-labelledby={`association-detail-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

interface AssociationTabsProps {
  tabValue: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  members: AssociationMemberDto[] | undefined;
  eventSummary: AssociationEventSummary | undefined;
  benefitsList: AssociationBenefit[] | undefined;
  onAddMember: () => void;
  onAddEvent: () => void;
  onAddBenefit: () => void;
  onEditBenefit: (benefit: AssociationBenefit) => void;
  onDeleteBenefit: (benefit: AssociationBenefit) => void;
  handleRowClick: (item: any) => void;
  isLoadingMembers?: boolean;
  isLoadingEvents?: boolean;
  isLoadingBenefits?: boolean;
  associationId: string;
}

const AssociationTabs: React.FC<AssociationTabsProps> = ({
  tabValue,
  onTabChange,
  members,
  eventSummary,
  benefitsList,
  onAddMember,
  onAddEvent,
  onAddBenefit,
  onEditBenefit,
  onDeleteBenefit,
  handleRowClick,
  isLoadingMembers,
  isLoadingEvents,
  isLoadingBenefits,
  associationId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedMember, setSelectedMember] = useState<AssociationMemberDto | null>(null);

  const getStatusColor = (status: string | undefined, type: 'member' | 'event' | 'benefit') => {
    if (!status) return 'default';
    status = status.toLowerCase();
    if (type === 'member') {
      if (status === 'active') return 'success';
      if (status === 'pending') return 'warning';
      if (status === 'suspended' || status === 'inactive') return 'error';
    }
    if (type === 'event') {
      if (status === 'upcoming') return 'info';
      if (status === 'ongoing') return 'success';
      if (status === 'past' || status === 'cancelled') return 'default';
    }
    if (type === 'benefit') {
      if (status === 'active') return 'success';
      if (status === 'pending') return 'warning';
      if (status === 'expired') return 'error';
    }
    return 'default';
  };
  
  const renderEmptyState = (message: string, icon: React.ReactNode) => (
    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
      {icon}
      <Typography variant="subtitle1" sx={{ mt: 1 }}>{message}</Typography>
    </Box>
  );

  const handleMemberClick = (member: AssociationMemberDto) => {
    setSelectedMember(member);
  };

  return (
    <Paper sx={{ width: '100%', borderRadius: 2, boxShadow: 1, overflow: 'hidden' }}>
      <Tabs
        value={tabValue}
        onChange={onTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab icon={<PeopleIcon />} iconPosition="start" label="Members" sx={{textTransform: 'none', px: isMobile ? 1.5: 2.5}} />
        <Tab icon={<EventIcon />} iconPosition="start" label="Events" sx={{textTransform: 'none', px: isMobile ? 1.5: 2.5}}/>
        <Tab icon={<BusinessIcon />} iconPosition="start" label="Benefits" sx={{textTransform: 'none', px: isMobile ? 1.5: 2.5}}/>
        <Tab icon={<MoneyIcon />} iconPosition="start" label="Transactions" sx={{textTransform: 'none', px: isMobile ? 1.5: 2.5}} />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAddMember} sx={{textTransform: 'none'}}>
            Add Member
          </Button>
        </Box>
        {isLoadingMembers ? <Typography sx={{textAlign:'center', p:3}}>Loading members...</Typography> : (
          <List dense={isMobile}>
            {members && members.length > 0 ? members.map((member) => (
              <ListItem
                button
                key={member.id}
                onClick={() => handleMemberClick(member)}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleMemberClick(member)}>
                    <ChevronRightIcon />
                  </IconButton>
                }
                sx={{py: 1.5, '&:hover': { backgroundColor: 'action.hover'}}}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'secondary.light' }}>{member.userFirstName[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${member.userFirstName} ${member.userLastName}`}
                  secondary={`Joined: ${new Date(member.membershipStartDate).toLocaleDateString()} | Type: ${member.membershipNumber || 'N/A'}`}
                  primaryTypographyProps={{fontWeight:'medium'}}
                />
                <Chip 
                  label={member.status} 
                  color={getStatusColor(member.status, 'member')}
                  size="small" 
                  sx={{ ml: 1, textTransform: 'capitalize' }} 
                />
              </ListItem>
            )) : renderEmptyState("No members found for this association.", <PeopleIcon sx={{fontSize: 40}}/>)}
          </List>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAddEvent} sx={{textTransform: 'none'}}>
            Add Event
          </Button>
        </Box>
         {isLoadingEvents ? <Typography sx={{textAlign:'center', p:3}}>Loading events...</Typography> : (
          <>
            <Typography variant="h6" gutterBottom>Upcoming Events</Typography>
            <List dense={isMobile}>
              {eventSummary?.upcomingEvents && eventSummary.upcomingEvents.length > 0 ? eventSummary.upcomingEvents.map((event) => (
                <ListItem
                  button
                  key={event.id}
                  onClick={() => handleRowClick(event)}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleRowClick(event)}>
                      <ChevronRightIcon />
                    </IconButton>
                  }
                  sx={{py: 1.5, '&:hover': { backgroundColor: 'action.hover'}}}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.light' }}><EventIcon /></Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={event.title}
                    secondary={`${new Date(event.eventTime).toLocaleDateString()} - ${new Date(event.eventTime).toLocaleDateString()} | ${event.address?.city || 'Location TBD'}`}
                    primaryTypographyProps={{fontWeight:'medium'}}
                  />
                  <Chip 
                      label="Upcoming" 
                      color={getStatusColor('upcoming', 'event')}
                      size="small" 
                      sx={{ ml: 1, textTransform: 'capitalize' }} 
                  />
                </ListItem>
              )) : renderEmptyState("No upcoming events scheduled.", <EventIcon sx={{fontSize: 40}}/>)}
            </List>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Completed Events</Typography>
            <List dense={isMobile}>
              {eventSummary?.completedEvents && eventSummary.completedEvents.length > 0 ? eventSummary.completedEvents.map((event) => (
                <ListItem
                  button
                  key={event.id}
                  onClick={() => handleRowClick(event)}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleRowClick(event)}>
                      <ChevronRightIcon />
                    </IconButton>
                  }
                  sx={{py: 1.5, '&:hover': { backgroundColor: 'action.hover'}}}
                >
                  <ListItemAvatar>
                    <Avatar><EventIcon /></Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={event.title}
                    secondary={`${new Date(event.eventTime).toLocaleDateString()} - ${new Date(event.eventTime).toLocaleDateString()} | ${event.address?.city || 'Location TBD'}`}
                    primaryTypographyProps={{fontWeight:'medium'}}
                  />
                  <Chip 
                      label="Past" 
                      color={getStatusColor('past', 'event')}
                      size="small" 
                      sx={{ ml: 1, textTransform: 'capitalize' }} 
                  />
                </ListItem>
              )) : renderEmptyState("No completed events found.", <EventIcon sx={{fontSize: 40}}/>)}
            </List>
          </>
         )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAddBenefit} sx={{textTransform: 'none'}}>
            Add Benefit
          </Button>
        </Box>
        {isLoadingBenefits ? <Typography sx={{textAlign:'center', p:3}}>Loading benefits...</Typography> : (
          <List dense={isMobile}>
            {benefitsList && benefitsList.length > 0 ? benefitsList.map((benefit) => (
              <ListItem
                button
                key={benefit.id}
                onClick={() => handleRowClick(benefit)}
                secondaryAction={
                  <Box>
                    <Tooltip title="Edit Benefit">
                      <IconButton edge="end" aria-label="edit" onClick={e => { e.stopPropagation(); onEditBenefit(benefit); }} sx={{mr: 0.5}}>
                        <EditIcon fontSize="small"/>
                      </IconButton>
                    </Tooltip>
                     <Tooltip title="Delete Benefit">
                      <IconButton edge="end" aria-label="delete" onClick={e => { e.stopPropagation(); onDeleteBenefit(benefit); }}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{py: 1.5, '&:hover': { backgroundColor: 'action.hover'}}}
              >
                <ListItemAvatar>
                  <Avatar sx={{bgcolor: 'warning.light'}}>
                    <BusinessIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={benefit.name || benefit.businessName || 'Unnamed Benefit'}
                  secondary={benefit.description || 'No description available.'}
                  primaryTypographyProps={{fontWeight:'medium'}}
                />
                <Chip 
                    label={benefit.discount ? `${benefit.discount}% off` : 'Details'}
                    color="primary" 
                    variant="outlined" 
                    size="small" 
                    sx={{ ml: 1 }} 
                />
              </ListItem>
            )) : renderEmptyState("No benefits available for this association.", <BusinessIcon sx={{fontSize: 40}}/>)}
          </List>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <AssociationTransactions associationId={associationId} />
      </TabPanel>

      {/* Member Details Dialog */}
      <MemberDetailsDialog
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
      />
    </Paper>
  );
};

export default AssociationTabs; 