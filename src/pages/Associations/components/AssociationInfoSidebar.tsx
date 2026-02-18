import React from 'react';
import { Paper, Typography, Box, Button, Card, CardContent, CardHeader, Link, useTheme } from '@mui/material';
import { 
  LocationOn as LocationIcon, 
  Map as MapIcon, 
  Email as EmailIcon, 
  Phone as PhoneIcon,
  Language as WebsiteIcon // Assuming Association type has a website field
} from '@mui/icons-material';
import { AssociationTimeline } from '../../../services/association/types';
import { AssociationDto } from '../../../types/association/associationDto';

interface AssociationInfoSidebarProps {
  association: AssociationDto;
  timeline: AssociationTimeline[];
}

const AssociationInfoSidebar: React.FC<AssociationInfoSidebarProps> = ({ association, timeline }) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Contact Information Card */}
      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <CardHeader 
          title="Contact Information" 
          titleTypographyProps={{ variant: 'h6', fontWeight: 'medium' }}
          sx={{ pb: 1 }}
        />
        <CardContent sx={{ pt: 0 }}>
          {association.address && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5, gap: 1.5 }}>
              <LocationIcon color="action" sx={{ mt: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                {association.address.district} ,{association.address.city} ,{association.address.country}
              </Typography>
            </Box>
          )}
          {association.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
              <EmailIcon color="action" />
              <Link href={`mailto:${association.email}`} variant="body2" color="primary" sx={{textDecoration: 'none', '&:hover': {textDecoration: 'underline'}}}>
                {association.email}
              </Link>
            </Box>
          )}
          {association.phoneNumber && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
              <PhoneIcon color="action" />
              <Link href={`tel:${association.phoneNumber}`} variant="body2" color="text.secondary" sx={{textDecoration: 'none', '&:hover': {textDecoration: 'underline'}}}>
                {association.phoneNumber}
              </Link>
            </Box>
          )}
          {association.website && (
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 0, gap: 1.5 }}>
              <WebsiteIcon color="action" />
              <Link href={`//${association.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" variant="body2" color="primary" sx={{textDecoration: 'none', '&:hover': {textDecoration: 'underline'}}}>
                {association.website.replace(/^https?:\/\//, '')}
              </Link>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Location Map Card */}
      {(association.address) ? ( // Show card if we have coordinates or at least an address
        <Card sx={{ borderRadius: 2, boxShadow: 1, overflow: 'hidden' }}>
          <CardHeader 
            title="Location" 
            titleTypographyProps={{ variant: 'h6', fontWeight: 'medium' }}
            sx={{ pb: 1 }}
          />
          <CardContent sx={{pt:0}}>
            {association.address ? (
              <Box sx={{ height: 200, width: '100%', borderRadius: 1.5, overflow: 'hidden', mb: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                <iframe
                  title={`${association.name} Location`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps?q=${association.address.latitude},${association.address.longitude}&z=14&output=embed`}
                  allowFullScreen
                  loading="lazy"
                />
              </Box>
            ) : (
              <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100', borderRadius: 1.5, mb: 1.5 }}>
                <MapIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                 <Typography variant="caption" color="text.disabled" sx={{position: 'absolute'}}>Map data unavailable</Typography>
              </Box>
            )}
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
              <LocationIcon fontSize="small" color="action" sx={{mt:0.3}} />
              {association.address.district || 'Address not available'}
            </Typography>
              {association.address && (
              <Button
                variant="outlined"
                size="small"
                href={`https://www.google.com/maps/search/?api=1&query=${association.address.latitude},${association.address.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<MapIcon />}
                sx={{ textTransform: 'none' }}
              >
                View on Google Maps
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

     
    </Box>
  );
};

export default AssociationInfoSidebar; 