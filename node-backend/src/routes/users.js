const router = require('express').Router()
const User = require('../models/User')
const { protect, adminOnly } = require('../middleware/auth')

// All routes require auth + admin
router.use(protect, adminOnly)

// GET /api/users — list all users
router.get('/', async (req, res, next) => {
  try {
    const { role, isActive } = req.query
    const filter = {}
    if (role) filter.role = role
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    const users = await User.find(filter).sort({ createdAt: -1 })
    res.json(users)
  } catch (err) { next(err) }
})

// GET /api/users/:id — get single user
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json(user)
  } catch (err) { next(err) }
})

// POST /api/users — create user
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required.' })
    const user = await User.create({ name, email, phone, password, role, emailVerified: true })
    res.status(201).json(user.toSafeObject())
  } catch (err) { next(err) }
})

// PUT /api/users/:id — update user
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, phone, role, isActive, emailVerified } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    if (name) user.name = name
    if (email) user.email = email
    if (phone !== undefined) user.phone = phone
    if (role) user.role = role
    if (isActive !== undefined) user.isActive = isActive
    if (emailVerified !== undefined) user.emailVerified = emailVerified

    await user.save()
    res.json(user.toSafeObject())
  } catch (err) { next(err) }
})

// DELETE /api/users/:id — soft delete
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })
    user.isActive = false
    await user.save()
    res.json({ message: 'User deactivated.', id: req.params.id })
  } catch (err) { next(err) }
})

module.exports = router
