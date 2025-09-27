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
} from '@mui/material';
import axios from 'axios';
import React, { useState, useEffect } from 'react';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function Sales({ branchId, setBranchId }) {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    customerName: '',
    customerNumber: '',
    branch: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes, branchesRes] = await Promise.all([
        axios.get(`/sales/${branchId || ''}`),
        axios.get(`/products/${branchId || ''}`),
        axios.get('/branches'),
      ]);
      setSales(salesRes.data);
      setProducts(productsRes.data);
      setBranches(branchesRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load sales.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (sale = null) => {
    setEditSale(sale); // Fixed typo: was setEditDialog
    setFormData(
      sale
        ? { ...sale, quantity: sale.quantity.toString() }
        : {
            productId: '',
            quantity: '',
            customerName: '',
            customerNumber: '',
            branch: branchId || '',
          }
    );
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditSale(null);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    if (
      !formData.productId ||
      !formData.quantity ||
      !formData.customerName ||
      !formData.branch
    ) {
      setError('Please fill all required fields.');
      return;
    }
    const qty = parseInt(formData.quantity);
    if (qty <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    // Check stock availability
    try {
      const product = products.find((p) => p._id === formData.productId);
      if (product && qty > product.quantity) {
        setError(`Insufficient stock. Available: ${product.quantity}`);
        return;
      }

      const submitData = {
        productId: formData.productId,
        quantity: qty,
        customerName: formData.customerName,
        customerNumber: formData.customerNumber,
        branch: formData.branch,
      };

      if (editSale) {
        // For edit: Update sale (stock adjustment would need backend logic to reverse/add difference)
        await axios.put(`/sales/${editSale._id}`, submitData);
      } else {
        await axios.post('/sales', submitData);
      }
      handleCloseDialog();
      fetchData(); // Refetch to update sales and stock
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save sale.');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm('Are you sure? Deleting a sale will not restore stock.')
    )
      return;
    try {
      await axios.delete(`/sales/${id}`);
      fetchData();
      setError('');
    } catch (err) {
      setError('Failed to delete sale.');
      console.error(err);
    }
  };

  if (loading) return <div>Loading sales...</div>;
  if (error && !openDialog) return <Alert severity='error'>{error}</Alert>; // Show error only outside dialog

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
          Add Sale
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table aria-label='sales table'>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Amount (₹)</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale._id} hover>
                <TableCell>{sale.product?.name || 'Unknown'}</TableCell>
                <TableCell>{sale.quantity}</TableCell>
                <TableCell>{sale.amount?.toLocaleString() || 'N/A'}</TableCell>
                <TableCell>{sale.customerName}</TableCell>
                <TableCell>{sale.customerNumber}</TableCell>
                <TableCell>
                  {new Date(sale.date).toLocaleDateString()}
                </TableCell>
                <TableCell>{sale.branch?.name || 'N/A'}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleOpenDialog(sale)}
                    size='small'
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(sale._id)}
                    size='small'
                    color='error'
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align='center'>
                  No sales found. Add one to get started!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Sale Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editSale ? 'Edit Sale' : 'Add Sale'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Product</InputLabel>
                <Select
                  name='productId'
                  value={formData.productId}
                  onChange={handleInputChange}
                  label='Product'
                >
                  <MenuItem value=''>Select Product</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.name} (Stock: {p.quantity})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label='Quantity'
                name='quantity'
                type='number'
                value={formData.quantity}
                onChange={handleInputChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label='Customer Name'
                name='customerName'
                value={formData.customerName}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label='Customer Phone'
                name='customerNumber'
                value={formData.customerNumber}
                onChange={handleInputChange}
                required
              />
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant='contained'
            disabled={
              !formData.productId ||
              !formData.quantity ||
              !formData.customerName
            }
          >
            {editSale ? 'Update' : 'Add Sale'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Sales;
