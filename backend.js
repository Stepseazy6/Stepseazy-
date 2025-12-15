// ============================================
// 📁 server.js - COMPLETE BACKEND (Single File)
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ============================================
// 📦 DATABASE TABLES CREATION (Auto-create if not exists)
// ============================================

async function initializeDatabase() {
  console.log('🔧 Initializing database...');
  
  try {
    // 1. Create customers table
    const { error: customersError } = await supabase.rpc('create_customers_table', {});
    if (customersError && !customersError.message.includes('already exists')) {
      console.log('Creating customers table...');
      await supabase.from(`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(15) UNIQUE NOT NULL,
          email VARCHAR(100),
          password VARCHAR(255),
          address TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // 2. Create products table
    const { error: productsError } = await supabase.rpc('create_products_table', {});
    if (productsError && !productsError.message.includes('already exists')) {
      console.log('Creating products table...');
      await supabase.from(`
        CREATE TABLE IF NOT EXISTS products (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category VARCHAR(50),
          stock_quantity INTEGER DEFAULT 0,
          images TEXT[],
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // 3. Create orders table
    const { error: ordersError } = await supabase.rpc('create_orders_table', {});
    if (ordersError && !ordersError.message.includes('already exists')) {
      console.log('Creating orders table...');
      await supabase.from(`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          total_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          payment_status VARCHAR(20) DEFAULT 'pending',
          payment_method VARCHAR(50),
          delivery_address TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // 4. Create order_items table
    const { error: orderItemsError } = await supabase.rpc('create_order_items_table', {});
    if (orderItemsError && !orderItemsError.message.includes('already exists')) {
      console.log('Creating order_items table...');
      await supabase.from(`
        CREATE TABLE IF NOT EXISTS order_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // 5. Create services table
    const { error: servicesError } = await supabase.rpc('create_services_table', {});
    if (servicesError && !servicesError.message.includes('already exists')) {
      console.log('Creating services table...');
      await supabase.from(`
        CREATE TABLE IF NOT EXISTS services (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          device_type VARCHAR(100),
          problem_description TEXT,
          estimated_cost DECIMAL(10,2),
          actual_cost DECIMAL(10,2),
          status VARCHAR(20) DEFAULT 'pending',
          technician_id UUID,
          completion_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // 6. Create cart table
    const { error: cartError } = await supabase.rpc('create_cart_table', {});
    if (cartError && !cartError.message.includes('already exists')) {
      console.log('Creating cart table...');
      await supabase.from(`
        CREATE TABLE IF NOT EXISTS cart (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(customer_id, product_id)
        )
      `);
    }

    // 7. Create employees table
    const { error: employeesError } = await supabase.rpc('create_employees_table', {});
    if (employeesError && !employeesError.message.includes('already exists')) {
      console.log('Creating employees table...');
      await supabase.from(`
        CREATE TABLE IF NOT EXISTS employees (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(15) UNIQUE NOT NULL,
          email VARCHAR(100),
          role VARCHAR(50) DEFAULT 'technician',
          salary DECIMAL(10,2),
          joining_date DATE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // 8. Create inventory_log table
    const { error: inventoryError } = await supabase.rpc('create_inventory_log_table', {});
    if (inventoryError && !inventoryError.message.includes('already exists')) {
      console.log('Creating inventory_log table...');
      await supabase.from(`
        CREATE TABLE IF NOT EXISTS inventory_log (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          quantity_change INTEGER NOT NULL,
          type VARCHAR(20),
          reason TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // 9. Insert sample products if empty
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productCount === 0) {
      console.log('Adding sample products...');
      const sampleProducts = [
        {
          name: 'Fast USB Charger 20W',
          description: 'Fast charging for all smartphones',
          price: 499.00,
          category: 'charger',
          stock_quantity: 50,
          images: ['https://images.unsplash.com/photo-1609592071310-3d8cde5612e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60']
        },
        {
          name: 'Premium Wireless Earphones',
          description: 'Bluetooth 5.0, 20hrs battery',
          price: 699.00,
          category: 'earphone',
          stock_quantity: 30,
          images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60']
        },
        {
          name: 'Designer Mobile Cover',
          description: 'Shockproof, all phone models',
          price: 299.00,
          category: 'cover',
          stock_quantity: 100,
          images: ['https://images.unsplash.com/photo-1556656793-08538906a9f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60']
        },
        {
          name: 'Tempered Glass Screen Guard',
          description: '9H hardness, anti-scratch',
          price: 199.00,
          category: 'screen',
          stock_quantity: 150,
          images: ['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60']
        },
        {
          name: 'Type-C Fast Charging Cable',
          description: '3A fast charging, 1.5m length',
          price: 249.00,
          category: 'cable',
          stock_quantity: 80,
          images: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60']
        }
      ];

      await supabase.from('products').insert(sampleProducts);
    }

    // 10. Create admin employee if not exists
    const { count: adminCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('phone', '9999999999');

    if (adminCount === 0) {
      console.log('Creating admin employee...');
      await supabase.from('employees').insert([{
        name: 'Admin User',
        phone: '9999999999',
        email: 'admin@steps-eazy.com',
        role: 'admin',
        salary: 50000,
        joining_date: new Date().toISOString().split('T')[0]
      }]);
    }

    console.log('✅ Database initialized successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// ============================================
// 🔐 MIDDLEWARE FUNCTIONS
// ============================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

// ============================================
// 🚀 API ROUTES START HERE
// ============================================

// 📌 1. HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Step\'sEazy API is running 🚀',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 📌 2. USER REGISTRATION
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, phone and password are required' 
      });
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this phone already exists' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const { data: user, error } = await supabase
      .from('customers')
      .insert([{
        name,
        phone,
        email: email || null,
        password: hashedPassword,
        created_at: new Date()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone, 
        name: user.name,
        role: 'customer' 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );
    
    // Remove password from response
    delete user.password;
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 📌 3. USER LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and password are required' 
      });
    }
    
    // Find user by phone
    const { data: user, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid phone or password' 
      });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid phone or password' 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone, 
        name: user.name,
        role: 'customer' 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );
    
    // Remove password from response
    delete user.password;
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 📌 4. ADMIN LOGIN
app.post('/api/admin/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // For demo, using simple check
    // In production, use proper authentication
    if (phone === '9999999999' && password === 'admin123') {
      const token = jwt.sign(
        { 
          id: 'admin-001', 
          phone: '9999999999', 
          name: 'Admin User',
          role: 'admin' 
        },
        process.env.JWT_SECRET || 'your-secret-key-change-this',
        { expiresIn: '7d' }
      );
      
      return res.json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: 'admin-001',
          name: 'Admin User',
          phone: '9999999999',
          role: 'admin'
        }
      });
    }
    
    res.status(401).json({ 
      success: false, 
      error: 'Invalid admin credentials' 
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// 📌 5. GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true);
    
    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // Pagination
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    
    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: products || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch products' 
    });
  }
});

// 📌 6. GET SINGLE PRODUCT
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }
    
    res.json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch product' 
    });
  }
});

// 📌 7. CREATE ORDER (Authenticated)
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items, total_amount, payment_method, delivery_address } = req.body;
    const customer_id = req.user.id;
    
    if (!items || !items.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order items are required' 
      });
    }
    
    // Start transaction
    // 1. Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_id,
        total_amount,
        payment_method: payment_method || 'cod',
        delivery_address,
        status: 'pending',
        payment_status: payment_method === 'cod' ? 'pending' : 'paid',
        created_at: new Date()
      }])
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // 2. Add order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity || 1,
      price: item.price
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;
    
    // 3. Update product stock
    for (const item of items) {
      await supabase
        .from('products')
        .update({ 
          stock_quantity: supabase.rpc('decrement', { 
            val: item.quantity || 1 
          }) 
        })
        .eq('id', item.product_id);
    }
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order_id: order.id,
      data: order
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create order' 
    });
  }
});

// 📌 8. GET USER ORDERS
app.get('/api/my-orders', authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price,
          products (
            name,
            images
          )
        )
      `)
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: orders || []
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch orders' 
    });
  }
});

// 📌 9. CART OPERATIONS
// Add to cart
app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const customer_id = req.user.id;
    
    if (!product_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product ID is required' 
      });
    }
    
    // Check if product exists
    const { data: product } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .eq('id', product_id)
      .single();
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }
    
    // Check if already in cart
    const { data: existingItem } = await supabase
      .from('cart')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('product_id', product_id)
      .single();
    
    let result;
    if (existingItem) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Add new item
      const { data, error } = await supabase
        .from('cart')
        .insert([{ customer_id, product_id, quantity }])
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }
    
    res.json({
      success: true,
      message: 'Item added to cart',
      data: result
    });
    
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add to cart' 
    });
  }
});

