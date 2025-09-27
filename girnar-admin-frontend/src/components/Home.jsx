import {
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Box,
  Skeleton, // Added for better loading state
} from '@mui/material';
import {
  BarChart,
  Bar,
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
import axios from 'axios';
import React, { useEffect, useState } from 'react';

// Enhanced Card Component for Metrics
const MetricCard = ({ title, value, unit = '₹', color, subText, subColor }) => (
  <Card elevation={6} sx={{ borderLeft: `5px solid ${color}`, height: '100%' }}>
    <CardContent>
      <Typography
        variant='subtitle2'
        color={color}
        gutterBottom
        sx={{ fontWeight: 700 }}
      >
        {title.toUpperCase()}
      </Typography>
      <Typography variant='h4' sx={{ fontWeight: 800, color: '#333' }}>
        {unit}
        {value.toLocaleString()}
      </Typography>
      {subText && (
        <Typography variant='body2' color={subColor} sx={{ mt: 1 }}>
          {subText}
        </Typography>
      )}
    </CardContent>
  </Card>
);

function Home({ branchId, setBranchId }) {
  const [reports, setReports] = useState({
    monthlySales: 0,
    yearlySales: 0,
    monthlyExpenses: 0,
    yearlyExpenses: 0,
    monthlyProfit: 0,
    yearlyProfit: 0,
    topProduct: { productName: 'None', totalRevenue: 0, totalQty: 0 },
    topMonths: [],
    inventory: { totalProducts: 0, totalValue: 0, lowStock: 0 },
    totalInquiries: 0,
  });
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [reportRes, branchRes] = await Promise.all([
          axios.get(`/reports/${branchId || ''}`),
          axios.get('/branches'),
        ]);
        setReports(reportRes.data);
        setBranches(branchRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  // Format topMonths for Recharts
  const chartData =
    reports.topMonths.length > 0
      ? reports.topMonths.map((item) => ({
          name: item.month,
          sales: item.total,
        }))
      : [{ name: 'No Data', sales: 0 }];

  // Top products for Pie chart
  const pieData =
    reports.topProduct.productName !== 'None'
      ? [
          {
            name: reports.topProduct.productName,
            value: reports.topProduct.totalRevenue,
          },
          {
            name: 'Others',
            value: reports.yearlySales - reports.topProduct.totalRevenue,
          },
        ]
      : [{ name: 'No Data', value: 0 }];

  const COLORS = ['#42a5f5', '#00c49f', '#ffbb28', '#ff8042']; // Use theme colors

  if (loading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card elevation={4}>
              <CardContent>
                <Skeleton height={100} />
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid item xs={12} md={8}>
          <Card elevation={4}>
            <CardContent>
              <Skeleton height={300} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={4}>
            <CardContent>
              <Skeleton height={300} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity='error' sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Branch Selector */}
      <Card elevation={1} sx={{ mb: 4, p: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Filter by Branch</InputLabel>
          <Select
            value={branchId}
            label='Filter by Branch'
            onChange={(e) => setBranchId(e.target.value)}
          >
            <MenuItem value=''>All Branches</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b._id} value={b._id}>
                {b.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Card>

      {/* Main Metric Cards */}
      <Grid container spacing={4}>
        {/* Sales Cards */}
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title='Monthly Sales'
            value={reports.monthlySales}
            color='#42a5f5'
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title='Yearly Sales'
            value={reports.yearlySales}
            color='#1565c0'
          />
        </Grid>

        {/* Profit Cards */}
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title='Monthly Profit'
            value={reports.monthlyProfit}
            color={reports.monthlyProfit >= 0 ? '#388e3c' : '#d32f2f'}
            subText={
              reports.monthlyProfit >= 0 ? 'Good month' : 'Needs attention'
            }
            subColor={
              reports.monthlyProfit >= 0 ? 'success.dark' : 'error.dark'
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title='Yearly Profit'
            value={reports.yearlyProfit}
            color={reports.yearlyProfit >= 0 ? '#388e3c' : '#d32f2f'}
            subText={
              reports.yearlyProfit >= 0 ? 'Tracking well' : 'Annual loss'
            }
            subColor={reports.yearlyProfit >= 0 ? 'success.dark' : 'error.dark'}
          />
        </Grid>

        {/* Inventory & Inquiry Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={4} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant='h6' color='secondary'>
                Total Inventory Value
              </Typography>
              <Typography variant='h4' sx={{ fontWeight: 700 }}>
                ₹{reports.inventory.totalValue.toLocaleString()}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Total Products: {reports.inventory.totalProducts}
              </Typography>
              <Chip
                label={`Low Stock: ${reports.inventory.lowStock}`}
                color={reports.inventory.lowStock > 0 ? 'warning' : 'success'}
                size='small'
                sx={{ mt: 1, fontWeight: 600 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={4} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant='h6' color='secondary'>
                Top Product By Revenue
              </Typography>
              <Typography variant='h5' sx={{ fontWeight: 700 }}>
                {reports.topProduct.productName}
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Revenue: ₹{reports.topProduct.totalRevenue.toLocaleString()}
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Qty Sold: {reports.topProduct.totalQty}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={4} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant='h6' color='secondary'>
                Pending Inquiries
              </Typography>
              <Typography variant='h4' color='primary' sx={{ fontWeight: 800 }}>
                {reports.totalInquiries}
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Follow up required.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={4} sx={{ mt: 4 }}>
        {/* Bar Chart: Most Selling Months */}
        <Grid item xs={12} md={8}>
          <Card elevation={4}>
            <CardContent>
              <Typography variant='h6' gutterBottom sx={{ fontWeight: 600 }}>
                Sales Trend: Most Selling Months (Revenue)
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#eee' />
                    <XAxis dataKey='name' style={{ fontSize: '12px' }} />
                    <YAxis
                      tickFormatter={(value) =>
                        `₹${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value) => [
                        `₹${value.toLocaleString()}`,
                        'Sales',
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey='sales'
                      fill='#42a5f5'
                      name='Monthly Sales'
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pie Chart: Top Products Breakdown */}
        <Grid item xs={12} md={4}>
          <Card elevation={4}>
            <CardContent>
              <Typography variant='h6' gutterBottom sx={{ fontWeight: 600 }}>
                Yearly Revenue Breakdown
              </Typography>
              <Box
                sx={{ height: 350, display: 'flex', justifyContent: 'center' }}
              >
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx='50%'
                      cy='50%'
                      innerRadius={50}
                      outerRadius={100}
                      dataKey='value'
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent > 0.05
                          ? `${name} ${(percent * 100).toFixed(0)}%`
                          : null
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `₹${value.toLocaleString()}`,
                        'Revenue',
                      ]}
                    />
                    <Legend
                      layout='vertical'
                      align='right'
                      verticalAlign='middle'
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Home;
