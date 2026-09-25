// Brand configuration — change brand name here only.
// Every value here is consumed by mail templates, the footer, the navbar and
// the email footer, so keep it as the single source of truth.
export const BRAND = {
  name: 'TEEZO',
  tagline: 'Design It. Wear It. Make It Yours.',
  email: 'hello@teezo.com',
  phone: '9600650612',
  whatsapp: '9600650612',
  address: 'Chennai, Tamil Nadu, India',
  instagram: 'https://instagram.com/teezo',
  facebook: 'https://facebook.com/teezo',
  youtube: 'https://youtube.com/@teezo',
} as const

// API base URL. `import.meta.env` is a Vite injection that is undefined under
// plain Node (e.g. when running the link smoke check), so read it defensively;
// behaviour under Vite is unchanged.
const _VITE_API_URL = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL
export const API_BASE = _VITE_API_URL || '/api'

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

// Sender identity used by the backend's email templates. Mirrors the
// MAIL_FROM / SUPPORT_EMAIL env vars — keep both in sync when rebranding.
export const MAIL = {
  from: `${BRAND.name} <noreply@${BRAND.name.toLowerCase()}.com>`,
  support: BRAND.email,
}
