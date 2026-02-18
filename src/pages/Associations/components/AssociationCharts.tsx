import React from 'react';
import { Box, Card, Grid, Typography, useTheme } from '@mui/material';
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

// Dummy data for member growth chart
const memberGrowthData = [
  { month: 'Jan', members: 1000 },
  { month: 'Feb', members: 1050 },
  { month: 'Mar', members: 1100 },
  { month: 'Apr', members: 1150 },
  { month: 'May', members: 1200 },
  { month: 'Jun', members: 1234 },
];

// Dummy data for membership status distribution
const membershipDistributionData = [
  { name: 'Active', value: 1200 },
  { name: 'Pending', value: 34 },
  { name: 'Suspended', value: 12 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const AssociationCharts: React.FC = () => {
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
            Membership Status Distribution
          </Typography>
          <Box sx={{ width: '100%', height: { xs: 200, sm: 300 } }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={membershipDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {membershipDistributionData.map((entry, index) => (
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