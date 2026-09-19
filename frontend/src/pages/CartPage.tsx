import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Edit2, ShoppingBag, Tag, ArrowRight } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { CURRENCY } from '../config/brand'
import api from '../services/api'

export default function CartPage() {
  const { items, removeItem, total, count } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [coupon, setCoupon] = useState('')
  const [couponStatus, setCouponStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [discount, setDiscount] = useState(0)
  const [applying, setApplying] = useState(false)

  const applyCoupon = async () => {
    if (!coupon.trim()) return
    setApplying(true)
    try {
      const res = await api.post('/coupons/validate', { code: coupon, order_total: total })
      setDiscount(res.data.discount)
      setCouponStatus('valid')
    } catch {
      setCouponStatus('invalid')
      setDiscount(0)
    } finally {
      setApplying(false)
    }
  }

  const delivery = total >= 999 ? 0 : 79
  const finalTotal = total + delivery - discount

  if (count === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="text-center">
          <ShoppingBag size={64} className="text-zinc-200 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-zinc-900 mb-3">Your cart is empty</h2>
          <p className="text-zinc-500 text-sm mb-8">Add some custom T-shirts to get started.</p>
          <Link to="/shop" className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors">
            Shop Now <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-black text-zinc-900 mb-8">Your Cart ({count})</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-zinc-100 p-5">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
                    <img src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&q=80'} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-zinc-900 text-sm">{item.product?.name || 'Custom T-Shirt'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-4 h-4 rounded-full border border-zinc-200 inline-block" style={{ background: item.colour_hex }} />
                          <span className="text-xs text-zinc-500">{item.colour}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Link to="/design-studio" className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700">
                          <Edit2 size={14} />
                        </Link>
                        <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Sizes */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(item.sizes || {}).filter(([, q]) => q > 0).map(([size, qty]) => (
                        <span key={size} className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">
                          {size} × {qty}
                        </span>
                      ))}
                    </div>

                    {/* Design badges */}
                    <div className="flex gap-1.5 mt-2">
                      {item.front_design && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">Front Print</span>}
                      {item.back_design && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Back Print</span>}
                    </div>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="mt-4 pt-4 border-t border-zinc-50 grid grid-cols-3 gap-2 text-xs text-zinc-500">
                  <div><span className="block text-zinc-400">Base</span><span className="font-semibold text-zinc-700">{CURRENCY}{item.base_price}</span></div>
                  {item.front_print_cost > 0 && <div><span className="block text-zinc-400">Front Print</span><span className="font-semibold text-zinc-700">{CURRENCY}{item.front_print_cost}</span></div>}
                  {item.back_print_cost > 0 && <div><span className="block text-zinc-400">Back Print</span><span className="font-semibold text-zinc-700">{CURRENCY}{item.back_print_cost}</span></div>}
                  <div className="col-span-3 flex justify-end">
                    <span className="font-bold text-zinc-900 text-sm">{CURRENCY}{item.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="font-semibold text-sm text-zinc-900 mb-3 flex items-center gap-2"><Tag size={14} /> Coupon Code</h3>
              <div className="flex gap-2">
                <input value={coupon} onChange={e => { setCoupon(e.target.value); setCouponStatus('idle') }}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                <button onClick={applyCoupon} disabled={applying}
                  className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50">
                  {applying ? '...' : 'Apply'}
                </button>
              </div>
              {couponStatus === 'valid' && <p className="text-xs text-green-600 mt-2 font-medium">✓ Coupon applied! You save {CURRENCY}{discount}</p>}
              {couponStatus === 'invalid' && <p className="text-xs text-red-500 mt-2">Invalid or expired coupon code.</p>}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="font-semibold text-sm text-zinc-900 mb-4">Order Summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>{CURRENCY}{total}</span></div>
                <div className="flex justify-between text-zinc-600">
                  <span>Delivery</span>
                  <span>{delivery === 0 ? <span className="text-green-600 font-medium">Free</span> : `${CURRENCY}${delivery}`}</span>
                </div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{CURRENCY}{discount}</span></div>}
                <div className="border-t border-zinc-100 pt-2.5 flex justify-between font-bold text-zinc-900">
                  <span>Total</span>
                  <span className="text-lg">{CURRENCY}{Math.max(0, finalTotal)}</span>
                </div>
              </div>
              <button
                onClick={() => isAuthenticated ? navigate('/checkout') : navigate('/login?redirect=/checkout')}
                className="w-full mt-5 bg-black text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                Proceed to Checkout <ArrowRight size={14} />
              </button>
              <Link to="/shop" className="block text-center text-xs text-zinc-400 hover:text-zinc-700 mt-3">Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
