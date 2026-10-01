// Brand configuration — change brand name here only
export const BRAND = {
  name: 'PRINTHEAVEN',
  tagline: 'Design It. Wear It. Make It Yours.',
  wemail: 'hello@printheaven.com',
  phone: '6369794482',
  whatsapp: '6369794482',
  address: 'Chennai, Tamil Nadu, India',
  instagram: 'https://instagram.com/printheaven',
  facebook: 'https://facebook.com/printheaven',
  youtube: 'https://youtube.com/@printheaven',
} as const

export const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const CURRENCY = '₹'

export const PRINT_AREA = {
  front: { width: 30, height: 36 }, // cm
  back: { width: 29.7, height: 42 }, // cm — up to A3 (297 × 420 mm)
}

export const PRICING = {
  frontPrint: 149,
  backPrint: 149,
  deliveryBase: 79,
  deliveryPerExtra: 20,
  freeDeliveryAbove: 999,
}
