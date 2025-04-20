import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PlaceOrder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    selectedItems = [],
    messName = '',
    paymentMethod = '',
    specialInstructions = '',
    preferWomenDelivery = false,
    userAddress = ''
  } = location.state || {};

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState(null);

  const handleFinalPlaceOrder = async () => {
    setIsPlacingOrder(true);
    setError(null);
    try {
      // Fetch mess owner (hardcoded as before)
      const messOwnerResponse = await axios.get('http://localhost:8000/api/auth/mess-owner/search', {
        params: { name: 'Harpreet Singh' },
      });
      const owners = messOwnerResponse.data;
      const matchedOwner = owners[0];
      if (!matchedOwner) {
        setError('Mess owner not found.');
        setIsPlacingOrder(false);
        return;
      }
      const messId = matchedOwner._id;

      // Prepare items with correct itemId field
      const items = selectedItems.map(item => ({
        itemId: item._id || item.id,
        name: item.name,
        quantity: item.quantity,
        price: typeof item.price === 'number' ? item.price : parseInt((item.price + '').replace(/[^\d]/g, '')),
        image: item.image
      }));

      // Ensure paymentMethod is a valid enum value
      const validPaymentMethod = paymentMethod === 'Cash on Delivery' ? 'cash' : paymentMethod.toLowerCase();

      const orderDetails = {
        messId,
        items,
        totalAmount: items.reduce((sum, i) => sum + i.price * i.quantity, 0) + 20,
        deliveryAddress: userAddress,
        paymentMethod: validPaymentMethod,
        specialInstructions,
        preferWomenDelivery,
        orderStatus: 'Pending',
        orderDate: new Date().toISOString()
      };

      const response = await axios.post(
        'http://localhost:8000/api/orders/create',
        orderDetails,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data && response.data._id) {
        navigate('/orders', { state: { orderId: response.data._id } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="place-order-final-page">
      <h2>Confirm Your Order</h2>
      <div><b>Delivery Address:</b> {userAddress}</div>
      <div><b>Payment Method:</b> {paymentMethod}</div>
      <div><b>Items:</b>
        <ul>
          {selectedItems.map(item => (
            <li key={item._id || item.id}>{item.name} x {item.quantity}</li>
          ))}
        </ul>
      </div>
      {error && <div style={{ color: 'red', margin: '12px 0' }}>{error}</div>}
      <button onClick={handleFinalPlaceOrder} disabled={isPlacingOrder}>
        {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
      </button>
    </div>
  );
};

export default PlaceOrder;
