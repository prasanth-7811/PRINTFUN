const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Product type is required'],
    enum: ['Round Neck', 'Polo', 'Oversized', 'Hoodies'],
  },
  description: { type: String },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative'],
  },
  images: [{ type: String }],
  colours: [{ name: String, hex: String }],
  sizes: [{ type: String }],
  fabric: { type: String },
  gsm: { type: Number },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  tags: [{ type: String }],
}, { timestamps: true })

module.exports = mongoose.model('Product', productSchema)
