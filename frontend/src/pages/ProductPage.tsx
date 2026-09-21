import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, ShieldCheck, Truck, RotateCcw, Star } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { StarRating } from '../components/ui/index'
import { CURRENCY } from '../config/brand'
import { productService } from '../services/products'
import type { Product, ProductVariant, Audience } from '../types'

const MOCK_REVIEWS = [
  { name: 'Arjun Mehta', rating: 5, text: 'Perfect fit and the print quality is outstanding. Ordered 3 pieces for my team.', date: '2 weeks ago', verified: true },
  { name: 'Sneha Patel', rating: 5, text: 'The fabric is so soft and the oversized fit is exactly what I wanted. Will order more!', date: '1 month ago', verified: true },
  { name: 'Karan Singh', rating: 4, text: 'Great quality tee. The design studio made it super easy to customize. Delivery was on time.', date: '1 month ago', verified: true },
]

export default function ProductPage() {
  const { id } = useParams()
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProduct(id!),
    enabled: !!id,
  })

  const [activeImage, setActiveImage] = useState(0)
  const [audience, setAudience] = useState<Audience>('adults')
  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [selectedColour, setSelectedColour] = useState<string>('')
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({})
  const [wishlisted, setWishlisted] = useState(false)

  // Reset selection whenever the product or audience changes.
  useEffect(() => {
    if (!product) return
    const first = product.variants.find(v => v.audience === audience && v.is_active) || null
    setVariant(first)
    setSelectedColour(first?.colours?.[0]?.name || '')
    setSizeQty({})
    setActiveImage(0)
  }, [product?.id, audience])

  const totalQty = Object.values(sizeQty).reduce((a, b) => a + b, 0)

  if (isLoading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square bg-zinc-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-zinc-100 rounded w-2/3" />
            <div className="h-6 bg-zinc-100 rounded w-1/3" />
            <div className="h-24 bg-zinc-100 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const images = variant?.images?.length ? variant.images : product.images
  const availableAudiences = product.audiences || ['adults']
  const variantColourObjects = variant?.colours || []
  const variantSizes = variant?.sizes || []

  // A kids variant with no sizes/price is "contact for pricing", not buyable.
  const unconfigured = !variant || !variant.configured
  const comingSoon = product.coming_soon || !!variant?.coming_soon

  const updateQty = (size: string, delta: number) => {
    setSizeQty(prev => {
      const current = prev[size] || 0
      return { ...prev, [size]: Math.max(0, current + delta) }
    })
  }

  const customizeLink = variant
    ? `/design-studio?product=${product.id}&variant=${variant.id}&colour=${encodeURIComponent(selectedColour)}&audience=${audience}`
    : `/design-studio?product=${product.id}&audience=${audience}`

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-zinc-400 mb-8">
          <Link to="/" className="hover:text-zinc-700">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-zinc-700">Shop</Link>
          <span>/</span>
          <span className="text-zinc-700">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-50">
              {images?.[activeImage] && (
                <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
              )}
            </div>
            {images && images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${activeImage === i ? 'border-black' : 'border-transparent'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-zinc-400 mb-1">{product.type}</p>
                <h1 className="text-3xl font-black text-zinc-900">{product.name}</h1>
              </div>
              <button onClick={() => setWishlisted(!wishlisted)} className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors">
                <Heart size={18} fill={wishlisted ? '#ef4444' : 'none'} stroke={wishlisted ? '#ef4444' : 'currentColor'} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <StarRating rating={product.rating} />
              <span className="text-sm text-zinc-500">{product.rating} ({product.review_count} reviews)</span>
            </div>

            <div className="text-3xl font-black text-zinc-900 mb-2">
              {unconfigured || comingSoon
                ? 'Contact for Pricing'
                : <>{CURRENCY}{variant?.price}<span className="text-sm font-normal text-zinc-400"> / piece</span></>}
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Starting at {CURRENCY}{product.base_price} · Custom print charges extra
            </p>

            <p className="text-zinc-600 text-sm leading-relaxed mb-6">{product.description}</p>

            {/* Audience switch */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-zinc-900 mb-3">Available For</p>
              <div className="flex gap-2">
                {availableAudiences.map(a => (
                  <button key={a} onClick={() => setAudience(a as Audience)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${audience === a ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                    {a === 'kids' ? 'Kids' : 'Adults'}
                  </button>
                ))}
              </div>
            </div>

            {/* Variant picker */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-zinc-900 mb-3">Choose Variant</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.filter(v => v.audience === audience).map(v => (
                  <button key={v.id} onClick={() => { setVariant(v); setSelectedColour(v.colours?.[0]?.name || ''); setSizeQty({}) }}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors text-left ${variant?.id === v.id ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Spec grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">Fabric</p>
                <p className="font-medium text-zinc-800">{variant?.fabric || 'Not specified'}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">GSM</p>
                <p className="font-medium text-zinc-800">{variant?.gsm ? `${variant.gsm} GSM` : 'Not specified'}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">Material</p>
                <p className="font-medium text-zinc-800">{variant?.material || product.material || 'Not specified'}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">Fit</p>
                <p className="font-medium text-zinc-800">{product.fit || 'Regular Fit'}</p>
              </div>
            </div>

            {unconfigured ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {audience === 'kids' ? 'Contact for Kids Pricing' : 'Coming Soon'}
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {audience === 'kids'
                    ? 'Kids sizes and pricing for this product are being finalised. Call or WhatsApp us and we’ll quote you immediately.'
                    : 'This variant is on its way. Check back soon.'}
                </p>
                <a href={`tel:+91${'6369794482'}`} className="inline-block mt-3 text-xs font-semibold text-black underline">
                  Call +91 6369794482 for pricing
                </a>
              </div>
            ) : (
              <>
                {/* Colour */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-zinc-900 mb-3">Colour: <span className="font-normal text-zinc-500">{selectedColour}</span></p>
                  <div className="flex gap-2">
                    {variantColourObjects.map(c => (
                      <button key={c.name} onClick={() => { setSelectedColour(c.name); setSizeQty({}) }} title={c.name}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColour === c.name ? 'border-black scale-110' : 'border-zinc-200 hover:border-zinc-400'}`}
                        style={{ background: c.hex }} />
                    ))}
                  </div>
                </div>

                {/* Sizes + Qty */}
                <div className="mb-8">
                  <p className="text-sm font-semibold text-zinc-900 mb-3">Select Sizes & Quantities</p>
                  <div className="space-y-2">
                    {variantSizes.map(size => {
                      const qty = sizeQty[size] || 0
                      return (
                        <div key={size} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${qty > 0 ? 'border-black bg-zinc-50' : 'border-zinc-100'}`}>
                          <span className="w-10 text-sm font-semibold text-zinc-900">{size}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQty(size, -1)} disabled={qty === 0} className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-sm font-bold hover:bg-zinc-100 disabled:opacity-30">−</button>
                            <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                            <button onClick={() => updateQty(size, 1)} className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-sm font-bold hover:bg-zinc-100">+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {totalQty > 0 && <p className="text-xs text-zinc-500 mt-2">Total: {totalQty} piece{totalQty > 1 ? 's' : ''}</p>}
                </div>
              </>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                to={customizeLink}
                className="flex-1 bg-black text-white py-3.5 rounded-xl font-semibold text-sm text-center hover:bg-zinc-800 transition-colors"
              >
                Customize This {product.type === 'Hoodies' ? 'Hoodie' : 'T-Shirt'}
              </Link>
              <button
                disabled={unconfigured || comingSoon || totalQty === 0}
                className="flex-1 border-2 border-black text-black py-3.5 rounded-xl font-semibold text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {unconfigured ? 'Not Available' : 'Add to Cart'}
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-500" /> Secure Checkout</div>
              <div className="flex items-center gap-1.5"><Truck size={14} className="text-blue-500" /> Free delivery above ₹999</div>
              <div className="flex items-center gap-1.5"><RotateCcw size={14} className="text-purple-500" /> 7-day return policy</div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-16 border-t border-zinc-100 pt-12">
          <h2 className="text-2xl font-black text-zinc-900 mb-8">Customer Reviews</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {MOCK_REVIEWS.map(r => (
              <div key={r.name} className="bg-zinc-50 rounded-2xl p-5">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s <= r.rating ? '#f59e0b' : 'none'} stroke="#f59e0b" />)}
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed mb-4">"{r.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold">{r.name[0]}</div>
                    <span className="text-sm font-semibold text-zinc-900">{r.name}</span>
                  </div>
                  <span className="text-xs text-zinc-400">{r.date}</span>
                </div>
                {r.verified && <p className="text-xs text-green-600 font-medium mt-2">✓ Verified Purchase</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
