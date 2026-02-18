import React from 'react';
import { Box, Card, Grid, Typography, Avatar } from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  MonetizationOn as MonetizationOnIcon,
} from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  Icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, Icon, color }) => (
  <Card
    sx={{
      display: 'flex',
      alignItems: 'center',
      p: 2,
      borderRadius: 2,
      boxShadow: 1,
      '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
      transition: 'all 0.2s ease-in-out',
      width: '100%',
    }}
  >
    <Avatar sx={{ bgcolor: color, color: 'common.white', mr: 2, width: 48, height: 48 }}>
      <Icon />
    </Avatar>
    <Box>
      <Typography color="text.secondary" variant="body2" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h5" component="div" fontWeight="bold">
        {value}
      </Typography>
      {change && (
        <Typography
          variant="caption"
          color={changeType === 'positive' ? 'success.main' : 'error.main'}
        >
          {changeType === 'positive' ? '▲' : '▼'} {change}
        </Typography>
      )}
    </Box>
  </Card>
);

const federationStats: StatCardProps[] = [
  { title: 'Total Associations', value: '24', change: '+2', changeType: 'positive', Icon: BusinessIcon, color: 'primary.main' },
  { title: 'Active Members', value: '1,234', change: '+156', changeType: 'positive', Icon: PeopleIcon, color: 'success.main' },
  { title: 'Pending Approvals', value: '5', change: '-2', changeType: 'negative', Icon: HourglassEmptyIcon, color: 'warning.main' },
  { title: 'Revenue (Monthly)', value: '$45,678', change: '+12%', changeType: 'positive', Icon: MonetizationOnIcon, color: 'info.main' },
];

export const FederationStats: React.FC = () => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    {federationStats.map((stat) => (
      <Grid item xs={12} sm={6} md={3} key={stat.title}>
        <StatCard {...stat} />
      </Grid>
    ))}
  </Grid>
); 