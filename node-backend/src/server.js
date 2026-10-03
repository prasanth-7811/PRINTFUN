require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const connectDB = require('./config/db')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// ── Database ──────────────────────────────────────────────────────────────────
connectDB()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many requests, please try again later.' },
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'))
app.use('/api/users', require('./routes/users'))
app.use('/api/products', require('./routes/products'))
app.use('/api/orders', require('./routes/orders'))

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'printheaven-node-api', db: 'mongodb' })
)

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }))

// Global error handler
app.use(errorHandler)

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001
app.listen(PORT, () => console.log(`Node server running on port ${PORT}`))
