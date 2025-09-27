import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Box,
  IconButton,
  Alert,
  Grid,
  Typography,
} from '@mui/material';
import axios from 'axios';
import React, { useState, useEffect } from 'react';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AdapterDateFns from '@date-io/date-fns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function Expenses({ branchId, setBranchId }) {
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date(), // Default to today
    branch: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Categories for dropdown
  const categories = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Other'];

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesRes, branchesRes] = await Promise.all([
        axios.get(`/expenses/${branchId || ''}`),
        axios.get('/branches'),
      ]);
      setExpenses(expensesRes.data);
      setBranches(branchesRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load expenses.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (expense = null) => {
    setEditExpense(expense);
    setFormData(
      expense
        ? {
            ...expense,
            amount: expense.amount.toString(),
            date: new Date(expense.date),
          }
        : {
            description: '',
            amount: '',
            category: '',
            date: new Date(),
            branch: branchId || '',
          }
    );
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditExpense(null);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (newDate) => {
    setFormData({ ...formData, date: newDate });
  };

  const handleSubmit = async () => {
    if (
      !formData.description ||
      !formData.amount ||
      !formData.category ||
      !formData.branch
    ) {
      setError('Please fill all required fields.');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (amt <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    try {
      const submitData = {
        description: formData.description,
        amount: amt,
        category: formData.category,
        date: formData.date,
        branch: formData.branch,
      };

      if (editExpense) {
        await axios.put(`/expenses/${editExpense._id}`, submitData);
      } else {
        await axios.post('/expenses', submitData);
      }
      handleCloseDialog();
      fetchData();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense.');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?'))
      return;
    try {
      await axios.delete(`/expenses/${id}`);
      fetchData();
      setError('');
    } catch (err) {
      setError('Failed to delete expense.');
      console.error(err);
    }
  };

  if (loading) return <div>Loading expenses...</div>;
  if (error && !openDialog) return <Alert severity='error'>{error}</Alert>;

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Branch</InputLabel>
          <Select
            value={branchId}
            label='Branch'
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
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Expense
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table aria-label='expenses table'>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>Amount (₹)</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense._id} hover>
                <TableCell>{expense.description}</TableCell>
                <TableCell>
                  ₹{parseFloat(expense.amount).toLocaleString()}
                </TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>
                  {new Date(expense.date).toLocaleDateString()}
                </TableCell>
                <TableCell>{expense.branch?.name || 'N/A'}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleOpenDialog(expense)}
                    size='small'
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(expense._id)}
                    size='small'
                    color='error'
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align='center'>
                  No expenses found. Add one to track costs!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Expense Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {editExpense ? 'Edit Expense' : 'Add Expense'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label='Description'
                  name='description'
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label='Amount (₹)'
                  name='amount'
                  type='number'
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  inputProps={{ min: 0.01, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name='category'
                    value={formData.category}
                    onChange={handleInputChange}
                    label='Category'
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <DatePicker
                  label='Date'
                  value={formData.date}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required />
                  )}
                />
                {/* Fallback if DatePicker not installed: Uncomment below and remove DatePicker imports */}
                {/* <TextField
                  fullWidth
                  label="Date"
                  name="date"
                  type="date"
                  value={formData.date.toISOString().split('T')[0]}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{ shrink: true }}
                /> */}
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Branch</InputLabel>
                  <Select
                    name='branch'
                    value={formData.branch}
                    onChange={handleInputChange}
                    label='Branch'
                  >
                    {branches.map((b) => (
                      <MenuItem key={b._id} value={b._id}>
                        {b.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant='contained'
            disabled={
              !formData.description ||
              !formData.amount ||
              !formData.category ||
              !formData.branch
            }
          >
            {editExpense ? 'Update' : 'Add Expense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Expenses;
