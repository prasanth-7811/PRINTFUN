import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Sparkles, Shield, Zap, Truck } from 'lucide-react'
import { StarRating, Accordion } from '../components/ui/index'
import { ContactSection } from '../components/studio/ContactSection'
import { CURRENCY } from '../config/brand'
import { productService } from '../services/products'
import type { Product } from '../types'

const REVIEWS = [
  { name: 'Arjun Mehta', rating: 5, text: 'Absolutely love the quality! The print came out crisp and the fabric feels premium. Will definitely order again.', verified: true },
  { name: 'Priya Sharma', rating: 5, text: 'The design studio is so easy to use. I uploaded my artwork and the final product looked exactly like the preview.', verified: true },
  { name: 'Rahul Nair', rating: 4, text: 'Great experience overall. Fast delivery and the oversized fit is perfect. Slight delay in production but worth the wait.', verified: true },
]

const FAQ_ITEMS = [
  { question: 'Can I upload my own design?', answer: 'Yes! You can upload PNG, JPG, or JPEG files up to 20MB. We recommend high-resolution files (300 DPI or above) for the best print quality.' },
  { question: 'What file formats are supported?', answer: 'We support PNG, JPG, and JPEG formats. PNG is recommended for designs with transparent backgrounds.' },
  { question: 'Can I print different designs on front and back?', answer: 'Absolutely. Our Design Studio lets you customize the front and back independently with different designs, sizes, and positions.' },
  { question: 'Can I choose different sizes in one order?', answer: 'Yes! You can add multiple size-quantity combinations in a single order. For example: M×2, L×3, XL×1 — all in one checkout.' },
  { question: 'How is printing price calculated?', answer: 'Printing cost is ₹149 per side. Front-only, back-only, or front+back options are available. The base T-shirt price is added separately.' },
  { question: 'How is delivery calculated?', answer: 'Delivery starts at ₹79 and is calculated based on your location and order quantity. Orders above ₹999 qualify for free delivery.' },
  { question: 'Can I change my design after ordering?', answer: 'Design changes are not possible after the design has been approved for printing. You can request changes during the design review stage.' },
  { question: 'How long does production take?', answer: 'Production typically takes 3–5 business days after design approval. Delivery takes an additional 2–4 business days depending on your location.' },
  { question: 'Can I track my order?', answer: 'Yes! Once your order is shipped, you will receive a tracking ID and courier details. You can track your order in real-time from your account.' },
  { question: 'Can I request a return or refund?', answer: 'Returns are accepted within 7 days of delivery for manufacturing defects or incorrect items. Custom-printed items are non-returnable unless defective.' },
]

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group bg-white rounded-2xl border border-zinc-100 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative overflow-hidden aspect-square bg-zinc-50">
        <img src={product.images?.[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {product.is_new && (
          <span className="absolute top-3 left-3 bg-black text-white text-xs font-semibold px-2.5 py-1 rounded-full">New</span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
          <Link to={`/product/${product.id}`} className="flex-1 bg-white text-black text-xs font-semibold py-2 rounded-xl text-center hover:bg-zinc-100">View</Link>
          <Link to={`/design-studio?product=${product.id}`} className="flex-1 bg-black text-white text-xs font-semibold py-2 rounded-xl text-center hover:bg-zinc-800">Customize</Link>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-zinc-400 mb-1">{product.type}</p>
        <h3 className="font-semibold text-zinc-900 text-sm mb-2">{product.name}</h3>
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={product.rating} size={12} />
          <span className="text-xs text-zinc-400">({product.review_count})</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-900">{CURRENCY}{product.base_price}</span>
          <div className="flex gap-1">
            {(product.colours || []).slice(0, 4).map((c) => (
              <span key={c.name} className="w-4 h-4 rounded-full border border-zinc-200" style={{ background: c.hex }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { data: featured = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: productService.getFeatured,
  })
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-zinc-950">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1600&q=80" alt="Hero" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <Sparkles size={14} className="text-yellow-400" />
              <span className="text-white/80 text-xs font-medium">Premium Custom Printing</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Design It.<br />
              Wear It.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Make It Yours.</span>
            </h1>
            <p className="text-zinc-300 text-lg mb-10 max-w-lg leading-relaxed">
              Create custom T-shirts that feel completely yours. Upload your design, pick your style, and wear something truly original.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/design-studio" className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors">
                Design Your T-Shirt <ArrowRight size={16} />
              </Link>
              <Link to="/shop" className="inline-flex items-center gap-2 border border-white/30 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                Shop Collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Sparkles, title: 'Custom Designs', desc: 'Create your own look with our powerful design studio.' },
              { icon: Shield, title: 'Premium Printing', desc: 'DTG & screen printing designed for lasting quality.' },
              { icon: Zap, title: 'Easy Customization', desc: 'Build your perfect T-shirt in under 5 minutes.' },
              { icon: Truck, title: 'Tracked Delivery', desc: 'Know exactly where your order is at all times.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-start gap-3 p-6 rounded-2xl bg-zinc-50 hover:bg-zinc-100 transition-colors">
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

      {/* Shop Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2 uppercase tracking-widest">Collection</p>
              <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">Shop the Collection</h2>
            </div>
            <Link to="/shop" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-black transition-colors">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {featured.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Design Your Own */}
      <section className="py-20 bg-zinc-950 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-4">Design Studio</p>
              <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
                Your Design.<br />Your Rules.
              </h2>
              <ul className="space-y-3 mb-10">
                {[
                  'Upload your own artwork or choose from our library',
                  'Customize front and back independently',
                  'Resize, rotate, and position with precision',
                  'Enter exact print dimensions in centimeters',
                  'See live print quality warnings',
                  'Watch your price update in real time',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-300 text-sm">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-green-400 text-xs">✓</span>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/design-studio" className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors">
                Open Design Studio <ArrowRight size={16} />
              </Link>
            </div>
            <div className="relative">
              <div className="aspect-square max-w-md mx-auto rounded-3xl overflow-hidden bg-zinc-800">
                <img src="https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80" alt="Design Studio" className="w-full h-full object-cover opacity-80" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl p-4 shadow-xl">
                <p className="text-xs text-zinc-400 mb-1">Live Price</p>
                <p className="text-2xl font-black text-zinc-900">{CURRENCY}897</p>
                <p className="text-xs text-green-600 font-medium">Front + Back Print</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { step: '01', title: 'Choose Your T-Shirt', desc: 'Pick from our range of premium styles and fits.' },
              { step: '02', title: 'Choose Colour & Size', desc: 'Select your preferred colour and add multiple sizes.' },
              { step: '03', title: 'Upload or Select Design', desc: 'Upload your artwork or pick from our design library.' },
              { step: '04', title: 'Customize Your Print', desc: 'Position, resize, and perfect your design on front and back.' },
              { step: '05', title: 'Order & Track', desc: 'Checkout securely and track your order every step of the way.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white rounded-2xl p-6 border border-zinc-100 hover:border-zinc-300 transition-colors">
                <span className="text-5xl font-black text-zinc-100 leading-none block mb-4">{step}</span>
                <h3 className="font-semibold text-zinc-900 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">What Our Customers Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                <StarRating rating={r.rating} />
                <p className="mt-4 text-zinc-700 text-sm leading-relaxed">"{r.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 text-sm">
                    {r.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{r.name}</p>
                    {r.verified && <p className="text-xs text-green-600 font-medium">✓ Verified Purchase</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">Frequently Asked Questions</h2>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-100 px-6">
            <Accordion items={FAQ_ITEMS} />
          </div>
        </div>
      </section>

      {/* Contact */}
      <ContactSection />
    </div>
  )
}
