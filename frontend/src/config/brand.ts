// Brand configuration — change brand name here only
export const BRAND = {
  name: 'TEEZO',
  tagline: 'Design It. Wear It. Make It Yours.',
  email: 'hello@teezo.com',
  phone: '6369794482',
  whatsapp: '6369794482',
  address: 'Chennai, Tamil Nadu, India',
  instagram: 'https://instagram.com/teezo',
  facebook: 'https://facebook.com/teezo',
  youtube: 'https://youtube.com/@teezo',
} as const

export const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const CURRENCY = '₹'

export const PRINT_AREA = {
  front: { width: 30, height: 36 }, // cm
  back: { width: 30, height: 36 },
}

export const PRICING = {
  frontPrint: 149,
  backPrint: 149,
  deliveryBase: 79,
  deliveryPerExtra: 20,
  freeDeliveryAbove: 999,
}
