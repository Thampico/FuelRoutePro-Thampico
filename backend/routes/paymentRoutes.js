const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');

router.post('/', async (req, res) => {
  try {
    const { userId, cardNumber, expiry, cvv } = req.body;
    if (!userId || !cardNumber || !expiry || !cvv) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payment = new Payment({ userId, cardNumber, expiry, cvv });
    await payment.save();

    res.status(201).json({ success: true, message: 'Payment saved' });
  } catch (err) {
    console.error('Payment save failed:', err);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

module.exports = router;
