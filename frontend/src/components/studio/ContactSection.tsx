import { useState } from 'react'
import { ArrowRight, Phone, MessageCircle, Mail, Check } from 'lucide-react'
import { BRAND } from '../../config/brand'
import api from '../../services/api'

const ENQUIRY_TYPES = [
  'Custom T-Shirt',
  'Bulk Order',
  'Corporate Order',
  'Design Support',
  'Other'
]

const PROMISES = [
  'Custom Design Support',
  'Bulk & Corporate Orders',
  'Premium Printing',
  'Quick Response'
]

const CONTACT_CARDS = [
  { label: 'CALL US', value: BRAND.phone, icon: Phone, href: `tel:${BRAND.phone}` },
  { label: 'WHATSAPP', value: 'Chat With Us', icon: MessageCircle, href: `https://wa.me/91${BRAND.whatsapp}` },
  { label: 'EMAIL', value: BRAND.email, icon: Mail, href: `mailto:${BRAND.email}` }
]

export function ContactSection() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    company: '',
    enquiry_type: 'Custom T-Shirt',
    quantity: '',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/enquiries', form)
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-3xl p-12 text-center">
      <div className="text-5xl mb-4">✓</div>
      <h3 className="text-white font-bold text-2xl mb-3">Enquiry Sent!</h3>
      <p className="text-zinc-400 text-base">We'll get back to you within 24 hours.</p>
    </div>
  )

  return (
    <section className="relative py-28 lg:py-36 bg-zinc-950 overflow-hidden">
      {/* Ghost background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[14rem] lg:text-[18rem] font-black text-white/[0.025] whitespace-nowrap leading-none">GET IN TOUCH</span>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start mb-16 lg:mb-20">
          {/* LEFT: Studio Enquiry */}
          <div className="pr-8 lg:pr-12">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">Studio Enquiry</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-7">
              Have an Idea?<br />
              <span className="text-zinc-400">Let&apos;s Put It on a Tee.</span>
            </h2>
            <p className="text-zinc-400 text-base lg:text-lg leading-relaxed mb-10 max-w-xl">
              Whether it&apos;s a single custom tee, a bulk order, or a complete brand collection, tell us what you have in mind.
            </p>
            <ul className="space-y-4 mb-12">
              {PROMISES.map((item) => (
                <li key={item} className="flex items-center gap-4 text-zinc-300 text-base">
                  <Check size={18} className="text-green-400 shrink-0" strokeWidth={3} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT: Enquiry Form */}
          <div className="relative">
            <form onSubmit={handleSubmit} className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-3xl p-6 sm:p-8 lg:p-10 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { label: 'Full Name *', key: 'full_name', type: 'text', placeholder: 'Rahul Sharma', required: true },
                  { label: 'Phone / WhatsApp *', key: 'phone', type: 'tel', placeholder: '+91 98765 43210', required: true },
                  { label: 'Email *', key: 'email', type: 'email', placeholder: 'you@company.com', required: true },
                  { label: 'Company Name', key: 'company', type: 'text', placeholder: 'Optional', required: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-zinc-400 mb-2 block tracking-wide">{f.label}</label>
                    <input
                      type={f.type}
                      required={f.required}
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                ))}

                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-400 mb-2 block tracking-wide">Enquiry Type</label>
                  <select
                    value={form.enquiry_type}
                    onChange={e => setForm(p => ({ ...p, enquiry_type: e.target.value }))}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                  >
                    {ENQUIRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-2 block tracking-wide">Required Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    placeholder="e.g. 50"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-400 mb-2 block tracking-wide">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us about your project, timeline, and any specific requirements..."
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-xl font-semibold text-sm tracking-wide hover:bg-zinc-100 active:bg-zinc-200 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? 'Sending...' : <>Send Enquiry<ArrowRight size={16} /></>}
              </button>
            </form>
          </div>
        </div>

        {/* BOTTOM: Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          {CONTACT_CARDS.map(({ label, value, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target={label === 'WHATSAPP' ? '_blank' : undefined}
              rel={label === 'WHATSAPP' ? 'noopener noreferrer' : undefined}
              className="group relative bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 lg:p-8 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-300 overflow-hidden"
            >
              {/* Subtle gradient border on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative flex flex-col items-start gap-3">
                <div className="p-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl group-hover:border-zinc-600 group-hover:bg-zinc-800 transition-all duration-300">
                  <Icon size={20} className="text-zinc-400 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-400 transition-colors duration-300">{label}</p>
                <p className="text-white text-base lg:text-lg font-medium leading-tight group-hover:text-white transition-colors duration-300">{value}</p>
                {/* Arrow indicator */}
                <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight size={18} className="text-zinc-600 group-hover:text-zinc-400 transition-colors duration-300" strokeWidth={2} />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}