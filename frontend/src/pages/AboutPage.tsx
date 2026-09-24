import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Shield, Zap, Heart } from 'lucide-react'
import { BRAND } from '../config/brand'

const VALUES = [
  { icon: Sparkles, title: 'Creativity First', desc: 'Every tee starts with an idea. Our studio gives you the tools to bring it to life exactly as you imagined it.' },
  { icon: Shield, title: 'Premium Quality', desc: 'Durable fabrics and DTG & screen printing built to survive wash after wash without cracking or fading.' },
  { icon: Zap, title: 'Fast Turnaround', desc: 'From design approval to your doorstep — production in 3–5 days with tracked delivery all the way.' },
  { icon: Heart, title: 'Customer Obsessed', desc: 'A single custom tee or a bulk corporate order — we treat every project like it is our own.' },
]

const STATS = [
  { value: '10K+', label: 'Custom Tees Printed' },
  { value: '4.8★', label: 'Average Rating' },
  { value: '500+', label: 'Businesses Served' },
  { value: '48h', label: 'Avg. Response Time' },
]

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative bg-zinc-950 py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">About {BRAND.name}</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-7">
            We Put Your Ideas<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">On a T-Shirt.</span>
          </h1>
          <p className="text-zinc-300 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            {BRAND.name} is a custom apparel studio built for creators, brands, and everyone in between.
            Upload your design, pick your style, and wear something that is unmistakably yours.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/design-studio" className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors">
              Start Designing <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 border border-white/30 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
      {/* Stats */}
      <section className="py-16 border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label} className="p-6 rounded-2xl bg-zinc-50">
                <p className="text-3xl sm:text-4xl font-black text-zinc-900 mb-2">{value}</p>
                <p className="text-sm text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-3">Our Story</p>
          <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 mb-6">Custom printing, made effortless.</h2>
          <div className="space-y-5 text-zinc-600 text-base leading-relaxed">
            <p>
              {BRAND.name} started with a simple frustration: getting a great custom tee printed was slow,
              confusing, and full of surprises at checkout. We set out to fix that with an online studio where
              what you see is exactly what you get.
            </p>
            <p>
              Today we help individuals, creators, and businesses across India turn artwork into premium apparel —
              with live print-quality feedback, transparent pricing, and delivery you can track every step of the way.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-3">What We Stand For</p>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">Our Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-start gap-3 p-6 rounded-2xl bg-white border border-zinc-100 hover:border-zinc-300 transition-colors">
                <div className="p-2.5 bg-black rounded-xl">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-zinc-900">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-zinc-950 rounded-3xl px-8 py-14 sm:px-14 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-500 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ready to make something yours?</h2>
              <p className="text-zinc-400 text-base mb-9 max-w-xl mx-auto">
                Design your own tee in minutes, or reach out and we'll help you bring your idea to life.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/design-studio" className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors">
                  Open Design Studio <ArrowRight size={16} />
                </Link>
                <Link to="/contact" className="inline-flex items-center gap-2 border border-white/30 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
