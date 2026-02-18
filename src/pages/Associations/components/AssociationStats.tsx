import React from 'react';
import { Grid } from '@mui/material';
import {
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    Visibility as VisibilityIcon,
    Favorite as FavoriteIcon,
} from '@mui/icons-material';
import { AssociationStatsDto } from '../../../types/association/associationStatsDto';
import { StatCard } from '../../../components/Data';

interface AssociationStatsProps {
  stats?: AssociationStatsDto;
}

const AssociationStats: React.FC<AssociationStatsProps> = ({ stats }) => {
  const {
    activeMembers = 0,
    viewCount = 0,
    totalRevenue = 0,
    favoriteCount = 0,
  } = stats || {};

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Active Members"
          value={String(activeMembers)}
          icon={<PeopleIcon />}
          color="primary"
          subtitle="Currently active"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Profile Views"
          value={String(viewCount)}
          icon={<VisibilityIcon />}
          color="info"
          subtitle="Total profile views"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={<MoneyIcon />}
          color="success"
          subtitle="Overall revenue generated"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Favorites"
          value={String(favoriteCount)}
          icon={<FavoriteIcon />}
          color="warning"
          subtitle="Times marked as favorite"
        />
      </Grid>
    </Grid>
  );
};

export default AssociationStats;
 