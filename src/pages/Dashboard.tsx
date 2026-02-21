import { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  Button,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Event as EventIcon,
  People as UsersIcon,
  Category as CategoryIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

// New components
import { PageContainer, PageHeader, PageSection } from '../components/Page';
import { StatCard } from '../components/Data';
import { LoadingState, ErrorState } from '../components/Feedback';

interface DashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalEvents: number;
  upcomingEvents: number;
  totalUsers: number;
  activeUsers: number;
  totalCategories: number;
  totalLocations: number;
  totalFederations: number;
  featuredBusinesses: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalBusinesses: 156,
        activeBusinesses: 142,
        totalEvents: 89,
        upcomingEvents: 23,
        totalUsers: 1234,
        activeUsers: 1189,
        totalCategories: 12,
        totalLocations: 8,
        totalFederations: 10,
        featuredBusinesses: 24,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      const message = error.response?.data?.message || 'Failed to fetch dashboard statistics';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <PageContainer>
        <PageHeader title="Dashboard Overview" loading />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <StatCard title="Loading..." value={0} loading />
            </Grid>
          ))}
        </Grid>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Dashboard Overview" />
        <ErrorState message={error} onRetry={fetchStats} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard Overview" 
        subtitle="Summary of your platform activity"
        actions={
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchStats}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      {/* Stats Bar */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Featured Businesses"
            value={stats?.featuredBusinesses || 0}
            icon={<StarIcon />}
            color="primary"
            subtitle="Currently featured"
            trend={12.5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Businesses"
            value={stats?.totalBusinesses || 0}
            icon={<BusinessIcon />}
            color="primary"
            subtitle="Active businesses"
            trend={5.2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Events"
            value={stats?.upcomingEvents || 0}
            icon={<EventIcon />}
            color="success"
            subtitle="Live and upcoming"
            trend={-2.1}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={<UsersIcon />}
            color="warning"
            subtitle="Monthly active users"
            trend={8.4}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <PageSection 
            title="Recent Activity" 
            subtitle="Latest happenings across the platform"
          >
            <Box>
              {[1, 2, 3].map((item) => (
                <Box
                  key={item}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    p: 1.5,
                    borderRadius: 2,
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      color: 'primary.main',
                    }}
                  >
                    <EventIcon fontSize="small" />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      New event created
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      2 hours ago • By Admin
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </PageSection>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <PageSection 
            title="Quick Actions" 
            subtitle="Frequently used tasks"
          >
            <Grid container spacing={2}>
              {[
                { icon: <StarIcon />, label: 'Featured Businesses', color: 'primary', path: '/businesses' },
                { icon: <BusinessIcon />, label: 'Add Business', color: 'info', path: '/businesses' },
                { icon: <EventIcon />, label: 'Create Event', color: 'success', path: '/events' },
                { icon: <CategoryIcon />, label: 'Categories', color: 'warning', path: '/business-categories' },
              ].map((action) => (
                <Grid item xs={6} key={action.label}>
                  <Box
                    onClick={() => navigate(action.path)}
                    sx={{
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        borderColor: 'primary.main',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ color: `${action.color}.main`, mb: 1 }}>
                      {action.icon}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {action.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </PageSection>
        </Grid>
      </Grid>
    </PageContainer>
  );
}