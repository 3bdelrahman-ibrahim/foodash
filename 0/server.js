require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5001;

const uri = process.env.MONGODB_URI;
const My_api_server = process.env.My_api;
const JWT_SECRET = process.env.JWT_SECRET;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.render('public/404');
});

///////////////////////////////////////////////////////////////////// User /////////////////////////////////////////////////////////////////////

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  location: String,
  email: String,
  password: String,
  restaurantId: String,
  imageUrl: {
    data: Buffer,
    contentType: String
  },
  label: String,
  foods: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Food' }],
  cart: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' } // Assuming each user has one cart
});

const User = mongoose.model('User', userSchema);

app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    const usersWithImages = users.map(user => ({
      ...user.toObject(),
      imageUrl: user.imageUrl ? {
        data: user.imageUrl.data ? user.imageUrl.data.toString('base64') : null,
        contentType: user.imageUrl.contentType
      } : null
    }));
    res.json(usersWithImages);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userWithImage = {
      ...user.toObject(),
      imageUrl: user.imageUrl ? {
        data: user.imageUrl.data ? user.imageUrl.data.toString('base64') : null,
        contentType: user.imageUrl.contentType
      } : null
    };
    res.json(userWithImage);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ userId: user._id, token, label: user.label, restaurantId: user.restaurantId || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/signup', upload.single('image'), async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const newUser = new User({
      ...req.body,
      imageUrl: {
        data: req.file.buffer,
        contentType: req.file.mimetype
      }
    });
    const savedUser = await newUser.save();
    const token = jwt.sign({ _id: savedUser._id }, JWT_SECRET);
    res.json({ ...savedUser.toObject(), token });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/users/:userId', upload.single('image'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const { name, phone, location } = req.body;
    let imageUrl;

    if (req.file) {
      const imageBuffer = req.file.buffer;
      const imageContentType = req.file.mimetype;
      imageUrl = {
        data: imageBuffer,
        contentType: imageContentType
      };
    }

    const updateFields = { name, phone, location };
    if (imageUrl) {
      updateFields.imageUrl = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/users/:userId/orders', async (req, res) => {  ///////////////////////////////////////////////////// ???
  const { userId } = req.params;
  const { restaurantId, items, total } = req.body;
  try {
    const order = new Order({ userId, restaurantId, items, total, status: "Pending" });
    await order.save();
    res.status(201).json(order);

    // Delete cart items for the user after successful order placement
    await Cart.findOneAndDelete({ userId });
  } catch (error) {
    console.error('Error adding order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});






///////////////////////////////////////////////////////////////////// Restaurant /////////////////////////////////////////////////////////////////////

const restaurantSchema = new mongoose.Schema({
  DeliveryPrice: Number,
  active: Boolean,
  DeliveryTime: String,
  PercentForApp: Number,
  Type: String,
  Address: String,
  CuisineType: String,
  Description: String,
  LoveCount: Number,
  PhoneNumber: String,
  Rating: Number,
  RatingCount: Number,
  RatingNumber: Number,
  StartTime: String,
  UserType: String,
  adImage: {
    data: Buffer,
    contentType: String
  },

  imageUrl: {
    data: Buffer, 
    contentType: String
  },
  foods: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Food' }],
  name: String,
  endTime: String,
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// app.post('/restaurants', upload.single('image'), async (req, res) => {
//   try {
//     const newRestaurant = new Restaurant({
//       ...req.body,
//       imageUrl: {
//         data: req.file.buffer,
//         contentType: req.file.mimetype
//       }
//     });
//     const savedRestaurant = await newRestaurant.save();
//     res.json(savedRestaurant);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

app.post('/restaurants', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'adImage', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, DeliveryPrice, DeliveryTime, PercentForApp, Type, Address, CuisineType, Description, LoveCount, PhoneNumber, Rating, RatingCount, RatingNumber, StartTime, UserType } = req.body;
    const imageFile = req.files['image'] ? req.files['image'][0] : null; // Check if image is uploaded
    const adImageFile = req.files['adImage'] ? req.files['adImage'][0] : null; // Check if ad image is uploaded

    const newRestaurant = new Restaurant({
      name,
      DeliveryPrice,
      DeliveryTime,
      PercentForApp,
      Type,
      Address,
      CuisineType,
      Description,
      LoveCount,
      PhoneNumber,
      Rating,
      RatingCount,
      RatingNumber,
      StartTime,
      UserType,

      imageUrl: imageFile ? { 
        data: imageFile.buffer,
        contentType: imageFile.mimetype
      } : null,
      adImage: adImageFile ? {
        data: adImageFile.buffer,
        contentType: adImageFile.mimetype
      } : null
    });

    const savedRestaurant = await newRestaurant.save();
    res.status(201).json(savedRestaurant); // Return the created restaurant
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ message: 'Failed to create restaurant' });
  }
});



