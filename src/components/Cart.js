import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useWebSocket } from '../hooks/UseWebSocket';
import "./Cart.css";
import Avatar from '@mui/material/Avatar';

const Cart = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { selectedItems, messName } = location.state || { selectedItems: [], messName: "" };
  const [userAddress, setUserAddress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [userGender, setUserGender] = useState(null);
  const [preferWomenDelivery, setPreferWomenDelivery] = useState(false);

  // WebSocket integration
  const { socket, isConnected } = useWebSocket('ws://localhost:8080');

  // Calculate total price
  const totalPrice = selectedItems.reduce(
    (total, item) => {
      // Accept both string and number prices
      let priceNum = typeof item.price === 'number' ? item.price : parseInt((item.price + '').replace(/[^\d]/g, ''));
      return total + priceNum * (item.quantity || 1);
    },
    0
  );

  // State for payment mode and delivery instructions
  const [paymentMethod, setPaymentMethod] = React.useState("Cash on Delivery");
  const [specialInstructions, setSpecialInstructions] = React.useState("");

  // WebSocket connection setup
  useEffect(() => {
    if (socket && isConnected) {
      // Subscribe to order updates when component mounts
      socket.send(JSON.stringify({
        type: 'subscribe',
        payload: { 
          userId: localStorage.getItem('userId'),
          component: 'cart'
        }
      }));

      // Handle incoming messages
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'order_status_update') {
          // Handle order status updates if needed
          console.log('Order status updated:', message.payload);
        }
      };
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket, isConnected]);

  // Fetch user's details from backend
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setIsLoading(true);
        const [addressResponse, userResponse] = await Promise.all([
          axios.get('http://localhost:8000/api/auth/address', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          axios.get('http://localhost:8000/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
        ]);
        
        setUserAddress(addressResponse.data.address);
        setUserGender(userResponse.data.gender);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError('Failed to load user details');
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  // Handle Place Order button click
  const handlePlaceOrder = () => {
    // Redirect to FillAddress page, passing current cart/order state
    navigate('/fill-address', {
      state: {
        selectedItems,
        messName,
        paymentMethod,
        specialInstructions,
        preferWomenDelivery
      }
    });
  }

  return (
    <div className="cart-page">
      <h1>Here's your items, Checkout!</h1>
      <h2 className="mess-name">Food Mess At Service: {messName}</h2>
      <div className="cart-container">
        {/* Cart Items */}
        <div className="cart-items">
          {selectedItems.map((item) => (
            <div key={item.id} className="cart-item">
              <Avatar sx={{ width: 48, height: 48, mr: 2, bgcolor: '#ffe0b2', color: '#ff7043', fontWeight: 700, fontSize: 24 }}>
                {item.name ? item.name[0].toUpperCase() : '?'}
              </Avatar>
              <div className="item-details">
                <h3>{item.name}</h3>
                <p>{item.price}</p>
                <div className="quantity-controls">
                  <span>Quantity: {item.quantity}</span>
                </div>
              </div>
              <p className="item-total">
                ₹{typeof item.price === 'number' ? item.price : parseInt((item.price + '').replace(/[^\d]/g, '')) * (item.quantity || 1)}
              </p>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <h2>Order Summary</h2>
          <div className="summary-details">
            <p>Subtotal: ₹{totalPrice}</p>
            <p>Delivery Fee: ₹20</p>
            <p>Total: ₹{totalPrice + 20}</p>
          </div>

          {/* Delivery Address */}
          <div className="delivery-address">
            <h3>Delivery Address</h3>
            {isLoading ? (
              <div className="loading-skeleton" style={{ height: "60px", borderRadius: "8px" }}></div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <p className="address-text">{userAddress}</p>
            )}
          </div>

          {/* Women Delivery Option - Only shown for female users */}
          {userGender === 'female' && (
            <div className="delivery-preference">
              <h3>Delivery Preference</h3>
              <div className="preference-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferWomenDelivery}
                    onChange={(e) => setPreferWomenDelivery(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">Prefer Women Delivery Partner</span>
              </div>
              <p className="preference-note">
                *We will try our best to assign a women delivery partner based on availability
              </p>
            </div>
          )}

          {/* Payment Mode Dropdown */}
          <div className="payment-mode">
            <h3>Payment Mode</h3>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="payment-dropdown"
            >
              <option value="Cash on Delivery">Cash on Delivery</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          {/* Delivery Instructions */}
          <div className="delivery-instructions">
            <h3>Delivery Instructions</h3>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Add instructions for the delivery partner..."
              className="delivery-textarea"
            />
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: "15px", color: "#E53E3E" }}>
              {error}
            </div>
          )}

          {/* Place Order Button */}
          <button 
            className="place-order-btn" 
            onClick={handlePlaceOrder}
            disabled={isLoading || isPlacingOrder || !selectedItems.length}
          >
            {isPlacingOrder ? (
              <>
                <span>Placing Order...</span>
                <div className="loading-spinner"></div>
              </>
            ) : (
              'Place Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;