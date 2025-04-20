import React, { useState, useEffect, useRef } from 'react';
import './Reward.css'; // Make sure this matches your CSS filename
import logo from "./WhatAMess.png"
import axios from 'axios';
import { useWebSocket } from '../hooks/UseWebSocket';

const Reward = () => {
  const [rewardHistory, setRewardHistory] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useWebSocket();
  const prevDisplayedPoints = useRef(displayedPoints);

  // Fetch initial rewards data
  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/rewards', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        setRewardHistory(response.data.rewardHistory || []);
        const calculatedTotal = (response.data.rewardHistory || []).reduce((total, item) => {
          if (item.type === 'earned') {
            return total + item.points;
          } else if (item.type === 'spent') {
            return total - item.points;
          }
          return total;
        }, 0);
        
        setTotalPoints(calculatedTotal);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching rewards:', error);
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  // Listen for WebSocket updates
  useEffect(() => {
    if (socket && isConnected) {
      // Subscribe to order completion events
      socket.emit('subscribe_rewards', {
        userId: localStorage.getItem('userId')
      });

      // Handle order completion and reward updates
      socket.on('order_completed', (data) => {
        const newReward = {
          id: Date.now(),
          title: 'Order Complete',
          date: new Date().toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          points: data.rewardPoints,
          type: 'earned'
        };

        setRewardHistory(prev => [newReward, ...prev]);
        setTotalPoints(prev => prev + data.rewardPoints);
      });

      // Handle reward redemption updates
      socket.on('reward_redeemed', (data) => {
        const newRedemption = {
          id: Date.now(),
          title: data.rewardTitle,
          date: new Date().toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          points: data.points,
          type: 'spent'
        };

        setRewardHistory(prev => [newRedemption, ...prev]);
        setTotalPoints(prev => prev - data.points);
      });
    }

    return () => {
      if (socket) {
        socket.off('order_completed');
        socket.off('reward_redeemed');
      }
    };
  }, [socket, isConnected]);

  // Animate points counter
  useEffect(() => {
    if (!loading && totalPoints !== prevDisplayedPoints.current) {
      const duration = 1500;
      const startTime = Date.now();
      const startValue = prevDisplayedPoints.current;
      const endValue = totalPoints;

      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (endValue - startValue) * progress);
        setDisplayedPoints(currentValue);
        prevDisplayedPoints.current = currentValue;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }
  }, [loading, totalPoints]);

  const handleRedeemClick = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/rewards/redeem', {
        points: 100, // Example points to redeem
        rewardType: 'delivery_discount' // Example reward type
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        // The WebSocket will handle the update of the UI
        socket.emit('redeem_reward', {
          userId: localStorage.getItem('userId'),
          points: 100,
          rewardType: 'delivery_discount'
        });
      }
    } catch (error) {
      console.error('Error redeeming points:', error);
      // Handle error (show notification, etc.)
    }
  };

  const handleZoomIn = () => {
    // Handle zoom in
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    // Handle zoom out
    console.log('Zoom out');
  };

  return (
    <div className="container">
      <div className="left-panel">
        <div className="logo-container">
          <div className="logo">
            <img src={logo} alt="App Logo" className="logo" />
          </div>
        </div>
        <h1 className="page-title">Your Rewards</h1>
        <div className="rewards-card">
          <div className="rewards-total">
            <h2 className="rewards-title">Total Reward Points</h2>
            <div className="points-value">
              <span className="star-icon">★</span>
              <span>{displayedPoints}</span>
            </div>
            <p className="points-label">Points available for redemption</p>
          </div>
          <button 
            className="redeem-btn" 
            onClick={handleRedeemClick}
            disabled={totalPoints < 100} // Disable if not enough points
          >
            Redeem Points
          </button>
        </div>
      </div>
      <div className="right-panel">
        <div className="zoom-button">
          <button className="zoom-btn" onClick={handleZoomIn}>+</button>
          <button className="zoom-btn" onClick={handleZoomOut}>−</button>
        </div>
        <h2 className="history-title">History Rewards</h2>
        <div className="history-container">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading rewards history...</p>
            </div>
          ) : (
            rewardHistory.map((item, index) => {
              const isPositive = item.type === 'earned';
              const pointsPrefix = isPositive ? '+' : '-';
              const pointsClass = isPositive ? 'positive' : '';
              
              return (
                <div 
                  className="history-item" 
                  key={item.id}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="history-item-left">
                    <div className="history-item-title">{item.title}</div>
                    <div className="history-item-date">{item.date}</div>
                  </div>
                  <div className={`history-item-points ${pointsClass}`}>
                    {pointsPrefix}{item.points}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="position-indicator">
          <span className="marker-icon">📍</span>
          <span>Rewards Center</span>
        </div>
      </div>
    </div>
  );
};

export default Reward;