app.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    if (!restaurants) { 
      return res.status(404).json({ message: 'No restaurants found' });
    }
    const restaurantsWithImages = restaurants.map(restaurant => ({
      ...restaurant.toObject(),
      imageUrl: restaurant.imageUrl ? {
        data: restaurant.imageUrl.data ? restaurant.imageUrl.data.toString('base64') : null,
        contentType: restaurant.imageUrl.contentType
      } : null
    }));
    res.json(restaurantsWithImages);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/restaurants/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const restaurant = await Restaurant.findById(restaurantId).populate('orders');
    res.json(restaurant);
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/restaurants/:restaurantId/foods', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const restaurant = await Restaurant.findById(restaurantId).populate('foods');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const foodsWithImages = restaurant.foods.map(food => ({
      ...food.toObject(),
      imageUrl: food.imageUrl ? {
        data: food.imageUrl.data.toString('base64'),
        contentType: food.imageUrl.contentType
      } : null
    }));
    res.json(foodsWithImages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/restaurants/:restaurantId/orders', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const orders = await Order.find({ restaurantId }).populate('items.foodId');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/top', async (req, res) => {
  try {
    const topRestaurants = await Restaurant.find({})
      .sort({ Rating: -1 })
      .limit(10);

    if (topRestaurants.length === 0) {
      return res.status(404).json({ message: 'No top restaurants found' });
    }

    const restaurantsWithImages = topRestaurants.map(restaurant => ({
      ...restaurant.toObject(),
      imageUrl: restaurant.imageUrl ? {
        data: restaurant.imageUrl.data ? restaurant.imageUrl.data.toString('base64') : null,
        contentType: restaurant.imageUrl.contentType
      } : null
    }));

    res.json(restaurantsWithImages);
  } catch (error) {
    console.error('Error fetching top restaurants:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/popular', async (req, res) => {
  try {
    const topRestaurants = await Restaurant.find({})
      .sort({ LoveCount: -1 })
      .limit(10); 

    if (topRestaurants.length === 0) {
      return res.status(404).json({ message: 'No top restaurants found' });
    }

    const restaurantsWithImages = topRestaurants.map(restaurant => ({
      ...restaurant.toObject(),
      imageUrl: restaurant.imageUrl ? {
        data: restaurant.imageUrl.data ? restaurant.imageUrl.data.toString('base64') : null,
        contentType: restaurant.imageUrl.contentType
      } : null
    }));

    res.json(restaurantsWithImages);
  } catch (error) {
    console.error('Error fetching top restaurants:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


///////////////////////////////////////////////////////////////////// Food /////////////////////////////////////////////////////////////////////

const foodSchema = new mongoose.Schema({
  imageUrl: {
    data: Buffer,
    contentType: String
  },
  name: { type: String },
  price: { type: Number },
  restaurantId: { type: String },
});

const Food = mongoose.model('Food', foodSchema);

app.get('/foods', async (req, res) => {
  try {
    const foods = await Food.find();
    const foodsWithImages = foods.map(food => ({
      ...food.toObject(),
      imageUrl: food.imageUrl ? {
        data: food.imageUrl.data.toString('base64'),
        contentType: food.imageUrl.contentType
      } : null
    }));
    res.json(foodsWithImages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

///////////////////////////////////////////////////////////////////// Cart /////////////////////////////////////////////////////////////////////

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items: [
    {
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
      quantity: { type: Number, required: true }
    }
  ],
  total: { type: Number, required: true },
});

const Cart = mongoose.model('Cart', cartSchema);

app.get('/users/:userId/cart', async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await Cart.findOne({ userId }).populate('items.foodId');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/users/:userId/cart', async (req, res) => {
  const { userId } = req.params;
  const { foodId, quantity, restaurantId } = req.body;
  try {
    let cart = await Cart.findOne({ userId });

    if (cart && cart.restaurantId.toString() !== restaurantId) {
      await Cart.deleteOne({ _id: cart._id });
      cart = null;
    }

    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0, restaurantId });
    }

    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    const existingItem = cart.items.find(item => item.foodId.toString() === foodId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ foodId, quantity });
    }

    cart.total += food.price * quantity;
    await cart.save();

    res.status(201).json(cart);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/users/:userId/cart', async (req, res) => {
  const { userId } = req.params;
  const { foodId, quantity } = req.body;
  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.foodId.toString() === foodId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Food item not found in cart' });
    }

    const item = cart.items[itemIndex];
    cart.total -= item.quantity * item.foodId.price;
    cart.items[itemIndex].quantity = quantity;
    cart.total += item.quantity * item.foodId.price;

    await cart.save();
    res.json(cart);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/users/:userId/cart/:itemId', async (req, res) => {
  const { userId, itemId } = req.params;
  const { quantity } = req.body;
  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    const item = cart.items[itemIndex];
    const food = await Food.findById(item.foodId);

    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    // Update the quantity of the item
    cart.items[itemIndex].quantity = quantity;

    await cart.save();
    res.json(cart);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.delete('/users/:userId/cart/:itemId', async (req, res) => {
  const { userId, itemId } = req.params;
  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);

    await cart.save();
    res.status(204).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/users/:userId/cart/items/:foodId', async (req, res) => {
  const { userId, foodId } = req.params;
  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.foodId.toString() === foodId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Food item not found in cart' });
    }

    const item = cart.items[itemIndex];
    cart.total -= item.quantity * item.foodId.price;
    cart.items.splice(itemIndex, 1);

    await cart.save();
    res.status(204).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/users/:userId/cart', async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    await Cart.deleteOne({ _id: cart._id });
    res.status(204).json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

///////////////////////////////////////////////////////////////////// Orders /////////////////////////////////////////////////////////////////////

const orderSchemas = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
      quantity: { type: Number, required: true }
    }
  ],
  total: { type: Number, required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  status: { type: String, default: 'Pending' }
});


const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items: [
    {
      foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
      foodName: String,
      price: Number,
      quantity: Number
    }
  ],
  total: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
  customerName: String, 
  customerAddress: String,
  customerPhone: String,
  restaurantName: String,
  restaurantAddress: String,
  restaurantPhone: String, 
});


