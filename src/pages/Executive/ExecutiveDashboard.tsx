import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { useRole } from '../../hooks/useRole';
import { useExecutiveData } from './useExecutiveData';
import PeriodSelector from './components/PeriodSelector';
import RevenueSection from './sections/RevenueSection';
import GrowthSection from './sections/GrowthSection';
import FunnelSection from './sections/FunnelSection';
import OperationalSection from './sections/OperationalSection';
import PlatformHealthSection from './sections/PlatformHealthSection';
import AdminShell from '../../components/AdminShell';
import type { TimeRange } from '../../services/executive/executiveTypes';

export default function ExecutiveDashboard() {
  const { isAdmin, userName } = useRole();
  const [range, setRange] = useState<TimeRange>('7d');
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useExecutiveData(range);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const partial = data?.partial || { revenue: true, growth: true, funnel: true, operational: true, platform: true };
  const allPartial = partial.revenue && partial.growth && partial.funnel && partial.operational && partial.platform;

  return (
    <AdminShell
      title="Stratejik Kontrol Paneli"
      subtitle={`Merhaba ${userName} — platformun nabzı 30 saniyede.`}
      icon={<TrendingUpIcon sx={{ fontSize: 26 }} />}
      label="Stratejik Panel • Yalnızca Admin"
      actions={<PeriodSelector value={range} onChange={setRange} />}
      isFetching={isFetching}
      lastUpdatedAt={dataUpdatedAt}
      onRefresh={() => refetch()}
      showEmptyDataAlert={allPartial && !isLoading}
      emptyDataMessage="Stratejik panel endpoint'leri (/admin/executive/*) henüz yayında değil. Mevcut servislerden türetilen yaklaşık değerler gösteriliyor."
      onEmptyDataRetry={() => refetch()}
      footerText={`NARTGO STRATEJİK PANEL • ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
    >
      <Stack spacing={3}>
        <RevenueSection data={data?.revenue ?? null} loading={isLoading} partial={!!partial.revenue} />
        <GrowthSection data={data?.growth ?? null} loading={isLoading} partial={!!partial.growth} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          <FunnelSection data={data?.funnel ?? null} loading={isLoading} partial={!!partial.funnel} />
          <OperationalSection data={data?.operational ?? null} loading={isLoading} partial={!!partial.operational} />
        </Box>
        <PlatformHealthSection data={data?.platform ?? null} loading={isLoading} partial={!!partial.platform} />
      </Stack>
    </AdminShell>
  );
}
