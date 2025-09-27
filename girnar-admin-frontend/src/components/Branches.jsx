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
  Chip,
  Skeleton,
} from '@mui/material';
import axios from 'axios';
import React, { useState, useEffect } from 'react';

import AddIcon from '@mui/icons-material/Add';

function Branches() {
  const [branches, setBranches] = useState([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    setError('');
    try {
      // NOTE: Your backend has the branch fetching route at '/api/branches'
      const response = await axios.get('/branches');
      setBranches(response.data);
    } catch (err) {
      setError('Failed to load branches.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newBranchName.trim()) {
      setError('Branch name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      // NOTE: Your backend has the branch creation route at '/api/branches'
      await axios.post('/branches', { name: newBranchName.trim() });
      setSuccess(`Branch "${newBranchName}" added successfully!`);
      setNewBranchName('');
      fetchBranches(); // Refresh the list
    } catch (err) {
      setError(
        `Failed to add branch: ${err.response?.data?.message || err.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Loading State Render ---
  if (loading) {
    return (
      <Container maxWidth='lg'>
        <Typography variant='h4' gutterBottom>
          Branch Management
        </Typography>
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Skeleton variant='rectangular' height={50} />
        </Paper>
        <Skeleton variant='rectangular' height={300} />
      </Container>
    );
  }

  return (
    <Container maxWidth='lg' disableGutters>
      <Typography variant='h4' gutterBottom sx={{ fontWeight: 600 }}>
        Branch Management
      </Typography>

      {(error || success) && (
        <Alert severity={error ? 'error' : 'success'} sx={{ mb: 3 }}>
          {error || success}
        </Alert>
      )}

      {/* --- Add New Branch Form --- */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant='h6' gutterBottom>
          Add New Branch Location
        </Typography>
        <Box component='form' onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={2} alignItems='center'>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label='Branch Name'
                variant='outlined'
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                type='submit'
                variant='contained'
                color='primary'
                startIcon={<AddIcon />}
                fullWidth
                sx={{ height: '56px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Branch'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* --- Branches List Table --- */}
      <Typography variant='h5' gutterBottom sx={{ mt: 4, fontWeight: 600 }}>
        Existing Branches ({branches.length})
      </Typography>
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                '& th': { fontWeight: 700, bgcolor: 'background.default' },
              }}
            >
              <TableCell>Branch Name</TableCell>
              <TableCell>ID</TableCell>
              <TableCell align='right'>Actions</TableCell>{' '}
              {/* Placeholder for Edit/Delete */}
            </TableRow>
          </TableHead>
          <TableBody>
            {branches.map((branch) => (
              <TableRow key={branch._id} hover>
                <TableCell component='th' scope='row' sx={{ fontWeight: 500 }}>
                  {branch.name}
                </TableCell>
                <TableCell>
                  <Chip label={branch._id} size='small' />
                </TableCell>
                <TableCell align='right'>
                  {/* Action buttons (e.g., Edit, Delete) can go here */}
                  <Button size='small' color='secondary' disabled>
                    (Manage)
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {branches.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align='center'>
                  No branches found. Add one above!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default Branches;
