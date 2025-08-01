import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Subscription.css';

const Subscription = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    setCurrentUser(user);
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.id) {
      setMessage('Please login first.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          cardNumber,
          expiry,
          cvv
        })
      });

      if (!res.ok) {
        throw new Error('Payment failed');
      }

      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...currentUser, isSubscribed: true };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        const users = JSON.parse(localStorage.getItem('fuelrouteUsers') || '[]');
        const idx = users.findIndex((u) => u.id === currentUser.id);
        if (idx > -1) {
          users[idx] = updatedUser;
          localStorage.setItem('fuelrouteUsers', JSON.stringify(users));
        }
        setCurrentUser(updatedUser);
        setMessage('Subscription successful! You now have unlimited searches.');
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (err) {
      console.error('Subscription error', err);
      setMessage('Subscription failed. Please try again.');
    }
  };

  return (
    <div className="subscription-container">
      <div className="subscription-card">
        <h1>FuelRoute Pro Subscription</h1>
        <p className="price">$15/month</p>
        <p className="info">First 3 searches are free. Subscribe to continue using the calculator.</p>
        {message && <div className="message">{message}</div>}
        {currentUser?.isSubscribed ? (
          <div className="already">You are already subscribed.</div>
        ) : (
          <form onSubmit={handleSubscribe} className="subscription-form">
            <div className="form-group">
              <label>Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="CVV"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="subscribe-btn">Subscribe</button>
          </form>
        )}
        <div className="back-link">
          <Link to="/how-it-works">Back to Hub</Link>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
