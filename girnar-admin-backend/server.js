const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // Serve images

// --- Multer for image uploads ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

// --- MongoDB Connection ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

// --- Models ---
const userSchema = new mongoose.Schema({ username: String, password: String });
// Note: Mongoose automatically pluralizes and lowercases the collection name,
// so 'User ' might be better as 'User' to get 'users' collection.
const User = mongoose.model('User', userSchema);

const branchSchema = new mongoose.Schema({ name: String });
const Branch = mongoose.model('Branch', branchSchema);

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  quantity: { type: Number, default: 0 },
  price: Number,
  image: String, // Path to image, e.g., '/uploads/123.jpg'
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
});
const Product = mongoose.model('Product', productSchema);

const saleSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
  customerName: String,
  customerNumber: String,
  date: { type: Date, default: Date.now },
  amount: Number,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
});
const Sale = mongoose.model('Sale', saleSchema);

const expenseSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  category: String, // e.g., 'Rent', 'Utilities', 'Salaries'
  date: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
});
const Expense = mongoose.model('Expense', expenseSchema);

const otherIncomeSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  date: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
});
const OtherIncome = mongoose.model('OtherIncome', otherIncomeSchema);

const inquirySchema = new mongoose.Schema({
  customerName: String,
  customerNumber: String,
  productWanted: String,
  date: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
});
const Inquiry = mongoose.model('Inquiry', inquirySchema);

// --- Auth Middleware ---
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// --- Reusable Function for GET Requests (to fix PathError) ---
// This function handles both /api/items and /api/items/:branchId
const getItems =
  (Model, populateFields, sort = {}) =>
  async (req, res) => {
    // Check both params (for /:branchId) and query (optional /?branchId=...)
    const { branchId } = req.params;
    const query = branchId ? { branch: branchId } : {};

    try {
      const items = await Model.find(query).populate(populateFields).sort(sort);
      res.json(items);
    } catch (err) {
      res
        .status(500)
        .json({ message: 'Server error retrieving items', error: err.message });
    }
  };

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    // Use .compare() for async comparison (more common)
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Branches Routes ---
app.get('/api/branches', authenticate, getItems(Branch, ''));
app.post('/api/branches', authenticate, async (req, res) => {
  try {
    const branch = new Branch({ name: req.body.name });
    await branch.save();
    res.json(branch);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating branch' });
  }
});

// --- Products Routes (FIXED: Split into two routes) ---
// 1. Get ALL products (or use query params for filtering)
app.get('/api/products', authenticate, getItems(Product, 'branch'));
// 2. Get products by specific branchId
app.get('/api/products/:branchId', authenticate, getItems(Product, 'branch'));

app.post(
  '/api/products',
  authenticate,
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, description, quantity, price, branch } = req.body;
      const image = req.file ? `/uploads/${req.file.filename}` : '';
      const product = new Product({
        name,
        description,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        image,
        branch,
      });
      await product.save();
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: 'Server error creating product' });
    }
  }
);
app.put(
  '/api/products/:id',
  authenticate,
  upload.single('image'),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product)
        return res.status(404).json({ message: 'Product not found' });

      // Handle updates, ensuring only fields in req.body are updated
      const updateData = { ...req.body };
      updateData.quantity = updateData.quantity
        ? parseInt(updateData.quantity)
        : product.quantity;
      updateData.price = updateData.price
        ? parseFloat(updateData.price)
        : product.price;

      Object.assign(product, updateData);
      if (req.file) product.image = `/uploads/${req.file.filename}`;

      await product.save();
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: 'Server error updating product' });
    }
  }
);

// --- Sales Routes (FIXED: Split into two routes) ---
app.get('/api/sales', authenticate, getItems(Sale, 'product branch'));
app.get('/api/sales/:branchId', authenticate, getItems(Sale, 'product branch'));

app.post('/api/sales', authenticate, async (req, res) => {
  const { productId, quantity, customerName, customerNumber, branch } =
    req.body;

  const qty = parseInt(quantity);

  try {
    const product = await Product.findById(productId);
    if (!product || product.quantity < qty) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    product.quantity -= qty;
    await product.save();

    const sale = new Sale({
      product: productId,
      quantity: qty,
      customerName,
      customerNumber,
      amount: qty * product.price,
      branch,
    });
    await sale.save();
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: 'Server error processing sale' });
  }
});

// --- Expenses Routes (FIXED: Split into two routes) ---
app.get(
  '/api/expenses',
  authenticate,
  getItems(Expense, 'branch', { date: -1 })
);
app.get(
  '/api/expenses/:branchId',
  authenticate,
  getItems(Expense, 'branch', { date: -1 })
);
app.post('/api/expenses', authenticate, async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating expense' });
  }
});

