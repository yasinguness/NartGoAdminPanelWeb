import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  Avatar,
  Card,
  CardContent,
} from '@mui/material';
import {
  Email as EmailIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  CardMembership as MembershipIcon,
  EmojiEvents as BenefitsIcon,
} from '@mui/icons-material';
import { AssociationMemberDto } from '../../../types/associationMember/associationMemberDto';

interface MemberDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  member: AssociationMemberDto | null;
}

const MemberDetailsDialog: React.FC<MemberDetailsDialogProps> = ({ open, onClose, member }) => {
  if (!member) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {member.userFirstName[0]}
          </Avatar>
          <Box>
            <Typography variant="h6">
              {member.userFirstName} {member.userLastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(member.membershipStartDate).toLocaleDateString()} tarihinden beri üye
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Kişisel Bilgiler
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EmailIcon color="action" />
                    <Typography>{member.userEmail}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Membership Details */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Üyelik Detayları
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <MembershipIcon color="action" />
                    <Typography>
                      Üyelik Numarası: {member.membershipNumber || 'Belirtilmemiş'}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CalendarIcon color="action" />
                    <Typography>
                      Başlangıç Tarihi: {new Date(member.membershipStartDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {member.membershipEndDate && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarIcon color="action" />
                      <Typography>
                        Bitiş Tarihi: {new Date(member.membershipEndDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="action" />
                    <Typography>
                      Durum:{' '}
                      <Chip
                        label={member.status}
                        color={getStatusColor(member.status)}
                        size="small"
                      />
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Benefits */}
          {member.benefits && member.benefits.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Üye Avantajları
                  </Typography>
                  <Grid container spacing={2}>
                    {member.benefits.map((benefit, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          p={1}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <BenefitsIcon color="primary" />
                          <Box>
                            <Typography variant="subtitle2">
                              {benefit.benefitType}
                            </Typography>
                            {benefit.discountPercentage && (
                              <Typography variant="body2" color="text.secondary">
                                %{benefit.discountPercentage} indirim
                              </Typography>
                            )}
                            {benefit.couponCode && (
                              <Typography variant="body2" color="text.secondary">
                                Kod: {benefit.couponCode}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberDetailsDialog; 