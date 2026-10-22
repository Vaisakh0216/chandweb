require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Indent = require('../models/Indent');
const Procurement = require('../models/Procurement');
const GoodsReceipt = require('../models/GoodsReceipt');
const { calculatePrices } = require('../utils/priceCalculator');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB for seeding');
};

const seed = async () => {
  await connectDB();

  // Clear existing data
  await Promise.all([
    User.deleteMany(),
    Vendor.deleteMany(),
    Product.deleteMany(),
    Indent.deleteMany(),
    Procurement.deleteMany(),
    GoodsReceipt.deleteMany(),
  ]);
  console.log('🗑️  Cleared existing data');

  // ── Users ──────────────────────────────────────────────────────────────────
  const userDefs = [
    { name: 'Admin', email: 'admin@chandweb.com', password: 'Admin@123', role: 'admin' },
    { name: 'Mathangi', email: 'mathangi@chandweb.com', password: 'Admin@123', role: 'manager' },
    { name: 'Abdul', email: 'abdul@chandweb.com', password: 'Admin@123', role: 'manager' },
    { name: 'Diya Sathee', email: 'diya@chandweb.com', password: 'Admin@123', role: 'viewer' },
  ];
  const users = [];
  for (const def of userDefs) {
    const u = new User(def);
    await u.save();
    users.push(u);
  }
  console.log('👤 Created users');

  // ── Vendors ─────────────────────────────────────────────────────────────────
  const vendorData = [
    { name: 'R K Polymer', contactPerson: 'Rajesh Kumar', phone: '9876543210', email: 'rk@rkpolymer.com', address: 'Mumbai, Maharashtra', notes: 'Reliable supplier for polymers' },
    { name: 'NANDINI SALES CORPORATION', contactPerson: 'Nandini Sharma', phone: '9845123456', email: 'sales@nandinisales.com', address: 'Bangalore, Karnataka', notes: 'Packaging materials supplier' },
    { name: 'ATULYA CHEMICALS', contactPerson: 'Atul Verma', phone: '9812345678', email: 'info@atulyachem.com', address: 'Pune, Maharashtra', notes: 'Chemical raw materials' },
    { name: 'YUCCA ENTERPRISES', contactPerson: 'Yusuf Khan', phone: '9823456789', email: 'yucca@enterprises.com', address: 'Delhi, NCR', notes: 'Specialty chemicals' },
    { name: 'Ases Chemical Works', contactPerson: 'Asef Shaikh', phone: '9834567890', email: 'ases@chemworks.com', address: 'Mumbai, Maharashtra', notes: 'General chemicals' },
    { name: 'Sri Devi Chemicals', contactPerson: 'Srividya', phone: '9756432100', email: 'sridevi@chemicals.com', address: 'Chennai, Tamil Nadu', notes: 'Sodium compounds supplier' },
    { name: 'Sunshine Care Ingredients', contactPerson: 'Sunita Rao', phone: '9867321000', email: 'info@sunshinecare.com', address: 'Hyderabad, Telangana', notes: 'Cosmetic ingredients' },
    { name: 'Advika Enterprises', contactPerson: 'Advik Mehta', phone: '9823001234', email: 'advika@enterprises.com', address: 'Ahmedabad, Gujarat', notes: 'Solvents and alcohols' },
    { name: 'Evolutemix', contactPerson: 'Evol Team', phone: '9800123456', email: 'sales@evolutemix.com', address: 'Mumbai, Maharashtra', notes: '' },
    { name: 'Smart Hygiene Solutions', contactPerson: 'Smart Team', phone: '9812300000', email: 'info@smarthygiene.com', address: 'Bangalore, Karnataka', notes: 'Hygiene and care products' },
    { name: 'Robertet', contactPerson: 'Raveena Pankare', phone: '9845000123', email: 'raveena.pankare@robertet.com', address: 'France / Mumbai Office', notes: 'Premium fragrance supplier' },
    { name: 'Aethon International', contactPerson: 'Aethon Sales', phone: '9812312345', email: 'info@aethon-international.com', address: 'International', notes: 'Sweet Basil Oil supplier' },
  ];

  const vendors = await Vendor.insertMany(vendorData.map(v => ({ ...v, isActive: true })));
  const vendorMap = {};
  vendors.forEach(v => { vendorMap[v.name] = v; });
  console.log('🏢 Created vendors');

  // ── Products ────────────────────────────────────────────────────────────────
  const productData = [
    { productCode: '14370', productName: 'Sodium Cocoyl Glycinate - GALSOFT SCG', brand: 'GALSOFT', category: 'Surfactant', defaultUnit: 'kg' },
    { productCode: '12340', productName: 'Dipotassium Glycyrrhizinate', brand: '', category: 'Active Ingredient', defaultUnit: 'grams' },
    { productCode: '14540', productName: 'Stearic Acid', brand: '', category: 'Fatty Acid', defaultUnit: 'kg' },
    { productCode: '14400', productName: 'Sodium Hydroxide', brand: '', category: 'Base', defaultUnit: 'kg' },
    { productCode: '14380', productName: 'Sodium Gluconate', brand: '', category: 'Chelating Agent', defaultUnit: 'kg' },
    { productCode: '14420', productName: 'Sodium Lactate', brand: '', category: 'Humectant', defaultUnit: 'kg' },
    { productCode: '14880', productName: 'Potassium Sorbate', brand: '', category: 'Preservative', defaultUnit: 'kg' },
    { productCode: '12949', productName: 'Iso Propyl Alcohol', brand: '', category: 'Solvent', defaultUnit: 'kg' },
    { productCode: '12100', productName: 'Sweet Basil Oil', brand: 'Aethon', category: 'Essential Oil', defaultUnit: 'kg' },
    { productCode: '13410', productName: 'Coffee Care 1 MOD-49262', brand: 'Robertet', category: 'Fragrance', defaultUnit: 'kg' },
    { productCode: '13590', productName: 'Orange Blossom & Caramel - 44611', brand: 'Robertet', category: 'Fragrance', defaultUnit: 'kg' },
    { productCode: '13740', productName: 'Peony Bloom 2 - 44466', brand: 'Robertet', category: 'Fragrance', defaultUnit: 'kg' },
    { productCode: '14723', productName: 'VANILLA WARMTH 2', brand: 'Robertet', category: 'Fragrance', defaultUnit: 'kg' },
    { productCode: '14510', productName: 'Stearamide propyl dimethyl amine', brand: 'Value Tree', category: 'Conditioner', defaultUnit: 'kg' },
    { productCode: '4522', productName: 'TONKA BEAN', brand: '', category: 'Fragrance', defaultUnit: 'nos' },
    { productCode: '4505', productName: 'Pomegranate', brand: '', category: 'Fragrance', defaultUnit: 'nos' },
    { productCode: '4516', productName: 'Walnut', brand: '', category: 'Fragrance', defaultUnit: 'nos' },
    { productCode: '4781', productName: 'Lilly of the valley', brand: '', category: 'Fragrance', defaultUnit: 'nos' },
    { productCode: '4512', productName: 'Peony', brand: '', category: 'Fragrance', defaultUnit: 'nos' },
    { productCode: 'RM-LAMSOFT', productName: 'Lamsoft PG65', brand: 'Sunshine', category: 'Conditioner', defaultUnit: 'kg' },
  ];

  const products = await Product.insertMany(productData.map(p => ({ ...p, isActive: true })));
  console.log('📦 Created products');

  // ── Goods Receipts (Historical — from "Goods Receiving Data" sheet) ─────────
  const now = new Date();
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const receiptData = [
    // R K Polymer
    {
      receivedDate: new Date('2026-07-13'), productCode: '14370', productName: 'Sodium Cocoyl Glycinate - GALSOFT SCG',
      vendor: vendorMap['R K Polymer']._id, vendorSnapshot: { name: 'R K Polymer', contactPerson: 'Rajesh Kumar', phone: '9876543210' },
      invoiceNo: '27/600020', invoiceDate: new Date('2026-07-13'),
      receivedQuantity: 50, unit: 'kg', totalPrice: 27500, currency: 'INR',
    },
    {
      receivedDate: new Date('2026-07-13'), productCode: '14370', productName: 'Sodium Cocoyl Glycinate - GALSOFT SCG',
      vendor: vendorMap['R K Polymer']._id, vendorSnapshot: { name: 'R K Polymer', contactPerson: 'Rajesh Kumar', phone: '9876543210' },
      invoiceNo: '27/600020/B', invoiceDate: new Date('2026-07-13'),
      receivedQuantity: 200, unit: 'kg', totalPrice: 108000, currency: 'INR',
    },
    // NANDINI SALES
    {
      receivedDate: new Date('2026-08-25'), productCode: '20001', productName: 'PHARMA 30 ML ROUND PET BOTTLE - CLEAR',
      vendor: vendorMap['NANDINI SALES CORPORATION']._id, vendorSnapshot: { name: 'NANDINI SALES CORPORATION', contactPerson: 'Nandini Sharma' },
      invoiceNo: 'NSC/2350/26-27', invoiceDate: new Date('2026-08-25'),
      receivedQuantity: 1344, unit: 'nos', totalPrice: 6048, currency: 'INR',
    },
    {
      receivedDate: new Date('2026-08-25'), productCode: '20002', productName: 'PLASTIC INNER-10L (25MM NECK)',
      vendor: vendorMap['NANDINI SALES CORPORATION']._id, vendorSnapshot: { name: 'NANDINI SALES CORPORATION', contactPerson: 'Nandini Sharma' },
      invoiceNo: 'NSC/2350/26-27', invoiceDate: new Date('2026-08-25'),
      receivedQuantity: 1344, unit: 'nos', totalPrice: 2688, currency: 'INR',
    },
    // ATULYA CHEMICALS
    {
      receivedDate: new Date('2026-09-07'), productCode: '14540', productName: 'Stearic Acid',
      vendor: vendorMap['ATULYA CHEMICALS']._id, vendorSnapshot: { name: 'ATULYA CHEMICALS', contactPerson: 'Atul Verma', phone: '9812345678' },
      invoiceNo: '11110', invoiceDate: new Date('2026-09-07'),
      receivedQuantity: 250, unit: 'kg', totalPrice: 13750, currency: 'INR',
    },
    // YUCCA
    {
      receivedDate: new Date('2026-09-28'), productCode: '14400', productName: 'Sodium Hydroxide',
      vendor: vendorMap['YUCCA ENTERPRISES']._id, vendorSnapshot: { name: 'YUCCA ENTERPRISES', contactPerson: 'Yusuf Khan' },
      invoiceNo: 'YE/26-27/0759', invoiceDate: new Date('2026-09-23'),
      receivedQuantity: 100, unit: 'kg', totalPrice: 4000, currency: 'INR',
    },
    // Ases Chemical Works — Sodium Gluconate
    {
      receivedDate: new Date('2026-09-08'), productCode: '14380', productName: 'Sodium Gluconate',
      vendor: vendorMap['Ases Chemical Works']._id, vendorSnapshot: { name: 'Ases Chemical Works', contactPerson: 'Asef Shaikh' },
      invoiceNo: '66213', invoiceDate: new Date('2026-08-27'),
      receivedQuantity: 10, unit: 'kg', totalPrice: 750, currency: 'INR',
    },
    {
      receivedDate: new Date('2026-09-08'), productCode: '14380', productName: 'Sodium Gluconate',
      vendor: vendorMap['Ases Chemical Works']._id, vendorSnapshot: { name: 'Ases Chemical Works', contactPerson: 'Asef Shaikh' },
      invoiceNo: '66213', invoiceDate: new Date('2026-08-27'),
      receivedQuantity: 5, unit: 'kg', totalPrice: 395, currency: 'INR',
    },
    // Sunshine
    {
      receivedDate: new Date('2026-10-16'), productCode: 'RM-LAMSOFT', productName: 'Lamsoft PG65',
      vendor: vendorMap['Sunshine Care Ingredients']._id, vendorSnapshot: { name: 'Sunshine Care Ingredients', contactPerson: 'Sunita Rao' },
      invoiceNo: 'MH/26-27/0263', invoiceDate: new Date('2026-10-01'),
      receivedQuantity: 10, unit: 'kg', totalPrice: 5200, currency: 'INR',
    },
    // Advika
    {
      receivedDate: new Date('2026-08-19'), productCode: '12949', productName: 'Iso Propyl Alcohol',
      vendor: vendorMap['Advika Enterprises']._id, vendorSnapshot: { name: 'Advika Enterprises', contactPerson: 'Advik Mehta' },
      invoiceNo: '2026-27/491', invoiceDate: new Date('2026-08-19'),
      receivedQuantity: 40, unit: 'kg', totalPrice: 1960, currency: 'INR',
    },
    // Sri Devi Chemicals
    {
      receivedDate: new Date('2026-09-30'), productCode: '14370', productName: 'Sodium Cocoyl Glycinate - GALSOFT SCG',
      vendor: vendorMap['Sri Devi Chemicals']._id, vendorSnapshot: { name: 'Sri Devi Chemicals', contactPerson: 'Srividya' },
      invoiceNo: '601/26-27', invoiceDate: new Date('2026-09-26'),
      receivedQuantity: 1, unit: 'kg', totalPrice: 600, currency: 'INR',
    },
    // YUCCA — Dipotassium
    {
      receivedDate: new Date('2026-09-24'), productCode: '12340', productName: 'Dipotassium Glycyrrhizinate',
      vendor: vendorMap['YUCCA ENTERPRISES']._id, vendorSnapshot: { name: 'YUCCA ENTERPRISES', contactPerson: 'Yusuf Khan' },
      invoiceNo: 'YE/2026', invoiceDate: new Date('2026-09-24'),
      receivedQuantity: 500, unit: 'grams', totalPrice: 4500, currency: 'INR',
    },
    // Robertet — Fragrances
    {
      receivedDate: daysAgo(45), productCode: '13410', productName: 'Coffee Care 1 MOD-49262',
      vendor: vendorMap['Robertet']._id, vendorSnapshot: { name: 'Robertet', contactPerson: 'Raveena Pankare' },
      invoiceNo: 'RBT-2026-001', invoiceDate: daysAgo(50),
      receivedQuantity: 5, unit: 'kg', totalPrice: 12500, currency: 'INR',
    },
    {
      receivedDate: daysAgo(20), productCode: '13410', productName: 'Coffee Care 1 MOD-49262',
      vendor: vendorMap['Robertet']._id, vendorSnapshot: { name: 'Robertet', contactPerson: 'Raveena Pankare' },
      invoiceNo: 'RBT-2026-045', invoiceDate: daysAgo(22),
      receivedQuantity: 5, unit: 'kg', totalPrice: 13750, currency: 'INR', // price increase
    },
    {
      receivedDate: daysAgo(60), productCode: '14540', productName: 'Stearic Acid',
      vendor: vendorMap['ATULYA CHEMICALS']._id, vendorSnapshot: { name: 'ATULYA CHEMICALS', contactPerson: 'Atul Verma' },
      invoiceNo: '10900', invoiceDate: daysAgo(62),
      receivedQuantity: 250, unit: 'kg', totalPrice: 12750, currency: 'INR', // earlier cheaper
    },
    {
      receivedDate: daysAgo(5), productCode: '14880', productName: 'Potassium Sorbate',
      vendor: vendorMap['Ases Chemical Works']._id, vendorSnapshot: { name: 'Ases Chemical Works', contactPerson: 'Asef Shaikh' },
      invoiceNo: '70118', invoiceDate: daysAgo(7),
      receivedQuantity: 25, unit: 'kg', totalPrice: 4750, currency: 'INR',
    },
    {
      receivedDate: daysAgo(90), productCode: '14880', productName: 'Potassium Sorbate',
      vendor: vendorMap['Ases Chemical Works']._id, vendorSnapshot: { name: 'Ases Chemical Works', contactPerson: 'Asef Shaikh' },
      invoiceNo: '65900', invoiceDate: daysAgo(92),
      receivedQuantity: 25, unit: 'kg', totalPrice: 4250, currency: 'INR',
    },
  ];

  // Calculate prices before inserting
  const receiptsWithPrices = receiptData.map(r => {
    const priceFields = calculatePrices(r.receivedQuantity, r.unit, r.totalPrice);
    return {
      ...r,
      ratePerUnit: priceFields.unitPrice,
      pricePerKg: priceFields.pricePerKg,
      priceCalculationType: priceFields.priceCalculationType,
      qualityStatus: 'Approved',
      createdBy: users[0]._id,
      receivedBy: users[1]._id,
      receivedByName: 'Mathangi',
    };
  });

  await GoodsReceipt.insertMany(receiptsWithPrices);
  console.log('📋 Created goods receipts');

  // ── Indents ──────────────────────────────────────────────────────────────────
  const indentData = [
    { indentDate: new Date('2026-08-27'), productName: 'Olive Oil', qtyToBeOrdered: 25, unit: 'kg', vendorName: 'Atheon', status: 'On Hold', cnsRemarks: 'Olive Oil Which Grade ? Organic or Normal ?', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-09-08'), productName: 'Emulgade Verde 10 MS', qtyToBeOrdered: null, unit: 'sample', vendorName: 'Sunshine', status: 'Received', cnsRemarks: 'Sunshine to confirm their current stock availability and expected delivery lead time', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-09-08'), productName: 'Hectorite Gel', qtyToBeOrdered: null, unit: 'sample', vendorName: 'Sunshine', status: 'Received', cnsRemarks: 'hectorite is not found due to cosmidea gel cc order from sunshine', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-09-23'), productCode: '12100', productName: 'Sweet Basil Oil', qtyToBeOrdered: 5, unit: 'kg', vendorName: 'Aethon International', status: 'Ordered', cnsRemarks: '', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-09-23'), productCode: '13410', productName: 'Coffee Care 1 MOD-49262', qtyToBeOrdered: 5, unit: 'kg', vendorName: 'Robertet', status: 'Ordered', cnsRemarks: '', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-09-23'), productCode: '13590', productName: 'Orange Blossom & Caramel - 44611', qtyToBeOrdered: 5, unit: 'kg', vendorName: 'Robertet', status: 'Ordered', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-09-23'), productCode: '13740', productName: 'Peony Bloom 2 - 44466', qtyToBeOrdered: 5, unit: 'kg', vendorName: 'Robertet', status: 'Ordered', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-09-23'), productCode: '14723', productName: 'VANILLA WARMTH 2', qtyToBeOrdered: 5, unit: 'kg', vendorName: 'Robertet', status: 'Pending', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-09-24'), productCode: '14510', productName: 'Stearamide propyl dimethyl amine', qtyToBeOrdered: 10, unit: 'kg', vendorName: 'Value Tree', status: 'Ordered', cnsRemarks: 'The order will be processed once the 50% advance(2) has been paid', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-10-01'), productName: 'Derma Bright', qtyToBeOrdered: 10, unit: 'kg', vendorName: 'Sunshine', status: 'Ordered', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-10-01'), productName: 'Hydroxy propyl methyl cellulose', qtyToBeOrdered: null, unit: 'sample', vendorName: 'BRM', status: 'Pending', assignedToName: 'Mathangi' },
    { indentDate: new Date('2026-10-05'), productName: 'Cosmidea Gel', qtyToBeOrdered: null, unit: 'sample', vendorName: 'Amazon', status: 'Ordered', cnsRemarks: 'ordered waiting for delivery', assignedToName: 'Mathangi' },
    { indentDate: daysAgo(3), productCode: '14380', productName: 'Sodium Gluconate', qtyToBeOrdered: 20, unit: 'kg', vendorName: 'Ases Chemical Works', status: 'Pending', assignedToName: 'Mathangi' },
    { indentDate: daysAgo(1), productCode: '14400', productName: 'Sodium Hydroxide', qtyToBeOrdered: 50, unit: 'kg', vendorName: 'ATULYA CHEMICALS', status: 'Pending', assignedToName: 'Abdul' },
  ];

  await Indent.insertMany(indentData.map(i => ({
    ...i,
    productCode: i.productCode || undefined,
    vendor: i.vendorName && vendorMap[i.vendorName] ? vendorMap[i.vendorName]._id : undefined,
    createdBy: users[0]._id,
    assignedTo: i.assignedToName === 'Mathangi' ? users[1]._id : users[2]._id,
  })));
  console.log('📝 Created indents');

  // ── Procurement Orders ────────────────────────────────────────────────────────
  const orderData = [
    { orderDate: new Date('2026-09-14'), productName: 'Shubhika-Herbal Tetrahydrocurcumin Extract POWDER PACK OF 100 GM', status: 'Ordered', deliveryStatus: 'Received', vendorName: 'Amazon', quantity: 1, unit: 'pieces', totalPrice: 650, currency: 'INR', orderedByName: 'Mathangi' },
    { orderDate: new Date('2026-09-17'), productName: 'Cholesterol Extra Pure', status: 'Ordered', deliveryStatus: 'Received', vendorName: 'I buy chemicals', quantity: 25, unit: 'gm', totalPrice: 1200, currency: 'INR', orderedByName: 'Mathangi' },
    { orderDate: new Date('2026-09-16'), productCode: '12340', productName: 'Dipotassium Glycyrrhizinate Phytochemical Powder', status: 'Ordered', deliveryStatus: 'Received', vendorName: 'YUCCA ENTERPRISES', quantity: 500, unit: 'grams', totalPrice: 4500, currency: 'INR', orderedByName: 'Mathangi' },
    { orderDate: new Date('2026-09-15'), productName: 'Naringenin pure, 95%', status: 'Ordered', deliveryStatus: 'Received', vendorName: 'YUCCA ENTERPRISES', quantity: 500, unit: 'grams', totalPrice: 3000, currency: 'INR', orderedByName: 'Mathangi' },
    { orderDate: new Date('2026-09-17'), productName: 'Hectorite Gel', status: 'Ordered', deliveryStatus: 'Awaiting', vendorName: 'Sunshine Care Ingredients', quantity: null, unit: 'sample', vendorResponse: 'Raise a mail / T T C', orderedByName: 'Mathangi' },
    { orderDate: new Date('2026-09-18'), productName: 'Emulgade Verde 10 MS', status: 'Ordered', deliveryStatus: 'Received', vendorName: 'Sunshine Care Ingredients', quantity: null, unit: 'sample', orderedByName: 'Mathangi' },
    { orderDate: new Date('2026-09-22'), productName: 'sodium cocoyl isethionate (SCI)', status: 'Ordered', deliveryStatus: 'Received', vendorName: 'ATULYA CHEMICALS', quantity: 300, unit: 'kg', totalPrice: 51000, currency: 'INR', vendorResponse: 'NO response', orderedByName: 'Mathangi' },
    { orderDate: new Date('2026-09-23'), productName: 'SODIUM LAURYL SARCOSINATE', status: 'Ordered', deliveryStatus: 'Received', vendorName: 'Evolutemix', quantity: null, unit: 'sample', vendorResponse: 'Send message in WhatsApp app', orderedByName: 'Mathangi' },
    { orderDate: daysAgo(15), productCode: '12100', productName: 'Sweet Basil Oil', status: 'Ordered', deliveryStatus: 'Awaiting', vendor: vendorMap['Aethon International']._id, vendorName: 'Aethon International', quantity: 5, unit: 'kg', totalPrice: 22000, currency: 'INR', orderedByName: 'Mathangi' },
    { orderDate: daysAgo(12), productCode: '13590', productName: 'Orange Blossom & Caramel - 44611', status: 'Ordered', deliveryStatus: 'Awaiting', vendor: vendorMap['Robertet']._id, vendorName: 'Robertet', quantity: 5, unit: 'kg', totalPrice: 13500, currency: 'INR', orderedByName: 'Mathangi' },
    { orderDate: daysAgo(10), productCode: '14540', productName: 'Stearic Acid', status: 'Pending', deliveryStatus: 'Awaiting', vendor: vendorMap['ATULYA CHEMICALS']._id, vendorName: 'ATULYA CHEMICALS', quantity: 500, unit: 'kg', totalPrice: 28000, currency: 'INR', orderedByName: 'Abdul' },
    { orderDate: daysAgo(7), productCode: '14400', productName: 'Sodium Hydroxide', status: 'Ordered', deliveryStatus: 'In Transit', vendor: vendorMap['YUCCA ENTERPRISES']._id, vendorName: 'YUCCA ENTERPRISES', quantity: 200, unit: 'kg', totalPrice: 8000, currency: 'INR', orderedByName: 'Abdul' },
    { orderDate: daysAgo(3), productCode: '14370', productName: 'Sodium Cocoyl Glycinate - GALSOFT SCG', status: 'Ordered', deliveryStatus: 'Awaiting', vendor: vendorMap['R K Polymer']._id, vendorName: 'R K Polymer', quantity: 100, unit: 'kg', totalPrice: 56000, currency: 'INR', orderedByName: 'Mathangi' },
  ];

  for (const order of orderData) {
    const vendorId = order.vendor || (order.vendorName && vendorMap[order.vendorName] ? vendorMap[order.vendorName]._id : undefined);
    const vendorDoc = vendorId ? vendors.find(v => String(v._id) === String(vendorId)) : null;

    const vendorSnapshot = vendorDoc ? {
      name: vendorDoc.name, contactPerson: vendorDoc.contactPerson,
      phone: vendorDoc.phone, email: vendorDoc.email,
    } : { name: order.vendorName || '' };

    const priceFields = order.totalPrice
      ? calculatePrices(order.quantity, order.unit, order.totalPrice)
      : { pricePerKg: null, unitPrice: null, priceCalculationType: 'not_applicable' };

    await Procurement.create({
      ...order,
      vendor: vendorId || undefined,
      vendorSnapshot,
      ...priceFields,
      orderedBy: order.orderedByName === 'Mathangi' ? users[1]._id : users[2]._id,
      createdBy: users[0]._id,
    });
  }
  console.log('🛒 Created procurement orders');

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────');
  console.log('👤 Login credentials:');
  console.log('   admin@chandweb.com    / Admin@123  (admin)');
  console.log('   mathangi@chandweb.com / Admin@123  (manager)');
  console.log('   abdul@chandweb.com    / Admin@123  (manager)');
  console.log('   diya@chandweb.com     / Admin@123  (viewer)');
  console.log('─────────────────────────────');

  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