// --- Other Incomes Routes (FIXED: Split into two routes) ---
app.get(
  '/api/other-incomes',
  authenticate,
  getItems(OtherIncome, 'branch', { date: -1 })
);
app.get(
  '/api/other-incomes/:branchId',
  authenticate,
  getItems(OtherIncome, 'branch', { date: -1 })
);
app.post('/api/other-incomes', authenticate, async (req, res) => {
  try {
    const income = new OtherIncome(req.body);
    await income.save();
    res.json(income);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating income' });
  }
});

// --- Inquiries Routes (FIXED: Split into two routes) ---
app.get(
  '/api/inquiries',
  authenticate,
  getItems(Inquiry, 'branch', { date: -1 })
);
app.get(
  '/api/inquiries/:branchId',
  authenticate,
  getItems(Inquiry, 'branch', { date: -1 })
);
app.post('/api/inquiries', authenticate, async (req, res) => {
  try {
    const inquiry = new Inquiry(req.body);
    await inquiry.save();
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating inquiry' });
  }
});

// --- Enhanced Reports Route (FIXED: Split into two routes) ---
const getReports = async (req, res) => {
  const { branchId } = req.params;
  const query = branchId
    ? { branch: new mongoose.Types.ObjectId(branchId) }
    : {}; // Convert to ObjectId for aggregation

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Sales Aggregations
    const monthlySales = await Sale.aggregate([
      { $match: { ...query, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const yearlySales = await Sale.aggregate([
      { $match: { ...query, date: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Most Selling Product (by revenue, this year)
    const topProduct = await Sale.aggregate([
      { $match: { ...query, date: { $gte: yearStart } } },
      {
        $group: {
          _id: '$product',
          totalRevenue: { $sum: '$amount' },
          totalQty: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 1 },
      {
        $project: {
          productName: { $arrayElemAt: ['$product.name', 0] },
          totalRevenue: 1,
          totalQty: 1,
        },
      },
    ]);

    // Most Selling Month (yearly sales by month)
    const monthlyBreakdown = await Sale.aggregate([
      { $match: { ...query, date: { $gte: yearStart } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.month' },
              '/',
              { $toString: '$_id.year' },
            ],
          },
          total: 1,
        },
      },
    ]);

    // Expenses
    const monthlyExpenses = await Expense.aggregate([
      { $match: { ...query, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const yearlyExpenses = await Expense.aggregate([
      { $match: { ...query, date: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Other Incomes (add to total income)
    const monthlyOtherIncome = await OtherIncome.aggregate([
      { $match: { ...query, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalMonthlyIncome =
      (monthlySales[0]?.total || 0) + (monthlyOtherIncome[0]?.total || 0);

    // Inventory
    const inventory = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
          lowStock: { $sum: { $cond: [{ $lt: ['$quantity', 10] }, 1, 0] } },
        },
      },
    ]);

    const totalInquiries = await Inquiry.countDocuments(query);

    res.json({
      monthlySales: monthlySales[0]?.total || 0,
      yearlySales: yearlySales[0]?.total || 0,
      monthlyExpenses: monthlyExpenses[0]?.total || 0,
      yearlyExpenses: yearlyExpenses[0]?.total || 0,
      monthlyProfit: totalMonthlyIncome - (monthlyExpenses[0]?.total || 0),
      yearlyProfit:
        (yearlySales[0]?.total || 0) - (yearlyExpenses[0]?.total || 0),
      topProduct: topProduct[0] || {
        productName: 'None',
        totalRevenue: 0,
        totalQty: 0,
      },
      topMonths: monthlyBreakdown,
      inventory: inventory[0] || {
        totalProducts: 0,
        totalValue: 0,
        lowStock: 0,
      },
      totalInquiries,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Server error generating report', error: err.message });
  }
};

app.get('/api/reports', authenticate, getReports);
app.get('/api/reports/:branchId', authenticate, getReports);

// --- Default Admin Creation ---
async function createDefaultAdmin() {
  // Check if admin exists first
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (existingAdmin) return;

  // Only create if admin doesn't exist
  const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'password', 10); // Hash with salt
  await User.create({ username: 'admin', password: hashed });
  console.log(
    'Default admin created (username: admin, password: password, unless specified in .env)'
  );
}

// Wait for connection before creating admin
mongoose.connection.once('open', createDefaultAdmin);

// --- Server Startup ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
