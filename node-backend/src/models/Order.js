const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productSnapshot: { type: Object },
  colour: String,
  sizes: { type: Object },
  basePrice: Number,
  printCost: { type: Number, default: 0 },
  total: Number,
})

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'printing', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'placed',
  },
  subtotal: { type: Number, required: true },
  delivery: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String },
  address: { type: Object, required: [true, 'Delivery address is required'] },
  trackingId: { type: String },
  courier: { type: String },
  notes: { type: String },
}, { timestamps: true })

// Auto-generate order number
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const suffix = Math.floor(100000 + Math.random() * 900000)
    this.orderNumber = `PH-${new Date().getFullYear()}-${suffix}`
  }
  next()
})

module.exports = mongoose.model('Order', orderSchema)
