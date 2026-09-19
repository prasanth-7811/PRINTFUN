import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { orderService } from '../services/orders'
import { CURRENCY } from '../config/brand'
import type { Address } from '../types'

const STATES = ['Andhra Pradesh','Assam','Bihar','Delhi','Goa','Gujarat','Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal']

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const navigate = useNavigate()
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [address, setAddress] = useState<Address>({
    full_name: '', phone: '', email: '', line1: '', line2: '', area: '', city: '', state: 'Tamil Nadu', pincode: '', gst: '', company: '', instructions: ''
  })

  const delivery = total >= 999 ? 0 : 79
  const finalTotal = total + delivery

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setAddress(a => ({ ...a, [k]: e.target.value }))

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('payment')
  }

  const handlePayment = async () => {
    setLoading(true)
    try {
      const order = await orderService.createOrder({ address, payment_method: paymentMethod })
      await clearCart()
      navigate(`/order-success/${order.id}`)
    } catch {
      // Mock success for dev
      navigate('/order-success/mock-001')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-black text-zinc-900 mb-2">Checkout</h1>

        {/* Steps */}
        <div className="flex items-center gap-3 mb-8">
          {['address', 'payment'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (s === 'address' && step === 'payment') ? 'bg-black text-white' : 'bg-zinc-200 text-zinc-500'}`}>{i + 1}</div>
              <span className={`text-sm font-medium capitalize ${step === s ? 'text-zinc-900' : 'text-zinc-400'}`}>{s}</span>
              {i === 0 && <span className="text-zinc-300 mx-1">→</span>}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 'address' && (
              <form onSubmit={handleAddressSubmit} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4">
                <h2 className="font-bold text-lg text-zinc-900">Delivery Address</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name *', key: 'full_name', type: 'text', placeholder: 'Rahul Sharma', required: true },
                    { label: 'Mobile *', key: 'phone', type: 'tel', placeholder: '+91 98765 43210', required: true },
                    { label: 'Email *', key: 'email', type: 'email', placeholder: 'you@example.com', required: true },
                    { label: 'Company Name', key: 'company', type: 'text', placeholder: 'Optional', required: false },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label}</label>
                      <input type={f.type} required={f.required} value={address[f.key as keyof Address] as string}
                        onChange={set(f.key as keyof Address)} placeholder={f.placeholder}
                        className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Address Line 1 *</label>
                    <input required value={address.line1} onChange={set('line1')} placeholder="House/Flat No., Street"
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Address Line 2</label>
                    <input value={address.line2 || ''} onChange={set('line2')} placeholder="Landmark, Area (optional)"
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  {[
                    { label: 'Area *', key: 'area', placeholder: 'Locality / Area', required: true },
                    { label: 'City *', key: 'city', placeholder: 'Chennai', required: true },
                    { label: 'Pincode *', key: 'pincode', placeholder: '600001', required: true },
                    { label: 'GST Number', key: 'gst', placeholder: 'Optional', required: false },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label}</label>
                      <input required={f.required} value={address[f.key as keyof Address] as string}
                        onChange={set(f.key as keyof Address)} placeholder={f.placeholder}
                        className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                    </div>
                  ))}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">State *</label>
                    <select required value={address.state} onChange={set('state')}
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white">
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Special Delivery Instructions</label>
                    <textarea value={address.instructions || ''} onChange={set('instructions')} rows={2} placeholder="Any special instructions for delivery..."
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors">
                  Continue to Payment →
                </button>
              </form>
            )}

            {step === 'payment' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep('address')} className="text-sm text-zinc-500 hover:text-black">← Back</button>
                  <h2 className="font-bold text-lg text-zinc-900">Payment Method</h2>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'upi', label: 'UPI', desc: 'Pay via Google Pay, PhonePe, Paytm' },
                    { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                    { id: 'netbanking', label: 'Net Banking', desc: 'All major banks supported' },
                  ].map(m => (
                    <label key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === m.id ? 'border-black bg-zinc-50' : 'border-zinc-100 hover:border-zinc-300'}`}>
                      <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} className="text-black" />
                      <div>
                        <p className="font-semibold text-sm text-zinc-900">{m.label}</p>
                        <p className="text-xs text-zinc-400">{m.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  🔒 This is a mock payment for development. No real transaction will occur.
                </div>

                <button onClick={handlePayment} disabled={loading}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</> : `Pay ${CURRENCY}${finalTotal}`}
                </button>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 h-fit">
            <h3 className="font-semibold text-sm text-zinc-900 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                    <img src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&q=80'} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">{item.product?.name || 'Custom T-Shirt'}</p>
                    <p className="text-xs text-zinc-400">{item.colour}</p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">{CURRENCY}{item.total}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>{CURRENCY}{total}</span></div>
              <div className="flex justify-between text-zinc-600"><span>Delivery</span><span>{delivery === 0 ? <span className="text-green-600">Free</span> : `${CURRENCY}${delivery}`}</span></div>
              <div className="flex justify-between font-bold text-zinc-900 pt-1 border-t border-zinc-100"><span>Total</span><span>{CURRENCY}{finalTotal}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
