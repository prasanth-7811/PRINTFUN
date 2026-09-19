import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, ShieldCheck, Truck, RotateCcw, Star } from 'lucide-react'
import { StarRating } from '../components/ui/index'
import { CURRENCY } from '../config/brand'

const MOCK_PRODUCT = {
  id: 1,
  name: 'Classic Oversized Tee',
  type: 'Oversized',
  price: 599,
  rating: 4.8,
  reviews: 124,
  description: 'Our signature oversized tee is crafted from 100% premium ring-spun cotton. The relaxed drop-shoulder silhouette gives you that effortlessly cool streetwear look. Perfect for custom prints — the large flat surface area ensures your design stands out.',
  material: '100% Ring-Spun Cotton, 220 GSM',
  fit: 'Oversized / Drop Shoulder',
  images: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80',
  ],
  colours: [
    { name: 'Black', hex: '#000000', stock: { S: 10, M: 15, L: 8, XL: 5, XXL: 3 } },
    { name: 'White', hex: '#ffffff', stock: { S: 12, M: 20, L: 10, XL: 7, XXL: 2 } },
    { name: 'Grey', hex: '#9ca3af', stock: { S: 5, M: 8, L: 4, XL: 2, XXL: 0 } },
    { name: 'Navy', hex: '#1e3a5f', stock: { S: 8, M: 12, L: 6, XL: 4, XXL: 1 } },
  ],
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
}

const MOCK_REVIEWS = [
  { name: 'Arjun Mehta', rating: 5, text: 'Perfect fit and the print quality is outstanding. Ordered 3 pieces for my team.', date: '2 weeks ago', verified: true },
  { name: 'Sneha Patel', rating: 5, text: 'The fabric is so soft and the oversized fit is exactly what I wanted. Will order more!', date: '1 month ago', verified: true },
  { name: 'Karan Singh', rating: 4, text: 'Great quality tee. The design studio made it super easy to customize. Delivery was on time.', date: '1 month ago', verified: true },
]

export default function ProductPage() {
  const product = MOCK_PRODUCT
  const [activeImage, setActiveImage] = useState(0)
  const [selectedColour, setSelectedColour] = useState(product.colours[0])
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({})
  const [wishlisted, setWishlisted] = useState(false)

  const totalQty = Object.values(sizeQty).reduce((a, b) => a + b, 0)

  const updateQty = (size: string, delta: number) => {
    setSizeQty(prev => {
      const current = prev[size] || 0
      const next = Math.max(0, current + delta)
      const stock = selectedColour.stock[size as keyof typeof selectedColour.stock] || 0
      return { ...prev, [size]: Math.min(next, stock) }
    })
  }

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
              <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${activeImage === i ? 'border-black' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
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
              <span className="text-sm text-zinc-500">{product.rating} ({product.reviews} reviews)</span>
            </div>

            <div className="text-3xl font-black text-zinc-900 mb-6">{CURRENCY}{product.price}</div>

            <p className="text-zinc-600 text-sm leading-relaxed mb-6">{product.description}</p>

            <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">Material</p>
                <p className="font-medium text-zinc-800">{product.material}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-zinc-400 text-xs mb-1">Fit</p>
                <p className="font-medium text-zinc-800">{product.fit}</p>
              </div>
            </div>

            {/* Colour */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-zinc-900 mb-3">Colour: <span className="font-normal text-zinc-500">{selectedColour.name}</span></p>
              <div className="flex gap-2">
                {product.colours.map(c => (
                  <button key={c.name} onClick={() => { setSelectedColour(c); setSizeQty({}) }} title={c.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColour.name === c.name ? 'border-black scale-110' : 'border-zinc-200 hover:border-zinc-400'}`}
                    style={{ background: c.hex }} />
                ))}
              </div>
            </div>

            {/* Sizes + Qty */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-zinc-900 mb-3">Select Sizes & Quantities</p>
              <div className="space-y-2">
                {product.sizes.map(size => {
                  const stock = selectedColour.stock[size as keyof typeof selectedColour.stock] || 0
                  const qty = sizeQty[size] || 0
                  return (
                    <div key={size} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${qty > 0 ? 'border-black bg-zinc-50' : 'border-zinc-100'} ${stock === 0 ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-10 text-sm font-semibold text-zinc-900">{size}</span>
                        {stock <= 3 && stock > 0 && <span className="text-xs text-amber-600 font-medium">Only {stock} left</span>}
                        {stock === 0 && <span className="text-xs text-red-500">Out of stock</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(size, -1)} disabled={qty === 0 || stock === 0} className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-sm font-bold hover:bg-zinc-100 disabled:opacity-30">−</button>
                        <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                        <button onClick={() => updateQty(size, 1)} disabled={qty >= stock || stock === 0} className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-sm font-bold hover:bg-zinc-100 disabled:opacity-30">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {totalQty > 0 && <p className="text-xs text-zinc-500 mt-2">Total: {totalQty} piece{totalQty > 1 ? 's' : ''}</p>}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                to={`/design-studio?product=${product.id}&colour=${encodeURIComponent(selectedColour.name)}`}
                className="flex-1 bg-black text-white py-3.5 rounded-xl font-semibold text-sm text-center hover:bg-zinc-800 transition-colors"
              >
                Customize This T-Shirt
              </Link>
              <button disabled={totalQty === 0} className="flex-1 border-2 border-black text-black py-3.5 rounded-xl font-semibold text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Add to Cart
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
