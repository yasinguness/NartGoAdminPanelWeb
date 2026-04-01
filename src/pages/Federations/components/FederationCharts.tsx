import React, { useState, useEffect } from 'react';
import { Box, Card, Grid, Typography, useTheme, Skeleton } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { federationService } from '../../../services/federation/federationService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface FederationChartsProps {
  federationId?: string;
}

export const FederationCharts: React.FC<FederationChartsProps> = ({ federationId }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!federationId) { setLoading(false); return; }
    (async () => {
      try {
        const data = await federationService.getFederationStatistics(federationId);
        setStats(data);
      } catch { /* silently handle */ }
      setLoading(false);
    })();
  }, [federationId]);

  const memberGrowthData = stats?.memberGrowth || [
    { month: 'Oca', members: stats?.totalMembers || 0 },
  ];
  const associationDistributionData = [
    { name: 'Aktif', value: stats?.activeAssociations || 0 },
    { name: 'Beklemede', value: stats?.pendingAssociations || 0 },
    { name: 'Askıda', value: stats?.suspendedAssociations || 0 },
  ].filter(d => d.value > 0);
  const theme = useTheme();

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={8}>
        <Card sx={{ borderRadius: 2, boxShadow: 1, p: { xs: 1, sm: 2 } }}>
          <Typography variant="h6" gutterBottom fontWeight="medium">
            Member Growth Trend
          </Typography>
          <Box sx={{ width: '100%', height: { xs: 200, sm: 300 } }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={memberGrowthData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="members" 
                  stroke={theme.palette.primary.main} 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ borderRadius: 2, boxShadow: 1, p: { xs: 1, sm: 2 } }}>
          <Typography variant="h6" gutterBottom fontWeight="medium">
            Association Distribution
          </Typography>
          <Box sx={{ width: '100%', height: { xs: 200, sm: 300 } }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={associationDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {associationDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
}; 