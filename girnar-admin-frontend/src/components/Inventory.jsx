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
  Chip,
  Alert,
  Grid,
  Typography,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import axios from 'axios';
import React, { useState, useEffect, useMemo } from 'react';

import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

// Helper Card for Inventory Summary (reused from Home component concept)
const MetricCard = ({
  title,
  value,
  unit = '',
  color,
  icon: IconComponent,
}) => (
  <Card elevation={4} sx={{ borderLeft: `5px solid ${color}`, height: '100%' }}>
    <CardContent>
      <Box display='flex' alignItems='center' justifyContent='space-between'>
        <Typography variant='subtitle2' color={color} sx={{ fontWeight: 700 }}>
          {title.toUpperCase()}
        </Typography>
        {IconComponent && <IconComponent sx={{ color: color, fontSize: 30 }} />}
      </Box>
      <Typography variant='h4' sx={{ fontWeight: 800, mt: 0.5 }}>
        {unit}
        {value.toLocaleString()}
      </Typography>
    </CardContent>
  </Card>
);

function Inventory({ branchId, setBranchId }) {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    price: '',
    branch: '',
    image: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // --- Data Fetching ---
  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [productsRes, branchesRes] = await Promise.all([
        // Ensure branchId is correctly passed as a path parameter or empty string
        axios.get(`/products/${branchId || ''}`),
        axios.get('/branches'),
      ]);
      setProducts(productsRes.data);
      setBranches(branchesRes.data);
    } catch (err) {
      setError('Failed to load inventory or branches.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Inventory Summary Calculations ---
  const inventorySummary = useMemo(() => {
    const totalProducts = products.length;
    let totalStock = 0;
    let totalValue = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      totalStock += p.quantity;
      totalValue += p.quantity * p.price;
      if (p.quantity < 10) lowStockCount++;
    });

    return { totalProducts, totalStock, totalValue, lowStockCount };
  }, [products]);

  // --- Dialog Handlers ---
  const handleOpenDialog = (product = null) => {
    setEditProduct(product);
    setFormData(
      product
        ? {
            ...product,
            quantity: product.quantity.toString(),
            price: product.price.toString(),
            // Ensure branch is either a string ID or defaulted to the current branch filter
            branch: product.branch?._id || branchId || '',
            image: null,
          }
        : {
            name: '',
            description: '',
            quantity: '',
            price: '',
            branch: branchId || (branches.length > 0 ? branches[0]._id : ''), // Default to current filter or first branch
            image: null,
          }
    );
    // Construct full image URL for preview
    setImagePreview(
      product?.image ? `http://localhost:5000${product.image}` : ''
    );
    setError(''); // Clear form errors
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditProduct(null);
    setImagePreview('');
  };

  // --- Form Handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.quantity ||
      !formData.price ||
      !formData.branch
    ) {
      setError('Please fill all required fields.');
      return;
    }

    // Simple price and quantity validation
    if (
      isNaN(parseFloat(formData.price)) ||
      parseFloat(formData.price) <= 0 ||
      isNaN(parseInt(formData.quantity)) ||
      parseInt(formData.quantity) < 0
    ) {
      setError('Price must be positive and Quantity must be zero or more.');
      return;
    }

    try {
      const submitData = new FormData();
      // Append all fields, even if not changed, for consistency
      submitData.append('name', formData.name);
      submitData.append('description', formData.description || '');
      submitData.append('quantity', formData.quantity);
      submitData.append('price', formData.price);
      submitData.append('branch', formData.branch);

      // Only append image if a new file is selected
      if (formData.image) submitData.append('image', formData.image);

      if (editProduct) {
        await axios.put(`/products/${editProduct._id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axios.post('/products', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      handleCloseDialog();
      fetchData();
    } catch (err) {
      setError(
        `Failed to save product: ${err.response?.data?.message || err.message}`
      );
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?'))
      return;
    try {
      await axios.delete(`/products/${id}`);
      fetchData();
      setError('');
    } catch (err) {
      setError('Failed to delete product.');
    }
  };

  // --- Loading/Error State Render ---
  if (loading) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Skeleton variant='rectangular' height={60} />
        </Grid>
        {Array.from({ length: 3 }).map((_, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Skeleton variant='rectangular' height={100} />
          </Grid>
        ))}
        <Grid item xs={12}>
          <Skeleton variant='rectangular' height={400} sx={{ mt: 3 }} />
        </Grid>
      </Grid>
    );
  }

  // --- Main Render ---
  return (
    <Container disableGutters>
      {error && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <MetricCard
            title='Total Stock Value'
            value={inventorySummary.totalValue}
            unit='₹'
            color='#42a5f5'
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title='Total Items'
            value={inventorySummary.totalStock}
            color='#388e3c'
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title='Low Stock Products'
            value={inventorySummary.lowStockCount}
            color={inventorySummary.lowStockCount > 0 ? '#fbc02d' : '#388e3c'}
          />
        </Grid>
      </Grid>

      {/* Filter and Action Bar */}
      <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems='center'>
          <Grid item xs={12} sm={8} md={9}>
            <FormControl fullWidth size='small'>
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
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <Button
              variant='contained'
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              fullWidth
            >
              Add New Product
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Data Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table stickyHeader>
          <TableHead>
            <TableRow
              sx={{
                '& th': { fontWeight: 700, bgcolor: 'background.default' },
              }}
            >
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align='right'>Quantity</TableCell>
              <TableCell align='right'>Price (₹)</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell align='center'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id} hover>
                <TableCell>
                  {product.image ? (
                    <img
                      src={`http://localhost:5000${product.image}`}
                      alt={product.name}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: '4px',
                      }}
                    />
                  ) : (
                    <Chip label='No Image' size='small' />
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{product.name}</TableCell>
                <TableCell
                  sx={{
                    maxWidth: 200,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {product.description || 'N/A'}
                </TableCell>
                <TableCell align='right'>
                  <Chip
                    label={product.quantity}
                    color={product.quantity < 10 ? 'warning' : 'success'}
                    variant='outlined'
                    size='small'
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align='right'>
                  ₹{product.price.toLocaleString()}
                </TableCell>
                <TableCell>{product.branch?.name || 'N/A'}</TableCell>
                <TableCell align='center'>
                  <IconButton
                    size='small'
                    onClick={() => handleOpenDialog(product)}
                  >
                    <EditIcon fontSize='small' color='primary' />
                  </IconButton>
                  <IconButton
                    size='small'
                    onClick={() => handleDelete(product._id)}
                    color='error'
                  >
                    <DeleteIcon fontSize='small' />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align='center'>
                  <Typography variant='subtitle1' sx={{ py: 2 }}>
                    No products found{' '}
                    {branchId
                      ? `for the selected branch.`
                      : `in the inventory.`}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog (Enhanced) */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth='md' // Use medium width for better form space
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', mb: 1 }}>
          {editProduct
            ? 'Edit Product: ' + editProduct.name
            : 'Add New Product'}
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity='error' sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={3}>
            {/* Left Column: Details */}
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Product Name'
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label='Description'
                    name='description'
                    value={formData.description}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label='Quantity in Stock'
                    name='quantity'
                    type='number'
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label='Unit Price (₹)'
                    name='price'
                    type='number'
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={16}>
                  <FormControl fullWidth required>
                    <InputLabel>Assign to Branch</InputLabel>
                    <Select
                      name='branch'
                      value={formData.branch}
                      onChange={handleInputChange}
                      label='Assign to Branch'
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
            </Grid>

            {/* Right Column: Image Upload */}
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  border: '2px dashed #ddd',
                  p: 3,
                  borderRadius: 2,
                  textAlign: 'center',
                  minHeight: 250,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {imagePreview ? (
                  <Box sx={{ mb: 2 }}>
                    <img
                      src={imagePreview}
                      alt='Preview'
                      style={{
                        maxWidth: '100%',
                        maxHeight: 150,
                        objectFit: 'contain',
                        borderRadius: '4px',
                      }}
                    />
                    <Typography
                      variant='caption'
                      display='block'
                      sx={{ mt: 1 }}
                    >
                      Current Image
                    </Typography>
                  </Box>
                ) : (
                  <CloudUploadIcon
                    sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }}
                  />
                )}

                <Button
                  variant='contained'
                  component='label'
                  startIcon={<CloudUploadIcon />}
                  sx={{ mt: 1 }}
                >
                  {editProduct ? 'Change Image' : 'Upload Image'}
                  <input
                    hidden
                    accept='image/*'
                    type='file'
                    onChange={handleImageChange}
                  />
                </Button>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  Max file size 5MB. JPEG/PNG only.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} color='error'>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant='contained'
            color='primary'
            startIcon={<AddIcon />}
          >
            {editProduct ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Inventory;