// Get cart items
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;
    
    const { data: cartItems, error } = await supabase
      .from('cart')
      .select(`
        quantity,
        products (
          id,
          name,
          price,
          images,
          stock_quantity
        )
      `)
      .eq('customer_id', customer_id);
    
    if (error) throw error;
    
    // Format response
    const formattedItems = (cartItems || []).map(item => ({
      ...item.products,
      cart_quantity: item.quantity
    }));
    
    res.json({
      success: true,
      data: formattedItems
    });
    
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch cart' 
    });
  }
});

// Remove from cart
app.delete('/api/cart/:product_id', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.params;
    const customer_id = req.user.id;
    
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('customer_id', customer_id)
      .eq('product_id', product_id);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Item removed from cart'
    });
    
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove from cart' 
    });
  }
});

// 📌 10. CREATE SERVICE REQUEST
app.post('/api/services', authenticateToken, async (req, res) => {
  try {
    const { device_type, problem_description, estimated_cost } = req.body;
    const customer_id = req.user.id;
    
    if (!device_type || !problem_description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Device type and problem description are required' 
      });
    }
    
    const { data: service, error } = await supabase
      .from('services')
      .insert([{
        customer_id,
        device_type,
        problem_description,
        estimated_cost: estimated_cost || 0,
        status: 'pending',
        created_at: new Date()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: service
    });
    
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create service request' 
    });
  }
});

