import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CircularProgress, Paper, Typography, Box, Alert, Grid, Button } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import TimerIcon from "@mui/icons-material/Timer";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import axios from "axios";
import useWebSocket from "../utils/UseWebSocket";
import "./MessMenu.css";

const MessMenu = () => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const messId = location.state?.messId || params.messId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [messDetails, setMessDetails] = useState(null);
  const [cart, setCart] = useState([]);
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        // Get messId from location state or URL params
        if (!messId) {
          throw new Error('Mess ID not found');
        }

        // Fetch menu items only
        const menuResponse = await axios.get(`http://localhost:8000/api/menu/mess/${messId}`);
        setMenuItems(menuResponse.data);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching menu data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (messId) {
      fetchMenuData();
    }
  }, [messId]);

  // Listen for real-time menu updates
  useEffect(() => {
    if (socket && isConnected) {
      socket.on('menuUpdate', (data) => {
        if (data.messId === messId) {
          setMenuItems(prevItems => [...prevItems, data.menuItem]);
        }
      });

      return () => {
        socket.off('menuUpdate');
      };
    }
  }, [socket, isConnected, messId]);

  const handleAddToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((i) => i._id === item._id);
      if (exists) {
        return prev.map((i) => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleRemoveFromCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((i) => i._id === item._id);
      if (exists && exists.quantity > 1) {
        return prev.map((i) => i._id === item._id ? { ...i, quantity: i.quantity - 1 } : i);
      } else {
        // Remove item if quantity is 1
        return prev.filter((i) => i._id !== item._id);
      }
    });
  };

  const handleProceedToCart = () => {
    navigate("/cart", { state: { selectedItems: cart, messName: messDetails?.name || "" } });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Group menu items by category
  const menuByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <Box className="mess-menu">
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#2D3748', fontWeight: 600 }}>
          Today's Menu
        </Typography>

        <Grid container spacing={3}>
          {Object.entries(menuByCategory).map(([category, items]) => (
            <Grid item xs={12} key={category}>
              <Typography variant="h6" gutterBottom sx={{ color: '#FF6B35', fontWeight: 600, mb: 2 }}>
                {category}
              </Typography>
              {items.map((item) => {
                const cartItem = cart.find((i) => i._id === item._id);
                return (
                  <Paper key={item._id} elevation={1} sx={{ p: 2, borderRadius: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px #f6e2d6' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2D3748' }}>{item.name}</Typography>
                      <Typography variant="body2" sx={{ color: '#4A5568', mb: 0.5 }}>₹{item.price}</Typography>
                      {item.description && (
                        <Typography variant="body2" sx={{ color: '#718096', fontSize: '0.95rem', mb: 0.5 }}>
                          {item.description}
                        </Typography>
                      )}
                    </Box>
                    {cartItem ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button size="small" variant="outlined" color="primary" sx={{ minWidth: 36, borderRadius: 2 }} onClick={() => handleRemoveFromCart(item)}>
                          <RemoveIcon />
                        </Button>
                        <Typography sx={{ mx: 1, minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{cartItem.quantity}</Typography>
                        <Button size="small" variant="outlined" color="primary" sx={{ minWidth: 36, borderRadius: 2 }} onClick={() => handleAddToCart(item)}>
                          <AddIcon />
                        </Button>
                      </Box>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        size="medium"
                        onClick={() => handleAddToCart(item)}
                        sx={{ backgroundColor: '#FF6B35', borderRadius: 2, minWidth: 90, fontWeight: 600, boxShadow: '0 2px 8px #f6e2d6', '&:hover': { backgroundColor: '#ff8559' } }}
                      >
                        ADD
                      </Button>
                    )}
                  </Paper>
                );
              })}
            </Grid>
          ))}
        </Grid>

        {menuItems.length === 0 && (
          <Box p={2} textAlign="center">
            <Typography variant="body1" color="textSecondary">
              No menu items available for today.
            </Typography>
          </Box>
        )}
      </Paper>
      {cart.length > 0 && (
        <Box mt={3} textAlign="center">
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={handleProceedToCart}
            sx={{ backgroundColor: '#48BB78', '&:hover': { backgroundColor: '#38A169' } }}
          >
            Proceed Further ({cart.length} items)
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MessMenu;