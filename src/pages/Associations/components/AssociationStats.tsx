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
          title="Aktif Üyeler"
          value={String(activeMembers)}
          icon={<PeopleIcon />}
          color="primary"
          subtitle="Şu anda aktif"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Profil Görüntülenme"
          value={String(viewCount)}
          icon={<VisibilityIcon />}
          color="info"
          subtitle="Toplam profil görüntülenme"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Toplam Gelir"
          value={`${totalRevenue.toLocaleString()} TL`}
          icon={<MoneyIcon />}
          color="success"
          subtitle="Toplam elde edilen gelir"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Favoriler"
          value={String(favoriteCount)}
          icon={<FavoriteIcon />}
          color="warning"
          subtitle="Favorilere eklenme sayısı"
        />
      </Grid>
    </Grid>
  );
};

export default AssociationStats;
 