const Order = mongoose.model('Order', orderSchema);

app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('items.foodId').populate('restaurantId').populate('userId');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  // Check if the new status is Confirmed_by_delivery
  if (status === 'Confirmed_by_delivery') {
    try {
      // Check if the order already has status Confirmed_by_delivery
      const existingOrder = await Order.findById(orderId);
      if (existingOrder && existingOrder.status === 'Confirmed_by_delivery') {
        return res.status(400).json({ message: 'Order already confirmed by delivery' });
      }
    } catch (error) {
      console.error('Error checking order status:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  try {
    // Update the order status
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/orders', async (req, res) => {
  const { userId, restaurantId, items, total, customerName, customerAddress, customerPhone, restaurantName, restaurantAddress, restaurantPhone } = req.body;

  try {
    // Validate request body
    if (!userId || !restaurantId || !items || !total || !customerName || !customerAddress || !customerPhone || !restaurantName || !restaurantAddress || !restaurantPhone) {
      return res.status(400).json({ message: 'Incomplete order data' });
    }

    // Fetch the restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
 
    // Create the order
    const newOrder = new Order({
      userId,
      restaurantId,
      items,
      total, 
      customerName,
      customerAddress,
      customerPhone,
      restaurantName,
      restaurantAddress,
      restaurantPhone
    });

    await newOrder.save();

    // Add the order to the restaurant's orders list
    restaurant.orders.push(newOrder._id);
    await restaurant.save();

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

















// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const multer = require('multer');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const csurf = require('csurf');
// const { body, validationResult } = require('express-validator');
// const path = require('path');
// const bodyParser = require('body-parser');
// const cookieParser = require('cookie-parser');

// const app = express();
// const port = process.env.PORT || 5001;

// const uri = process.env.MONGODB_URI;
// const JWT_SECRET = process.env.JWT_SECRET;

// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// app.use(bodyParser.json({ limit: '10mb' }));
// app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
// app.use(cookieParser());
 
// app.use(cors());
// app.use(helmet());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public')));
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

// const csrfProtection = csurf({ cookie: true });

// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // Limit each IP to 100 requests per windowMs
// });

// app.use('/api/', apiLimiter);

// mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // Middleware to check JWT and redirect if unauthorized
// function authenticateToken(req, res, next) {
//     const token = req.cookies.jwt;
//     if (!token) {
//         return res.redirect('/'); // Redirect to your desired URL
//     }

//     jwt.verify(token, JWT_SECRET, (err, user) => {
//         if (err) {
//             return res.redirect('/'); // Redirect to your desired URL
//         }
//         req.user = user;
//         next();
//     });
// }

// // Routes
// app.get('/', csrfProtection, (req, res) => {
//     res.render('pages/index', { csrfToken: req.csrfToken() });
// });

// app.get('/login', csrfProtection, (req, res) => {
//     res.render('pages/login', { csrfToken: req.csrfToken() });
// });

// app.post('/login', csrfProtection, async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const user = await User.findOne({ email });
//         if (!user || !(await bcrypt.compare(password, user.password))) {
//             return res.status(401).json({ message: 'Invalid credentials' });
//         }

//         const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
//         res.cookie('jwt', token, { httpOnly: true, secure: true });
//         res.redirect('/');
//     } catch (error) {
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });

// app.post('/logout', authenticateToken, csrfProtection, (req, res) => {
//     res.clearCookie('jwt');
//     res.redirect('/');
// });

// app.get('/profile', authenticateToken, (req, res) => {
//     res.render('pages/profile', { user: req.user });
// });

// // User Schema and Model
// const userSchema = new mongoose.Schema({
//   name: String,
//   phone: String,
//   location: String,
//   email: String,
//   password: String,
//   restaurantId: String,
//   imageUrl: {
//     data: Buffer,
//     contentType: String
//   },
//   label: String,
//   foods: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Food' }],
//   cart: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' }
// });

// userSchema.pre('save', async function(next) {
//   if (this.isModified('password') || this.isNew) {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//   }
//   next();
// });

// const User = mongoose.model('User', userSchema);

// app.post('/signin', async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user || !(await bcrypt.compare(password, user.password))) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }
//     const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
//     res.json({ userId: user._id, token, label: user.label, restaurantId: user.restaurantId || null });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// app.post('/signup', upload.single('image'), [
//   body('email').isEmail().withMessage('Invalid email'),
//   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
// ], async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }
//   try {
//     const existingUser = await User.findOne({ email: req.body.email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Email already in use' });
//     }

//     if (!req.file) {
//       return res.status(400).json({ message: 'No file uploaded' });
//     }

//     const newUser = new User({
//       ...req.body,
//       password: await bcrypt.hash(req.body.password, 10),
//       imageUrl: {
//         data: req.file.buffer,
//         contentType: req.file.mimetype
//       }
//     });
//     const savedUser = await newUser.save();
//     const token = jwt.sign({ _id: savedUser._id }, JWT_SECRET);
//     res.json({ ...savedUser.toObject(), token });
//   } catch (error) {
//     console.error('Error adding user:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// app.get('/users', authenticateToken, async (req, res) => {
//   try {
//       const users = await User.find();
//       const usersWithImages = users.map(user => ({
//           ...user.toObject(),
//           imageUrl: user.imageUrl ? {
//               data: user.imageUrl.data ? user.imageUrl.data.toString('base64') : null,
//               contentType: user.imageUrl.contentType
//           } : null
//       }));
//       res.json(usersWithImages);
//   } catch (error) {
//       console.error('Error fetching users:', error);
//       res.status(500).json({ message: 'Internal server error' });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
 