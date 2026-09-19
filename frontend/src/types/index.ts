export interface User {
  id: number
  name: string
  email: string
  phone?: string
  role: 'customer' | 'admin' | 'manager' | 'production' | 'shipping'
  avatar?: string
}

export interface Product {
  id: number
  name: string
  slug: string
  type: ProductType
  description: string
  material: string
  fit: string
  base_price: number
  images: string[]
  colours: ProductColour[]
  sizes: string[]
  rating: number
  review_count: number
  is_featured: boolean
  is_new: boolean
  tags: string[]
}

export type ProductType =
  | 'Regular Fit'
  | 'Oversized'
  | 'Polo'
  | 'Full Sleeve'
  | 'Half Sleeve'
  | 'Round Neck'
  | 'V-Neck'

export interface ProductColour {
  name: string
  hex: string
  stock: Record<string, number> // size -> qty
}

export interface Design {
  id: number
  name: string
  category: string
  image_url: string
  is_trending: boolean
  is_featured: boolean
  is_active: boolean
}

export interface DesignCategory {
  id: number
  name: string
  slug: string
}

export interface CanvasDesign {
  id: string
  type: 'image' | 'text'
  src?: string
  text?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  textAlign?: string
  letterSpacing?: number
  color?: string
  originalWidth?: number
  originalHeight?: number
  resolution?: number // DPI
}

export interface CustomizationState {
  productId: number | null
  colour: string
  colourHex: string
  sizes: Record<string, number> // size -> qty
  front: CanvasDesign[]
  back: CanvasDesign[]
  activeView: 'front' | 'back'
  frontDimensions: { width: number; height: number }
  backDimensions: { width: number; height: number }
}

export interface CartItem {
  id: number
  product: Product
  colour: string
  colour_hex: string
  sizes: Record<string, number>
  front_design?: string // JSON
  back_design?: string // JSON
  front_dimensions?: { width: number; height: number }
  back_dimensions?: { width: number; height: number }
  base_price: number
  front_print_cost: number
  back_print_cost: number
  delivery_cost: number
  total: number
}

export interface Order {
  id: number
  order_number: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  delivery: number
  discount: number
  total: number
  payment_status: string
  payment_method: string
  address: Address
  created_at: string
  estimated_delivery?: string
  tracking_id?: string
  courier?: string
  status_history: OrderStatusHistory[]
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'design_review'
  | 'design_approved'
  | 'design_rejected'
  | 'printing'
  | 'quality_check'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refund_requested'
  | 'refunded'

export interface OrderItem {
  id: number
  product: Product
  colour: string
  colour_hex: string
  sizes: Record<string, number>
  front_design?: string
  back_design?: string
  front_dimensions?: { width: number; height: number }
  back_dimensions?: { width: number; height: number }
  base_price: number
  front_print_cost: number
  back_print_cost: number
  total: number
}

export interface OrderStatusHistory {
  status: OrderStatus
  timestamp: string
  note?: string
}

export interface Address {
  id?: number
  full_name: string
  phone: string
  email: string
  line1: string
  line2?: string
  area: string
  city: string
  state: string
  pincode: string
  gst?: string
  company?: string
  instructions?: string
}

export interface Review {
  id: number
  user: { name: string; avatar?: string }
  product_id: number
  rating: number
  text: string
  image?: string
  is_verified: boolean
  created_at: string
}

export interface Coupon {
  code: string
  type: 'percentage' | 'flat'
  value: number
  min_order: number
  expiry: string
}

export interface Notification {
  id: number
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export interface Enquiry {
  full_name: string
  phone: string
  email: string
  company?: string
  enquiry_type: string
  quantity?: number
  message: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
