import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

export const isValidPassword = (password) => {
  return (
    typeof password === 'string' &&
    password.length >= 6 &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

const Login = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      const storedUsers = JSON.parse(localStorage.getItem('fuelrouteUsers') || '[]');
      
      if (isLoginMode) {
        // Login existing user
        let user = storedUsers.find(u => u.name === formData.name && u.password === formData.password);
        if (user) {
            if (user.searchCount === undefined) user.searchCount = 0;
            if (user.isSubscribed === undefined) user.isSubscribed = false;
            const idx = storedUsers.findIndex(u => u.id === user.id);
            if (idx > -1) {
              storedUsers[idx] = user;
              localStorage.setItem('fuelrouteUsers', JSON.stringify(storedUsers));
            }
            localStorage.setItem('currentUser', JSON.stringify(user));
            setMessage(`Welcome back, ${user.name}! Redirecting to Hub...`);
            setTimeout(() => {
              window.location.href = '/how-it-works';
            }, 2000);
          } else {
          setMessage('Invalid credentials. Please check your name and password.');
        }
      } else {
        // Check if user already exists
        const existingUser = storedUsers.find(u => u.name === formData.name || u.email === formData.email);
        if (existingUser) {
          setMessage('User already exists! Please use the Login option or try a different name/email.');
        } else {
          if (!isValidPassword(formData.password)) {
            setMessage('Password must be at least 6 characters and include a number and special character');
            setIsLoading(false);
            return;
          }
          // Register new user
          const newUser = { ...formData, id: Date.now(), searchCount: 0, isSubscribed: false };
          storedUsers.push(newUser);
          localStorage.setItem('fuelrouteUsers', JSON.stringify(storedUsers));
          localStorage.setItem('currentUser', JSON.stringify(newUser));
          setMessage('Account created successfully! Redirecting to Hub...');
          setTimeout(() => {
            window.location.href = '/how-it-works';
          }, 2000);
        }
      }
      
      setIsLoading(false);
    }, 1500);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    const storedUsers = JSON.parse(localStorage.getItem('fuelrouteUsers') || '[]');
    const user = storedUsers.find(u => u.email === formData.email);
    
    if (user) {
      setMessage(`Password recovery: Your password is "${user.password}"`);
    } else {
      setMessage('Email not found. Please check your email address or sign up for a new account.');
    }
    setShowForgotPassword(false);
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setMessage('');
    setShowForgotPassword(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: ''
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>FuelRoute Pro Hub</h1>
          <p>Access your professional dashboard</p>
        </div>

        {/* Subscription Banner */}
        <div className="subscription-banner">
          <span>Unlock unlimited searches for just $15/month.</span>
          <Link to="/subscribe" className="subscribe-cta">Subscribe</Link>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button 
            type="button"
            className={`mode-btn ${!isLoginMode ? 'active' : ''}`}
            onClick={() => !isLoginMode || switchMode()}
          >
            Sign Up
          </button>
          <button 
            type="button"
            className={`mode-btn ${isLoginMode ? 'active' : ''}`}
            onClick={() => isLoginMode || switchMode()}
          >
            Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          {!isLoginMode && (
            <>
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={isLoginMode ? "Enter your password" : "Create a password"}
            />
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account & Sign In')}
          </button>

          {isLoginMode && !showForgotPassword && (
            <button 
              type="button" 
              className="forgot-password-btn"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot Password?
            </button>
          )}

          {showForgotPassword && (
            <div className="forgot-password-form">
              <p>Enter your email to recover your password:</p>
              <input
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                name="email"
              />
              <div className="forgot-password-buttons">
                <button type="button" onClick={handleForgotPassword}>
                  Recover Password
                </button>
                <button type="button" onClick={() => setShowForgotPassword(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className={`message ${message.includes('successful') || message.includes('Welcome') ? 'success-message' : 'error-message'}`}>
              {message}
            </div>
          )}
        </form>

        <div className="login-footer">
          <p>New to FuelRoute Pro? <Link to="/">Try Calculator</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;