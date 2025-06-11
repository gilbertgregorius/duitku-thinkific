import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useQuery } from 'react-query';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    'orders',
    () => api.get('/orders').then(res => res.data),
    { refetchInterval: 60000 }
  );

  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery(
    'enrollments',
    () => api.get('/enrollments').then(res => res.data),
    { refetchInterval: 60000 }
  );

  useEffect(() => {
    if (ordersData && enrollmentsData) {
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.amount || 0), 0);
      const conversionRate = ordersData.length > 0 ? (enrollmentsData.length / ordersData.length) * 100 : 0;
      
      setStats({
        totalOrders: ordersData.length,
        totalEnrollments: enrollmentsData.length,
        totalRevenue,
        conversionRate: Math.round(conversionRate * 100) / 100,
      });
    }
  }, [ordersData, enrollmentsData]);

  const paymentStatusData = ordersData ? [
    { name: 'Completed', value: ordersData.filter(o => o.status === 'completed').length },
    { name: 'Pending', value: ordersData.filter(o => o.status === 'pending').length },
    { name: 'Failed', value: ordersData.filter(o => o.status === 'failed').length },
  ] : [];

  const recentOrdersData = ordersData?.slice(0, 7).map(order => ({
    date: new Date(order.created_at).toLocaleDateString(),
    amount: order.amount || 0,
  })) || [];

  if (ordersLoading || enrollmentsLoading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading dashboard data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Orders
              </Typography>
              <Typography variant="h4">
                {stats.totalOrders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Enrollments
              </Typography>
              <Typography variant="h4">
                {stats.totalEnrollments}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4">
                Rp {stats.totalRevenue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Conversion Rate
              </Typography>
              <Typography variant="h4">
                {stats.conversionRate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Payment Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Orders (Last 7 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recentOrdersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`Rp ${value.toLocaleString()}`, 'Amount']} />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Orders
        </Typography>
        {ordersData && ordersData.slice(0, 5).map((order) => (
          <Box key={order.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #eee' }}>
            <Box>
              <Typography variant="body1">
                Order #{order.id}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {order.user_email} - {new Date(order.created_at).toLocaleDateString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                Rp {(order.amount || 0).toLocaleString()}
              </Typography>
              <Chip 
                label={order.status} 
                color={
                  order.status === 'completed' ? 'success' : 
                  order.status === 'pending' ? 'warning' : 'error'
                }
                size="small"
              />
            </Box>
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default Dashboard;
