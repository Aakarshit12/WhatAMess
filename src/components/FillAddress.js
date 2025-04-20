import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const FillAddress = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    // Pass address and previous state to PlaceOrder for order placement
    navigate('/place-order', { state: { ...location.state, userAddress: address } });
  };

  return (
    <div className="fill-address-page">
      <h2>Enter Delivery Address</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Enter your delivery address"
          rows={4}
          style={{ width: '100%' }}
        />
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        <button type="submit" style={{ marginTop: 16 }}>Proceed to Order</button>
      </form>
    </div>
  );
};

export default FillAddress;
