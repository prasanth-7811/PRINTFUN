import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Package, ArrowRight, MessageCircle } from 'lucide-react'
import { STORE_WHATSAPP_DISPLAY, orderEnquiryLink } from '../utils/whatsapp'

export default function OrderSuccessPage() {
  const { id } = useParams()

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 mb-3">Order Placed Successfully!</h1>
        <p className="text-zinc-500 text-sm mb-2">Thank you for your order. We'll review your design and start production soon.</p>
        <div className="inline-flex items-center gap-2 bg-zinc-100 rounded-full px-4 py-2 text-sm font-semibold text-zinc-700 mb-8">
          <Package size={14} />
          Order ID: #{id}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-6 text-left">
          <h3 className="font-semibold text-zinc-900 mb-4">What happens next?</h3>          <div className="space-y-3">
            {[
              { step: '1', title: 'Design Review', desc: 'Our team will review your design within 24 hours.' },
              { step: '2', title: 'Production', desc: 'Once approved, your T-shirt goes into printing.' },
              { step: '3', title: 'Quality Check', desc: 'Every order is inspected before packing.' },
              { step: '4', title: 'Delivery', desc: 'Shipped and delivered within 5–7 business days.' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{s.title}</p>
                  <p className="text-xs text-zinc-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp support — fastest way to reach the store about this order */}
        <a
          href={orderEnquiryLink(String(id || ''))}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-2xl font-semibold text-sm transition-colors mb-3"
        >
          <MessageCircle size={18} fill="currentColor" strokeWidth={0} />
          Contact us on WhatsApp · {STORE_WHATSAPP_DISPLAY}
        </a>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={`/orders/${id}`} className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors">
            Track Order <ArrowRight size={14} />
          </Link>
          <Link to="/shop" className="inline-flex items-center justify-center gap-2 border border-zinc-200 text-zinc-700 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-50 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
