const router = require('express').Router()
const Order = require('../models/Order')
const { protect, adminOnly } = require('../middleware/auth')

// POST /api/orders — place order (authenticated)
router.post('/', protect, async (req, res, next) => {
  try {
    const { items, address, paymentMethod, notes } = req.body

    if (!items || !items.length)
      return res.status(400).json({ message: 'Order must have at least one item.' })

    const required = ['full_name', 'phone', 'line1', 'city', 'state', 'pincode']
    const missing = required.filter(f => !address?.[f])
    if (missing.length)
      return res.status(400).json({ message: `Address missing: ${missing.join(', ')}.` })

    const subtotal = items.reduce((sum, i) => sum + (i.total || 0), 0)
    const delivery = subtotal >= 999 ? 0 : 79
    const total = subtotal + delivery

    const order = await Order.create({
      user: req.user._id,
      items,
      address,
      paymentMethod,
      subtotal,
      delivery,
      total,
      paymentStatus: 'paid',
      notes,
    })

    res.status(201).json(order)
  } catch (err) { next(err) }
})

// GET /api/orders — get current user's orders
router.get('/', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name images basePrice')
      .sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) { next(err) }
})

// GET /api/orders/:id — get single order
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('items.product', 'name images basePrice')
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    res.json(order)
  } catch (err) { next(err) }
})

// PUT /api/orders/:id/cancel — cancel order
router.put('/:id/cancel', protect, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    if (!['placed', 'confirmed'].includes(order.status))
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage.' })
    order.status = 'cancelled'
    await order.save()
    res.json(order)
  } catch (err) { next(err) }
})

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /api/orders/admin/all
router.get('/admin/all', protect, adminOnly, async (req, res, next) => {
  try {
    const { status, page = 1 } = req.query
    const filter = status ? { status } : {}
    const limit = 20
    const [orders, total] = await Promise.all([
      Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit),
      Order.countDocuments(filter),
    ])
    res.json({ items: orders, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) { next(err) }
})

// PUT /api/orders/admin/:id/status
router.put('/admin/:id/status', protect, adminOnly, async (req, res, next) => {
  try {
    const { status, trackingId, courier, notes } = req.body
    const validStatuses = ['placed', 'confirmed', 'printing', 'packed', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: `Invalid status. Valid: ${validStatuses.join(', ')}.` })

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, ...(trackingId && { trackingId }), ...(courier && { courier }), ...(notes && { notes }) },
      { new: true }
    )
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    res.json(order)
  } catch (err) { next(err) }
})

module.exports = router
