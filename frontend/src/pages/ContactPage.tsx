import { Link } from 'react-router-dom'
import { Info, MessageCircle, MapPin } from 'lucide-react'
import { ContactSection } from '../components/studio/ContactSection'
import { BRAND } from '../config/brand'

export default function ContactPage() {
  return (
    <div className="bg-zinc-950">
      {/* Page header */}
      <section className="relative bg-zinc-950 pt-20 pb-2 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
            Contact {BRAND.name}
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6">
            Get in Touch
          </h1>
          <p className="text-zinc-400 text-base lg:text-lg max-w-2xl mx-auto mb-4">
            Questions about custom orders, bulk pricing, or your design? Our team is here to help.
          </p>
          <p className="inline-flex items-center gap-2 text-zinc-500 text-sm mb-9">
            <MapPin size={15} /> {BRAND.address}
          </p>

          {/* About + Contact buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 border border-white/20 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              <Info size={18} /> About Us
            </Link>
            <a
              href="#enquiry"
              className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors"
            >
              <MessageCircle size={18} /> Contact
            </a>
          </div>
        </div>
      </section>

      {/* Enquiry form + contact cards */}
      <div id="enquiry" className="scroll-mt-16">
        <ContactSection />
      </div>
    </div>
  )
}
