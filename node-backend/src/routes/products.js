const router = require('express').Router()
const Product = require('../models/Product')
const { protect, adminOnly } = require('../middleware/auth')

// GET /api/products — public, list all active products
router.get('/', async (req, res, next) => {
  try {
    const { type, featured, search } = req.query
    const filter = { isActive: true }
    if (type) filter.type = type
    if (featured === 'true') filter.isFeatured = true
    if (search) filter.name = { $regex: search, $options: 'i' }
    const products = await Product.find(filter).sort({ createdAt: -1 })
    res.json(products)
  } catch (err) { next(err) }
})

// GET /api/products/:id — public, single product
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product || !product.isActive)
      return res.status(404).json({ message: 'Product not found.' })
    res.json(product)
  } catch (err) { next(err) }
})

// POST /api/products — admin only
router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { name, slug, type, basePrice } = req.body
    if (!name || !slug || !type || !basePrice)
      return res.status(400).json({ message: 'name, slug, type and basePrice are required.' })
    const product = await Product.create(req.body)
    res.status(201).json(product)
  } catch (err) { next(err) }
})

// PUT /api/products/:id — admin only
router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    )
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    res.json(product)
  } catch (err) { next(err) }
})

// DELETE /api/products/:id — admin only (soft delete)
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    )
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    res.json({ message: 'Product deactivated.', id: req.params.id })
  } catch (err) { next(err) }
})

module.exports = router