// 📌 11. GET USER SERVICES
app.get('/api/my-services', authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;
    
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: services || []
    });
    
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch services' 
    });
  }
});

// ============================================
// 👑 ADMIN ROUTES (Require Admin Authentication)
// ============================================

// 📌 12. ADMIN: GET ALL ORDERS
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('orders')
      .select(`
        *,
        customers (
          name,
          phone
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Pagination
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    
    const { data: orders, error, count } = await query.range(from, to);
    
    if (error) throw error;
    
    // Get order items for each order
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select(`
            quantity,
            price,
            products (
              name
            )
          `)
          .eq('order_id', order.id);
        
        return {
          ...order,
          items: items || []
        };
      })
    );
    
    res.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch orders' 
    });
  }
});

// 📌 13. ADMIN: UPDATE ORDER STATUS
app.put('/api/admin/orders/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status is required' 
      });
    }
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
    }
    
    const { data: order, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
    
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update order status' 
    });
  }
});

// 📌 14. ADMIN: GET ALL SERVICES
app.get('/api/admin/services', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = supabase
      .from('services')
      .select(`
        *,
        customers (
          name,
          phone
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Pagination
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    
    const { data: services, error, count } = await query.range(from, to);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: services || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Admin get services error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch services' 
    });
  }
});

// 📌 15. ADMIN: UPDATE SERVICE STATUS
app.put('/api/admin/services/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actual_cost, technician_id } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status is required' 
      });
    }
    
    const updateData = {
      status,
      updated_at: new Date()
    };
    
    if (actual_cost !== undefined) {
      updateData.actual_cost = actual_cost;
    }
    
    if (technician_id) {
      updateData.technician_id = technician_id;
    }
    
    if (status === 'completed') {
      updateData.completion_date = new Date();
    }
    
    const { data: service, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Service status updated successfully',
      data: service
    });
    
  } catch (error) {
    console.error('Update service status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update service status' 
    });
  }
});

// 📌 16. ADMIN: ADD NEW PRODUCT
app.post('/api/admin/products', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, price, category, stock_quantity, images } = req.body;
    
    if (!name || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, price and category are required' 
      });
    }
    
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        name,
        description: description || '',
        price: parseFloat(price),
        category,
        stock_quantity: stock_quantity || 0,
        images: images || [],
        created_at: new Date()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: product
    });
    
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add product' 
    });
  }
});

// 📌 17. ADMIN: UPDATE PRODUCT
app.put('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
    
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update product' 
    });
  }
});

// 📌 18. ADMIN: DELETE PRODUCT
app.delete('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete product' 
    });
  }
});

// 📌 19. ADMIN: GET ANALYTICS
app.get('/api/admin/analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    
    // Today's revenue
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('total_amount, payment_status')
      .gte('created_at', startOfToday.toISOString())
      .lte('created_at', endOfToday.toISOString());
    
    const todayRevenue = (todayOrders || [])
      .filter(order => order.payment_status === 'paid')
      .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
    
    // Total revenue
    const { data: allOrders } = await supabase
      .from('orders')
      .select('total_amount, payment_status')
      .eq('payment_status', 'paid');
    
    const totalRevenue = (allOrders || [])
      .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
    
    // Counts
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    const { count: pendingServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    res.json({
      success: true,
      data: {
        today_revenue: todayRevenue,
        total_revenue: totalRevenue,
        total_orders: totalOrders || 0,
        pending_orders: pendingOrders || 0,
        total_customers: totalCustomers || 0,
        total_products: totalProducts || 0,
        pending_services: pendingServices || 0,
        date: new Date().toLocaleDateString('en-IN')
      }
    });
    
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    });
  }
});

