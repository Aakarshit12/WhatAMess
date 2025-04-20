const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User');
const mongoose = require('mongoose');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user'
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    if (error.code === 'auth/invalid-credential') {
      return res.status(401).json({ 
        message: 'Invalid authentication credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Debug middleware for all auth routes
router.use((req, res, next) => {
  console.log('Auth Route accessed:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Register a new user in MongoDB after Firebase signup
router.post('/register', verifyToken, async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { name, email, role, phone, address, gender } = req.body;
    const { uid } = req.user;

    // Check if user already exists
    let user = await User.findOne({ firebaseUid: uid });
    if (user) {
      console.log('User already exists in MongoDB:', user);
      return res.status(200).json({ message: 'User already exists', user });
    }

    // Validate and set correct role
    let dbRole = 'customer'; // Default role
    if (role === 'mess') dbRole = 'mess_owner';
    else if (role === 'delivery') dbRole = 'delivery_partner';
    else if (role === 'customer') dbRole = 'customer';

    // Create new user
    user = new User({
      firebaseUid: uid,
      email,
      name: name || email.split('@')[0], // Default name if not provided
      phone: phone || '',
      address: address || '',
      gender: gender || 'other',
      role: dbRole
    });

    await user.save();
    console.log('User successfully registered in MongoDB:', user);
    res.status(201).json({ 
      message: 'User registered in MongoDB', 
      user: {
        uid: user.firebaseUid,
        email: user.email,
        name: user.name,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('MongoDB registration error:', error);
    res.status(500).json({ message: 'Failed to register user in MongoDB', error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email });
    const { email, password } = req.body;
    
    // Step 1: Get user from Firebase
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Step 2: Create custom token
    const token = await admin.auth().createCustomToken(userRecord.uid);
    
    // Step 3: Get user details from MongoDB
    const user = await User.findOne({ firebaseUid: userRecord.uid });
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found in database',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({
      message: 'Login successful',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        address: user.address,
        gender: user.gender
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      message: 'Invalid credentials',
      code: error.code
    });
  }
});

// Profile route with auto-creation
router.get('/profile', verifyToken, async (req, res) => {
  try {
    console.log('Profile request received from:', req.user);
    const { uid, email } = req.user;
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      console.log('User not found in MongoDB, auto-creating');
      // Determine a default role - can be customized
      user = new User({
        firebaseUid: uid,
        email,
        name: email ? email.split('@')[0] : 'User', // Generate name from email
        role: 'customer', // Default role
        gender: 'other',  // Default gender
      });
      await user.save();
      console.log('User auto-created in MongoDB:', user);
    }

    res.json({
      uid: user.firebaseUid,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      address: user.address,
      gender: user.gender
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    console.log('Profile update request received:', req.body);
    const { name, phone, address, gender } = req.body;
    const { uid } = req.user;

    // Update Firebase user
    await admin.auth().updateUser(uid, {
      displayName: name
    });

    // Update MongoDB user
    const updatedUser = await User.findOneAndUpdate(
      { firebaseUid: uid },
      { 
        name,
        phone,
        address,
        gender,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).json({ 
      message: error.message,
      code: error.code
    });
  }
});

// Update FCM token
router.post('/fcm-token', verifyToken, async (req, res) => {
  try {
    console.log('FCM token update request received:', req.body);
    const { fcmToken } = req.body;
    const { uid } = req.user;

    await User.findOneAndUpdate(
      { firebaseUid: uid },
      { fcmToken },
      { new: true }
    );

    res.json({ message: 'FCM token updated successfully' });
  } catch (error) {
    console.error('FCM token update error:', error);
    res.status(500).json({ message: 'Error updating FCM token' });
  }
});

// Test endpoint to check all users
router.get('/users', async (req, res) => {
  try {
    console.log('Request to fetch all users received');
    const users = await User.find();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Test route to check specific user by email
router.get('/test/user/:email', async (req, res) => {
  try {
    console.log('Test request to fetch user by email:', req.params);
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('User found:', user);
    res.json({
      message: 'User retrieved successfully',
      user: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// MongoDB Health Check
router.get('/health', async (req, res) => {
  try {
    console.log('Health check request:', req.query);
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState;
    const mongoStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[mongoStatus];

    // Try to perform a simple query
    const userCount = await User.countDocuments();
    
    res.json({
      status: 'ok',
      mongoDB: {
        connection: mongoStatusText,
        userCount: userCount,
        connectionString: process.env.MONGODB_URI
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'MongoDB health check failed',
      error: error.message
    });
  }
});

// Debug route to check all data
router.get('/debug/data', async (req, res) => {
  try {
    console.log('Debug request to fetch all data:', req.query);
    // Get all users from MongoDB
    const users = await User.find({});
    
    // Get all Firebase users
    const firebaseUsers = await admin.auth().listUsers();
    
    res.json({
      mongoDB: {
        userCount: users.length,
        users: users
      },
      firebase: {
        userCount: firebaseUsers.users.length,
        users: firebaseUsers.users.map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }))
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      message: 'Error fetching debug data',
      error: error.message 
    });
  }
});

// Debug route to check user data
router.get('/debug/user/:email', async (req, res) => {
  try {
    console.log('Debug request to fetch user data:', req.params);
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found in MongoDB' });
    }
    
    // Also check Firebase
    const firebaseUser = await admin.auth().getUserByEmail(req.params.email);
    
    res.json({
      message: 'User data found',
      mongodb: user,
      firebase: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Sync Firebase users with MongoDB
router.get('/sync-users', async (req, res) => {
  try {
    console.log('Sync request to sync users:', req.query);
    console.log('Starting user sync...');
    
    // Get all Firebase users
    const firebaseUsers = await admin.auth().listUsers();
    console.log(`Found ${firebaseUsers.users.length} Firebase users`);
    
    let synced = 0;
    let errors = [];
    
    // For each Firebase user
    for (const firebaseUser of firebaseUsers.users) {
      try {
        // Check if user exists in MongoDB
        const mongoUser = await User.findOne({ firebaseUid: firebaseUser.uid });
        
        if (!mongoUser) {
          // Create MongoDB user if not exists
          const newUser = new User({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Unknown',
            role: firebaseUser.customClaims?.role || 'user'
          });
          
          await newUser.save();
          synced++;
          console.log(`Synced user: ${firebaseUser.email}`);
        }
      } catch (error) {
        errors.push({
          email: firebaseUser.email,
          error: error.message
        });
        console.error(`Error syncing user ${firebaseUser.email}:`, error);
      }
    }
    
    res.json({
      message: 'User sync completed',
      totalFirebaseUsers: firebaseUsers.users.length,
      newlySynced: synced,
      errors: errors
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 