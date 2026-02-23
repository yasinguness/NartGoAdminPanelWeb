import { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  Button,
  Stack,
  alpha
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
import { 
  KeyboardArrowRight as ArrowRightIcon,
  Security as SecurityIcon,
  History as HistoryIcon
} from '@mui/icons-material';

// Security Dashboard Components
import SecurityStatCards from './Dashboard/components/SecurityStatCards';
import RecentLoginsList from './Dashboard/components/RecentLoginsList';
import { LoginLog, SecurityStats, LoginStatus } from '../types/security/securityModel';

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
  const [securityLogs, setSecurityLogs] = useState<LoginLog[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
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

      // Mock Security Data
      setSecurityStats({
        totalAttempts: 12450,
        successCount: 12100,
        failureCount: 350,
        uniqueIps: 842,
        suspiciousActivityCount: 12,
        failureRate: 2.8,
        timeWindows: []
      });

      setSecurityLogs([
        {
          id: '1',
          username: 'admin@nartgo.com',
          ipAddress: '192.168.1.45',
          status: LoginStatus.SUCCESS,
          timestamp: new Date().toISOString(),
          location: { city: 'Istanbul', country: 'Turkey' },
          device: { browser: 'Chrome', os: 'macOS', type: 'desktop' }
        },
        {
          id: '2',
          username: 'user_active_99',
          ipAddress: '88.241.12.33',
          status: LoginStatus.FAILED,
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          location: { city: 'Ankara', country: 'Turkey' },
          device: { browser: 'Safari', os: 'iOS', type: 'mobile' },
          failureReason: 'Invalid password'
        },
        {
          id: '3',
          username: 'moderator_x',
          ipAddress: '77.12.33.111',
          status: LoginStatus.SUCCESS,
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          location: { city: 'Izmir', country: 'Turkey' },
          device: { browser: 'Firefox', os: 'Windows', type: 'desktop' }
        },
        {
          id: '4',
          username: 'unknown_entity',
          ipAddress: '103.22.11.5',
          status: LoginStatus.SUSPICIOUS,
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          location: { city: 'Seoul', country: 'South Korea' },
          device: { browser: 'Chrome', os: 'Linux', type: 'desktop' }
        }
      ]);
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

      {/* Security Stat Cards */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SecurityIcon color="primary" /> Security Oversight
        </Typography>
        <SecurityStatCards stats={securityStats} loading={loading} />
      </Box>

      <Grid container spacing={4}>
        {/* Recent Security Logs */}
        <Grid item xs={12} lg={8}>
          <PageSection 
            title="Real-time Security Audit" 
            subtitle="Live monitoring of authentication attempts across the network"
            actions={
              <Button size="small" endIcon={<ArrowRightIcon />} sx={{ fontWeight: 700 }}>
                View All Logs
              </Button>
            }
          >
            <RecentLoginsList logs={securityLogs} loading={loading} />
          </PageSection>
        </Grid>

        {/* Platforms & Activity */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={4}>
            {/* Quick Actions (Moved/Refined) */}
            <PageSection 
              title="System Controls" 
              subtitle="Critical administrative actions"
            >
              <Grid container spacing={2}>
                {[
                  { icon: <StarIcon />, label: 'Featured', color: 'primary', path: '/businesses' },
                  { icon: <BusinessIcon />, label: 'Add Biz', color: 'info', path: '/businesses' },
                  { icon: <EventIcon />, label: 'Events', color: 'success', path: '/events' },
                  { icon: <SecurityIcon />, label: 'Security', color: 'warning', path: '/dashboard' },
                ].map((action) => (
                  <Grid item xs={6} key={action.label}>
                    <Box
                      onClick={() => navigate(action.path)}
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: alpha('#fff', 0.5),
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: '#fff',
                          borderColor: 'primary.main',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 20px -10px rgba(0,0,0,0.1)'
                        },
                      }}
                    >
                      <Box sx={{ color: `${action.color}.main`, mb: 1 }}>
                        {action.icon}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {action.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </PageSection>

            {/* Current Status Mini Card */}
            <Box sx={{ 
                p: 3, 
                borderRadius: 4, 
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Platform Health</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>Diagnostic monitoring active.</Typography>
                    
                    <Stack spacing={1.5}>
                        {[
                          { label: 'Cloud API', status: 'Stable', color: '#10b981' },
                          { label: 'Database', status: 'Online', color: '#10b981' },
                          { label: 'Auth Service', status: 'Active', color: '#10b981' }
                        ].map((srv) => (
                          <Stack key={srv.label} direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.7 }}>{srv.label}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: srv.color, boxShadow: `0 0 10px ${srv.color}` }} />
                                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{srv.status}</Typography>
                              </Box>
                          </Stack>
                        ))}
                    </Stack>
                </Box>
                <HistoryIcon sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: 120, opacity: 0.05 }} />
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </PageContainer>
  );
}