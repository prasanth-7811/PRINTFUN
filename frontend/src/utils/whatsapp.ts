import { BRAND, CURRENCY } from '../config/brand'

/**
 * The store's WhatsApp number in E.164 form, without the leading "+".
 * Mirrors the backend's ORDER_ALERT_PHONE (+91 96006 50612) so storefront
 * chat links and server-side order alerts always land on the same number.
 */
export const STORE_WHATSAPP = `91${BRAND.whatsapp}`

/** Human-friendly version for labels: "+91 96006 50612" */
export const STORE_WHATSAPP_DISPLAY = `+91 ${BRAND.whatsapp.replace(/(\d{5})(\d{5})/, '$1 $2')}`

/**
 * Build a wa.me deep link to the store's WhatsApp with an optional pre-filled
 * message. Everything is URL-encoded so multi-line / emoji bodies are safe.
 *
 *   waLink()                              -> https://wa.me/919600650612
 *   waLink('Hi, about my order #TZ-2024') -> https://wa.me/919600650612?text=Hi%2C...
 */
export function waLink(message?: string): string {
  const base = `https://wa.me/${STORE_WHATSAPP}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/**
 * Pre-filled message a customer can send about a specific order — used on the
 * order-success and order-detail pages so the store owner gets full context.
 */
export function orderEnquiryLink(orderNumber: string, total?: number): string {
  const lines = [
    `Hi ${BRAND.name}! I have a question about my order #${orderNumber}.`,
  ]
  if (total != null) lines.push(`Order total: ${CURRENCY}${total}`)
  return waLink(lines.join('\n'))
}
