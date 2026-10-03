const router = require('express').Router()
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { protect } = require('../middleware/auth')

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required.' })

    const user = await User.create({ name, email, phone, password })
    res.status(201).json({ token: signToken(user._id), user: user.toSafeObject() })
  } catch (err) { next(err) }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' })

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.checkPassword(password)))
      return res.status(401).json({ message: 'Incorrect email or password.' })
    if (!user.isActive)
      return res.status(403).json({ message: 'Account is disabled.' })

    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })

    res.json({ token: signToken(user._id), user: user.toSafeObject() })
  } catch (err) { next(err) }
})

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json(req.user))

module.exports = router
