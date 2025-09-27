/* eslint-disable no-unused-vars */
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
  Container,
  CssBaseline,
  IconButton,
  useTheme,
  Paper, // Added Paper for elevation
  Badge, // For notifications if needed later
  Card, // Added Card for use in components like Inquiries
} from '@mui/material';
import axios from 'axios';
import React, { useState, useEffect } from 'react';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LogoutIcon from '@mui/icons-material/Logout';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import PaidIcon from '@mui/icons-material/Paid';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import Branches from './components/Branches';
import Expenses from './components/Expenses';
import Home from './components/Home';
import Inquiries from './components/Inquiries';
import Inventory from './components/Inventory';
import Login from './components/Login';
import OtherIncomes from './components/OtherIncomes';
import Sales from './components/Sales';

// --- Axios Configuration (Kept As Is) ---
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
// ------------------------------------------

const theme = createTheme({
  palette: {
    // Cleaner, more modern colors
    primary: {
      main: '#42a5f5', // Lighter, more vibrant blue
      dark: '#1565c0',
    },
    secondary: { main: '#607d8b' }, // Subtle gray-blue for secondary actions
    success: { main: '#388e3c' }, // Darker green for clarity
    error: { main: '#d32f2f' },
    warning: { main: '#fbc02d' },
    background: { default: '#f7f9fc', paper: '#ffffff' }, // Very light background
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600, color: '#333' },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          padding: '2rem 1rem', // Increased top/bottom padding
        },
      },
    },
    MuiCard: {
      defaultProps: {
        // Use a slight shadow for better separation
        elevation: 4,
      },
    },
  },
});

// Tab mapping for easier iteration and icon usage
const navTabs = [
  { label: 'Home', path: '/', component: Home, icon: DashboardIcon },
  {
    label: 'Inventory',
    path: '/inventory',
    component: Inventory,
    icon: Inventory2Icon,
  },
  { label: 'Sales', path: '/sales', component: Sales, icon: ShoppingCartIcon },
  {
    label: 'Expenses',
    path: '/expenses',
    component: Expenses,
    icon: MoneyOffIcon,
  },
  {
    label: 'Other Incomes',
    path: '/incomes',
    component: OtherIncomes,
    icon: PaidIcon,
  },
  {
    label: 'Inquiries',
    path: '/inquiries',
    component: Inquiries,
    icon: HelpOutlineIcon,
  },
  {
    label: 'Branches',
    path: '/branches',
    component: Branches,
    icon: LocationOnIcon,
  },
];

// Protected Route Component (wraps main app)
function ProtectedApp() {
  const navigate = useNavigate();
  // Set initial tab based on current path for persistence
  const initialTab = navTabs.findIndex(
    (tab) => tab.path === window.location.pathname
  );
  const [tabValue, setTabValue] = useState(initialTab === -1 ? 0 : initialTab);
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]); // State to hold actual branches

  // 1. Fetch branches on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch branch list to display name in header
    const fetchBranches = async () => {
      try {
        const res = await axios.get('/branches');
        setBranches(res.data);
      } catch (err) {
        console.error('Failed to load branches for header:', err);
      }
    };
    fetchBranches();
  }, [navigate]);

  // 2. Sync tab value with path and vice-versa
  useEffect(() => {
    // Sync tab value to URL path
    navigate(navTabs[tabValue]?.path || '/');
  }, [tabValue, navigate]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  const getBranchName = (id) => {
    const branch = branches.find((b) => b._id === id);
    return branch ? branch.name : 'All Branches';
  };

  const CurrentComponent = navTabs[tabValue]?.component;

  return (
    // FIX: Added overflowX: 'hidden' to prevent global horizontal scrolling
    <Box>
      <AppBar position='static' color='primary' elevation={1}>
        <Toolbar>
          <Typography
            variant='h6'
            component='div'
            sx={{ flexGrow: 1, fontWeight: 700 }}
          >
            Girnar Shilp Admin - {getBranchName(branchId)}
          </Typography>
          <IconButton
            color='inherit'
            onClick={handleLogout}
            sx={{ ml: 1, '&:hover': { color: theme.palette.error.light } }}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Enhanced Tab Navigation */}
      <Paper
        elevation={3}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          borderRadius: 0,
          mb: 4,
        }}
      >
        <Container maxWidth='xl' sx={{ py: 0.5 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant='scrollable'
            scrollButtons='auto'
            aria-label='business management tabs'
            textColor='primary'
            indicatorColor='primary'
          >
            {navTabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={<tab.icon />} // Use Icons for a modern look
                iconPosition='start'
              />
            ))}
          </Tabs>
        </Container>
      </Paper>

      {/* Content Area */}
      <Container maxWidth='xl' sx={{ mt: 0, minHeight: '80vh' }}>
        {CurrentComponent && (
          <CurrentComponent
            branchId={branchId}
            setBranchId={setBranchId}
            branches={branches} // Pass branches data to child components
          />
        )}
      </Container>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/*' element={<ProtectedApp />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
