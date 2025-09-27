import {
  Container,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Alert,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card, // <-- CRITICAL FIX: Card was missing from imports
} from '@mui/material';
import axios from 'axios';
import React, { useState, useEffect } from 'react';

import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';

// Utility function to format date
const formatDate = (dateString) => {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Assuming these props are passed down from a parent wrapper for consistency
function Inquiries({ branchId, setBranchId, branches }) {
  const [inquiries, setInquiries] = useState([]);
  const [newInquiry, setNewInquiry] = useState({
    customerName: '',
    customerNumber: '',
    productWanted: '',
    branch: branchId || '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync the form's branch field when the global branchId changes
  useEffect(() => {
    setNewInquiry((prev) => ({
      ...prev,
      branch: branchId || (branches.length > 0 ? branches[0]._id : ''),
    }));
  }, [branchId, branches]);

  // Fetch inquiries whenever branchId changes
  useEffect(() => {
    fetchInquiries();
  }, [branchId]);

  const fetchInquiries = async () => {
    setLoading(true);
    setError('');
    try {
      // Endpoint dynamically adjusts based on branchId presence
      const url = branchId ? `/inquiries/${branchId}` : '/inquiries';
      const response = await axios.get(url);
      setInquiries(response.data);
    } catch (err) {
      setError('Failed to load inquiries. Check server connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    setNewInquiry({ ...newInquiry, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (
      !newInquiry.customerName ||
      !newInquiry.productWanted ||
      !newInquiry.branch
    ) {
      setError(
        'Please fill out all required fields (Name, Product, and Branch).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/inquiries', newInquiry);
      setSuccess(
        `Inquiry for "${newInquiry.productWanted}" recorded successfully!`
      );
      // Clear form and set branch back to default selected branch or global branchId
      setNewInquiry({
        customerName: '',
        customerNumber: '',
        productWanted: '',
        branch: branchId || (branches.length > 0 ? branches[0]._id : ''),
      });
      fetchInquiries(); // Refresh the list
    } catch (err) {
      setError(
        `Failed to add inquiry: ${err.response?.data?.message || err.message}`
      );
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccess(''), 5000); // Clear success message after 5 seconds
    }
  };

  // --- Loading State Render ---
  if (loading) {
    return (
      <Container maxWidth='lg' disableGutters>
        <Typography variant='h4' gutterBottom sx={{ fontWeight: 600 }}>
          Inquiry Management
        </Typography>
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Skeleton variant='rectangular' height={150} />
        </Paper>
        <Skeleton variant='rectangular' height={400} />
      </Container>
    );
  }

  return (
    <Container maxWidth='lg' disableGutters>
      <Typography variant='h4' gutterBottom sx={{ fontWeight: 700 }}>
        Customer Inquiry Management
      </Typography>

      {(error || success) && (
        <Alert severity={error ? 'error' : 'success'} sx={{ mb: 3 }}>
          {error || success}
        </Alert>
      )}

      {/* --- Global Branch Filter (if props are available) --- */}
      {branches && setBranchId && (
        <Card elevation={1} sx={{ mb: 4, p: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Filter Inquiries by Branch</InputLabel>
            <Select
              value={branchId}
              label='Filter Inquiries by Branch'
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
      )}

      {/* --- Add New Inquiry Form --- */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography
          variant='h6'
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <AddIcon sx={{ mr: 1, color: 'primary.main' }} /> Record New Inquiry
        </Typography>
        <Box component='form' onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {/* Removed 'item' prop to resolve deprecation warning */}
            <Grid xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label='Customer Name'
                variant='outlined'
                name='customerName'
                value={newInquiry.customerName}
                onChange={handleFormChange}
                required
              />
            </Grid>
            {/* Removed 'item' prop to resolve deprecation warning */}
            <Grid xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label='Customer Phone'
                variant='outlined'
                name='customerNumber'
                value={newInquiry.customerNumber}
                onChange={handleFormChange}
                type='tel'
              />
            </Grid>
            {/* Removed 'item' prop to resolve deprecation warning */}
            <Grid xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label='Product Wanted/Details'
                variant='outlined'
                name='productWanted'
                value={newInquiry.productWanted}
                onChange={handleFormChange}
                required
              />
            </Grid>
            {/* Removed 'item' prop to resolve deprecation warning */}
            <Grid xs={12} sm={6} md={3}>
              <FormControl fullWidth required>
                <InputLabel id='branch-select-label'>Branch</InputLabel>
                <Select
                  labelId='branch-select-label'
                  label='Branch'
                  name='branch'
                  value={newInquiry.branch}
                  onChange={handleFormChange}
                  disabled={branches.length === 0}
                >
                  {branches.map((b) => (
                    <MenuItem key={b._id} value={b._id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Removed 'item' prop to resolve deprecation warning */}
            <Grid xs={12}>
              <Button
                type='submit'
                variant='contained'
                color='primary'
                startIcon={<ListAltIcon />}
                disabled={isSubmitting || branches.length === 0}
              >
                {isSubmitting ? 'Recording...' : 'Save Inquiry'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* --- Inquiries List Table --- */}
      <Typography variant='h5' gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
        Pending Inquiries ({inquiries.length})
      </Typography>
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  fontWeight: 700,
                  bgcolor: 'primary.light',
                  color: 'white',
                },
              }}
            >
              <TableCell>Date</TableCell>
              <TableCell>Customer Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Product Desired</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell align='right'>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inquiries.length > 0 ? (
              inquiries.map((inq) => (
                <TableRow key={inq._id} hover>
                  <TableCell>{formatDate(inq.date)}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {inq.customerName}
                  </TableCell>
                  <TableCell>{inq.customerNumber || 'N/A'}</TableCell>
                  <TableCell>{inq.productWanted}</TableCell>
                  <TableCell>
                    {/* The backend populates 'branch', so we display the name */}
                    <Chip
                      label={inq.branch ? inq.branch.name : 'Unknown Branch'}
                      size='small'
                      color='default'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <Chip
                      label='Pending Follow-up'
                      color='warning'
                      size='small'
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align='center'>
                  No inquiries found for this selection.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default Inquiries;
