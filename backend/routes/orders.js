const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');

// Middleware to verify Firebase token
const verifyTokenMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create a new order
router.post('/', verifyToken, async (req, res) => {
  try {
    const order = new Order({
      ...req.body,
      userId: req.user.uid,
      status: 'pending'
    });
    const newOrder = await order.save();
    
    // Emit order update via WebSocket
    req.app.get('io').emit('orderUpdate', {
      orderId: newOrder._id,
      status: newOrder.status,
      messId: newOrder.messId
    });
    
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.messId !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = req.body.status;
    const updatedOrder = await order.save();
    
    // Emit order update via WebSocket
    req.app.get('io').emit('orderUpdate', {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
      userId: updatedOrder.userId
    });
    
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get orders for a user
router.get('/user', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.uid })
      .populate('messId', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get orders for a mess owner
router.get('/mess', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ messId: req.user.uid })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 