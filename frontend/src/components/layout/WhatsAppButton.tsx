import { MessageCircle } from 'lucide-react'
import { BRAND } from '../../config/brand'
import { waLink } from '../../utils/whatsapp'

const WHATSAPP_TEXT = `Hi ${BRAND.name}! I'd like to know more about your custom t-shirts.`

/**
 * Floating WhatsApp chat button bound to the store number in utils/whatsapp.ts.
 * Sits above the footer on every storefront page.
 */
export default function WhatsAppButton() {
  return (
    <a
      href={waLink(WHATSAPP_TEXT)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 group"
    >
      {/* Pulse ring rendered behind the button */}
      <span className="absolute inset-0 rounded-full bg-green-500 opacity-60 animate-ping pointer-events-none" />
      <span className="relative flex items-center gap-2.5 bg-green-500 group-hover:bg-green-600 text-white pl-3.5 pr-4 py-3 rounded-full shadow-lg shadow-green-500/30 transition-all duration-200 group-hover:scale-105">
        <MessageCircle size={22} className="shrink-0" fill="currentColor" strokeWidth={0} />
        <span className="text-sm font-semibold tracking-wide hidden sm:inline">Chat with us</span>
      </span>
    </a>
  )
}
