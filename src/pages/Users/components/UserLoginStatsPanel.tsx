import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  LinearProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useSnackbar } from 'notistack';
import { PageSection } from '../../../components/Page';
import { StatCard } from '../../../components/Data';
import { adminLoginStatsService } from '../../../services/auth/adminLoginStatsService';
import { UserLoginStatsDto } from '../../../types/security/loginStats';

interface UserLoginStatsPanelProps {
  userId: string;
}

const getDefaultRange = () => {
  const today = new Date();
  return {
    startDate: format(subDays(today, 29), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };
};

export default function UserLoginStatsPanel({ userId }: UserLoginStatsPanelProps) {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState<string>(defaultRange.startDate);
  const [endDate, setEndDate] = useState<string>(defaultRange.endDate);
  const [sourceLimit, setSourceLimit] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserLoginStatsDto | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const fetchUserStats = async (options?: { sourceLimit?: number }) => {
    if (!startDate || !endDate) {
      enqueueSnackbar('Please provide start and end date.', { variant: 'warning' });
      return;
    }

    if (startDate > endDate) {
      enqueueSnackbar('Start date cannot be greater than end date.', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await adminLoginStatsService.getUserLoginStats(userId, {
        startDate,
        endDate,
        sourceLimit: options?.sourceLimit ?? sourceLimit,
      });

      setStats(response);
    } catch (fetchError: any) {
      const message = fetchError.response?.data?.message || fetchError.message || 'Failed to fetch user login stats.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUserStats();
  }, [userId]);

  return (
    <PageSection
      title="Login Statistics"
      subtitle="User-level login behavior, source breakdown and failures"
      headerActions={
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            label="Start"
            type="date"
            size="small"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End"
            type="date"
            size="small"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="source-limit-label">Source Limit</InputLabel>
            <Select
              labelId="source-limit-label"
              value={sourceLimit}
              label="Source Limit"
              onChange={(event) => {
                const value = Number(event.target.value);
                setSourceLimit(value);
                void fetchUserStats({ sourceLimit: value });
              }}
            >
              {[5, 10, 15, 20].map((limit) => (
                <MenuItem key={limit} value={limit}>{limit}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => fetchUserStats()} disabled={loading}>
            Apply
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchUserStats()}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      }
    >
      {loading ? (
        <LinearProgress />
      ) : error ? (
        <Typography color="error" variant="body2">{error}</Typography>
      ) : !stats ? (
        <Typography color="text.secondary" variant="body2">No login data found.</Typography>
      ) : (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <StatCard title="Total Attempts" value={stats.totalAttempts} subtitle="Selected range" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Success" value={stats.successfulLogins} color="success" subtitle={`${stats.successRate.toFixed(2)}%`} />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Failed" value={stats.failedLogins} color="error" />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatCard title="Last Login IP" value={stats.lastLoginIp || '-'} color="info" />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Daily Trend</Typography>
            {stats.dailyTrend.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No daily trend in this range.</Typography>
            ) : (
              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={stats.dailyTrend} margin={{ top: 8, right: 20, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceff3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="successfulLogins" name="Success" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="failedLogins" name="Failed" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="totalAttempts" name="Total" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>IP Breakdown</Typography>
              <Stack spacing={1.25}>
                {stats.ipBreakdown.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No IP data.</Typography>
                ) : (
                  stats.ipBreakdown.map((item) => (
                    <Box key={`ip-${item.source}`} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>{item.source}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.failedAttempts}/{item.totalAttempts} failed
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Last seen: {new Date(item.lastSeenAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Device Breakdown</Typography>
              <Stack spacing={1.25}>
                {stats.deviceBreakdown.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No device data.</Typography>
                ) : (
                  stats.deviceBreakdown.map((item) => (
                    <Box key={`device-${item.source}`} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{item.source}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.failedAttempts}/{item.totalAttempts} failed
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Last seen: {new Date(item.lastSeenAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Failure Reasons</Typography>
            <Stack spacing={1.2}>
              {stats.failureReasons.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No failure reasons in selected range.</Typography>
              ) : (
                stats.failureReasons.map((reason) => (
                  <Box key={reason.reason}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{reason.reason}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {reason.count} ({reason.ratio.toFixed(2)}%)
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(reason.ratio, 100)}
                      sx={{
                        height: 7,
                        borderRadius: 8,
                        bgcolor: alpha('#ef4444', 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#ef4444',
                        },
                      }}
                    />
                  </Box>
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      )}
    </PageSection>
  );
}
