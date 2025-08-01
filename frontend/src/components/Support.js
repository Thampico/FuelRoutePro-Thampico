import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Support.css';

const Support = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    companyName: '',
    typeOfRequest: '',
    state: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const requestTypes = [
    'General Inquiry',
    'Technical Support',
    'Pricing Information',
    'API Integration',
    'Custom Solutions',
    'Bulk Pricing',
    'Training & Onboarding',
    'Feature Request',
    'Bug Report'
  ];

  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission - In production, this would send to info@thampico.com
    setTimeout(() => {
      setSubmitMessage('Thank you for contacting THAMPICO! We\'ll get back to you within 24 hours at the email address you provided.');
      setIsSubmitting(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        companyName: '',
        typeOfRequest: '',
        state: '',
        message: ''
      });
      
      // In production, you would integrate with an email service here
      console.log('Form submitted to info@thampico.com:', formData);
    }, 2000);
  };

  return (
    <div className="support-container">
      {/* Header */}
      <div className="support-header">
        <div className="support-nav">
          <Link to="/" className="support-nav-link">🏠 Home</Link>
          <Link to="/" className="support-nav-link">🧮 Calculator</Link>
        </div>
      </div>

      <div className="support-content">
        <div className="support-left">
          <h1>Customer Support</h1>
          <p className="support-description">
            Have a question about FuelRoute Pro or looking for product support?
            Please check out our <Link to="/help" className="help-link">Help</Link> section.
          </p>
          
          <p className="support-alternative">
            Alternatively, contact us by phone or using the form on this page.
          </p>
          
          <div className="support-hours">
            <h3>HOURS:</h3>
            <p>Monday to Friday, 8AM to 9PM ET</p>
          </div>
          
          <div className="support-contact">
            <h3>General Inquiries, Sales & Support:</h3>
            <a href="tel:1-562-448-2122" className="phone-link">+1 (562) 448-2122</a>
            <p className="phone-subtitle">Orange County, California</p>
          </div>

          <div className="support-additional">
            <h3>Additional Support Channels:</h3>
            <div className="support-channels">
              <div className="channel">
                <span className="channel-icon">📧</span>
                <div>
                  <strong>Email Support</strong>
                  <p>info@thampico.com</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="support-image">
            <img 
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
              alt="Fuel transportation highway" 
              className="highway-image"
            />
          </div>
        </div>
        
        <div className="support-right">
          <div className="contact-form-card">
            <h2>Contact Us</h2>
            
            {submitMessage && (
              <div className="success-message">
                {submitMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name *"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name *"
                  required
                />
              </div>
              
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email *"
                required
              />
              
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number *"
                required
              />
              
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Company Name *"
                required
              />
              
              <select
                name="typeOfRequest"
                value={formData.typeOfRequest}
                onChange={handleChange}
                required
              >
                <option value="">Type of Request... *</option>
                {requestTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
              >
                <option value="">State... *</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="What can we help you with? Please provide details about your fuel transportation needs, current challenges, or specific questions about our AI-powered cost calculator. *"
                rows="5"
                required
              ></textarea>
              
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;