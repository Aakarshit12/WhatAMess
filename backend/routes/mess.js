const express = require('express');
const router = express.Router();
const Mess = require('../models/Mess');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const admin = require('firebase-admin');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
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

// Create new mess
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { name, description, address, location, cuisine, isVeg, isWomenOnly, openingHours } = req.body;
    const { uid } = req.user;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const mess = new Mess({
      ownerId: user._id,
      name,
      description,
      address,
      location,
      cuisine,
      isVeg,
      isWomenOnly,
      openingHours
    });

    await mess.save();
    res.status(201).json({ message: 'Mess created successfully', mess });
  } catch (error) {
    console.error('Mess creation error:', error);
    res.status(500).json({ message: 'Error creating mess' });
  }
});

// Get mess details
router.get('/:messId', async (req, res) => {
  try {
    const mess = await Mess.findById(req.params.messId)
      .populate('ownerId', 'name phone');

    if (!mess) {
      return res.status(404).json({ message: 'Mess not found' });
    }

    res.json(mess);
  } catch (error) {
    console.error('Mess fetch error:', error);
    res.status(500).json({ message: 'Error fetching mess details' });
  }
});

// Get mess menu
router.get('/:messId/menu', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ messId: req.params.messId, isAvailable: true });
    res.json(menuItems);
  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({ message: 'Error fetching menu' });
  }
});

// Add menu item
router.post('/:messId/menu', verifyToken, async (req, res) => {
  try {
    const { name, description, price, category, isVeg, image, preparationTime } = req.body;
    const { messId } = req.params;
    const { uid } = req.user;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({ message: 'Mess not found' });
    }

    if (mess.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const menuItem = new MenuItem({
      messId,
      name,
      description,
      price,
      category,
      isVeg,
      image,
      preparationTime
    });

    await menuItem.save();
    res.status(201).json({ message: 'Menu item added successfully', menuItem });
  } catch (error) {
    console.error('Menu item creation error:', error);
    res.status(500).json({ message: 'Error adding menu item' });
  }
});

// Update menu item
router.put('/:messId/menu/:itemId', verifyToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { uid } = req.user;

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const menuItem = await MenuItem.findById(itemId);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const mess = await Mess.findById(menuItem.messId);
    if (mess.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    Object.assign(menuItem, req.body);
    await menuItem.save();

    res.json({ message: 'Menu item updated successfully', menuItem });
  } catch (error) {
    console.error('Menu item update error:', error);
    res.status(500).json({ message: 'Error updating menu item' });
  }
});

// Search messes
router.get('/search', async (req, res) => {
  try {
    const { query, isVeg, isWomenOnly, cuisine } = req.query;
    let filter = { isActive: true };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (isVeg) filter.isVeg = isVeg === 'true';
    if (isWomenOnly) filter.isWomenOnly = isWomenOnly === 'true';
    if (cuisine) filter.cuisine = cuisine;

    const messes = await Mess.find(filter)
      .populate('ownerId', 'name phone');

    res.json(messes);
  } catch (error) {
    console.error('Mess search error:', error);
    res.status(500).json({ message: 'Error searching messes' });
  }
});

module.exports = router; 