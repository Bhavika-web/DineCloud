const { rateLimit } = require('express-rate-limit')

const orderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many order attempts. Please try again later.' },
})

module.exports = orderRateLimiter
