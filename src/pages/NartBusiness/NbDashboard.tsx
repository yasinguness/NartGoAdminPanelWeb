import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PeopleAlt as PeopleIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  CreditCard as PaymentIcon,
  TrendingUp as TrendingIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbDashboardStats, MembershipTier } from '../../services/nartbusiness/nbTypes';

const TIER_LABELS: Record<MembershipTier, string> = {
  KURUCU: 'Kurucu',
  STANDART: 'Standart',
  GENC_GIRISIMCI: 'Genç Girişimci',
  PATRON: 'Patron',
};

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}.lighter`,
              color: `${color}.main`,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function NbDashboard() {
  const [stats, setStats] = useState<NbDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    nbAdminService
      .getDashboardStats()
      .then((data) => {
        if (!mounted) return;
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message ?? 'Veri yüklenemedi');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!stats) return <Alert severity="info">NB Dashboard verisi yok.</Alert>;

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        NartBusiness — Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Üyelik, doğrulama ve ödeme akışlarının özet KPI'ları.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Üye"
            value={stats.totalMembers}
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Aktif Üye"
            value={stats.activeMembers}
            icon={<CheckIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Doğrulama Bekleyen"
            value={stats.pendingVerification}
            icon={<PendingIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ödeme Bekleyen"
            value={stats.paymentPending}
            icon={<PaymentIcon />}
            color="error"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <BusinessIcon color="primary" />
                <Typography variant="h6">Kademe Dağılımı</Typography>
              </Stack>
              <Stack spacing={1}>
                {Object.entries(stats.membersByTier).map(([tier, count]) => (
                  <Stack
                    key={tier}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography>{TIER_LABELS[tier as MembershipTier]}</Typography>
                    <Typography fontWeight={600}>{count}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <TrendingIcon color="success" />
                <Typography variant="h6">Son 7 Gün</Typography>
              </Stack>
              <Typography variant="h3" fontWeight={600}>
                {stats.recentApplicationsLast7Days}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                yeni üyelik başvurusu
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
