// Brand configuration — change brand name here only
export const BRAND = {
  name: 'PRINTHEAVEN',
  tagline: 'Design It. Wear It. Make It Yours.',
  email: 'printheavenstudio@gmail.com',
  wemail: 'printheavenstudio@gmail.com',
  phone: '9600650612',
  whatsapp: '9600650612',
  address: 'Chennai, Tamil Nadu, India',
  instagram: 'https://instagram.com/printheaven',
  facebook: 'https://facebook.com/printheaven',
  youtube: 'https://youtube.com/@printheaven',
} as const

export const PLACEHOLDER_IMAGE = '/products/placeholder.svg'

export const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const CURRENCY = '₹'

export const PRINT_AREA = {
  front: { width: 30, height: 36 }, // cm
  back: { width: 29.7, height: 42 }, // cm — up to A3 (297 × 420 mm)
}

// Printing charge options — matches admin-configurable backend settings
export const PRINT_OPTIONS = [
  { id: 'none',              label: 'No Print',                    frontCost: 0,   backCost: 0   },
  { id: 'logo_only',         label: 'Logo Only',                   frontCost: 70,  backCost: 0   },
  { id: 'front_print',       label: 'Front Print',                 frontCost: 100, backCost: 0   },
  { id: 'back_print',        label: 'Back Print',                  frontCost: 0,   backCost: 100 },
  { id: 'front_logo_back',   label: 'Front Logo + Back Print',     frontCost: 70,  backCost: 80  },
  { id: 'full_front_back',   label: 'Full Front + Full Back Print', frontCost: 100, backCost: 100 },
] as const

export type PrintOptionId = typeof PRINT_OPTIONS[number]['id']

// Product base prices (₹) — used as fallback; actual prices come from DB
export const PRODUCT_PRICES = {
  round_neck_kids:    299,
  round_neck_mens:    399,
  polo_mens:          499,
  polo_poly_cotton:   399,
  hoodie:             599,
} as const

// Courier charges — Kids Round Neck is fixed ₹80; all others are admin-configurable
export const COURIER_KIDS_ROUND_NECK = 80

export const PRICING = {
  frontPrint: 100,
  backPrint: 100,
  deliveryBase: 80,
  deliveryPerExtra: 0,
  freeDeliveryAbove: 99999, // no free delivery threshold — admin sets courier per product
}