// 📌 20. ADMIN: GET ALL CUSTOMERS
app.get('/api/admin/customers', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    
    const { data: customers, error, count } = await supabase
      .from('customers')
      .select('id, name, phone, email, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: customers || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch customers' 
    });
  }
});

// 📌 21. ADMIN: GET ORDER DETAILS
app.get('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          name,
          phone,
          email
        )
      `)
      .eq('id', id)
      .single();
    
    if (orderError) throw orderError;
    
    // Get order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        quantity,
        price,
        products (
          id,
          name,
          images
        )
      `)
      .eq('order_id', id);
    
    if (itemsError) throw itemsError;
    
    res.json({
      success: true,
      data: {
        ...order,
        items: items || []
      }
    });
    
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch order details' 
    });
  }
});

// ============================================
// 🎯 SIMPLE ROUTES FOR YOUR EXISTING WEBSITE
// ============================================

// 📌 22. CREATE QUICK ORDER (For your existing WhatsApp flow)
app.post('/api/quick-order', async (req, res) => {
  try {
    const { name, phone, service_type, phone_model, location, price } = req.body;
    
    if (!name || !phone || !service_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, phone and service type are required' 
      });
    }
    
    // Save to database
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        customer_id: null, // Not registered user
        total_amount: price || 0,
        payment_method: 'cod',
        delivery_address: location || '',
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Also save customer if not exists
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single();
    
    if (!customer) {
      await supabase
        .from('customers')
        .insert([{
          name,
          phone,
          created_at: new Date()
        }]);
    }
    
    res.json({
      success: true,
      message: 'Quick order received successfully',
      order_id: order.id,
      whatsapp_message: `🔧 *NEW QUICK ORDER*%0A%0AName: ${name}%0APhone: ${phone}%0AService: ${service_type}%0AModel: ${phone_model || 'Not specified'}%0ALocation: ${location || 'Not shared'}%0APrice: ₹${price || 'To be determined'}%0A%0AOrder ID: ${order.id}`
    });
    
  } catch (error) {
    console.error('Quick order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process quick order' 
    });
  }
});

// 📌 23. TRACK ORDER (Public)
app.get('/api/track-order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total_amount,
        created_at,
        customers (
          name
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    const statusMessages = {
      'pending': '🟡 Order received - Waiting for confirmation',
      'confirmed': '🟢 Order confirmed - Processing',
      'processing': '🔵 Order being processed',
      'shipped': '🚚 Order shipped - Out for delivery',
      'delivered': '✅ Order delivered successfully',
      'cancelled': '❌ Order cancelled'
    };
    
    res.json({
      success: true,
      data: {
        order_id: order.id,
        status: order.status,
        status_message: statusMessages[order.status] || 'Order received',
        customer_name: order.customers?.name || 'Customer',
        amount: order.total_amount,
        order_date: new Date(order.created_at).toLocaleDateString('en-IN'),
        estimated_delivery: 'Today 4-6 PM' // You can calculate this
      }
    });
    
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track order' 
    });
  }
});

// ============================================
// 🚀 START SERVER
// ============================================

app.listen(PORT, async () => {
  console.log(`🚀 Step'sEazy Backend Server Started`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`\n📊 Initializing database...`);
  
  // Initialize database on startup
  await initializeDatabase();
  
  console.log(`\n✅ Server is ready!`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   POST /api/register - User registration`);
  console.log(`   POST /api/login - User login`);
  console.log(`   POST /api/admin/login - Admin login`);
  console.log(`   GET  /api/products - Get all products`);
  console.log(`   POST /api/quick-order - Quick order (WhatsApp flow)`);
  console.log(`   GET  /api/track-order/:id - Track order`);
  console.log(`\n🔐 Protected Endpoints (Require Token):`);
  console.log(`   POST /api/orders - Create order`);
  console.log(`   GET  /api/my-orders - Get user orders`);
  console.log(`   POST /api/cart - Add to cart`);
  console.log(`   GET  /api/cart - Get cart items`);
  console.log(`   POST /api/services - Create service request`);
  console.log(`\n👑 Admin Endpoints (Require Admin Token):`);
  console.log(`   GET  /api/admin/orders - Get all orders`);
  console.log(`   PUT  /api/admin/orders/:id/status - Update order status`);
  console.log(`   GET  /api/admin/analytics - Get analytics`);
  console.log(`   POST /api/admin/products - Add product`);
  console.log(`\n💡 Tip: Use Postman to test API endpoints`);
});
