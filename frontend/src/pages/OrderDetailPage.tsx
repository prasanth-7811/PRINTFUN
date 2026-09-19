import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Truck, CheckCircle, Clock } from 'lucide-react'
import { orderService } from '../services/orders'
import type { Order, OrderStatus } from '../types'
import { CURRENCY } from '../config/brand'

const TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: 'placed', label: 'Order Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'design_review', label: 'Design Review' },
  { status: 'design_approved', label: 'Design Approved' },
  { status: 'printing', label: 'Printing' },
  { status: 'quality_check', label: 'Quality Check' },
  { status: 'packed', label: 'Packed' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
]

const MOCK_ORDER: Order = {
  id: 1, order_number: 'TZ-2024-001', status: 'printing', total: 1347, subtotal: 1198, delivery: 0, discount: 0,
  payment_status: 'paid', payment_method: 'upi', created_at: '2024-01-15T10:30:00Z',
  estimated_delivery: '2024-01-22', tracking_id: 'BD123456789IN', courier: 'BlueDart',
  address: { full_name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@example.com', line1: '12 MG Road', area: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' },
  items: [{ id: 1, product: { id: 1, name: 'Classic Oversized Tee', images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&q=80'] } as any, colour: 'Black', colour_hex: '#000', sizes: { M: 2, L: 1 }, base_price: 599, front_print_cost: 149, back_print_cost: 149, total: 1347 }],
  status_history: [
    { status: 'placed', timestamp: '2024-01-15T10:30:00Z' },
    { status: 'confirmed', timestamp: '2024-01-15T11:00:00Z' },
    { status: 'design_review', timestamp: '2024-01-15T14:00:00Z' },
    { status: 'design_approved', timestamp: '2024-01-16T09:00:00Z' },
    { status: 'printing', timestamp: '2024-01-16T10:00:00Z' },
  ],
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order>(MOCK_ORDER)

  useEffect(() => {
    orderService.getOrder(id!).then(setOrder).catch(() => setOrder(MOCK_ORDER))
  }, [id])

  const currentIdx = TIMELINE.findIndex(t => t.status === order.status)

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-zinc-900">Order #{order.order_number}</h1>
            <p className="text-sm text-zinc-400 mt-1">Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          {order.tracking_id && (
            <div className="text-right">
              <p className="text-xs text-zinc-400">Tracking ID</p>
              <p className="font-bold text-zinc-900 text-sm">{order.tracking_id}</p>
              <p className="text-xs text-zinc-500">{order.courier}</p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 p-6">
            <h2 className="font-bold text-zinc-900 mb-6 flex items-center gap-2"><Truck size={16} /> Order Tracking</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-100" />
              <div className="space-y-6">
                {TIMELINE.map((step, i) => {
                  const historyEntry = order.status_history.find(h => h.status === step.status)
                  const isDone = i <= currentIdx
                  const isCurrent = i === currentIdx
                  return (
                    <div key={step.status} className="flex gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                        isCurrent ? 'bg-black text-white' : isDone ? 'bg-green-500 text-white' : 'bg-zinc-100 text-zinc-400'
                      }`}>
                        {isDone && !isCurrent ? <CheckCircle size={14} /> : isCurrent ? <Clock size={14} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className={`text-sm font-semibold ${isDone ? 'text-zinc-900' : 'text-zinc-400'}`}>{step.label}</p>
                        {historyEntry && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {new Date(historyEntry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {historyEntry?.note && <p className="text-xs text-zinc-500 mt-1 bg-zinc-50 rounded-lg px-2 py-1">{historyEntry.note}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="space-y-4">
            {/* Items */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="font-semibold text-sm text-zinc-900 mb-3">Items</h3>
              {order.items.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
                    <img src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&q=80'} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{item.product?.name}</p>
                    <p className="text-xs text-zinc-400">{item.colour}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(item.sizes || {}).filter(([, q]) => q > 0).map(([s, q]) => (
                        <span key={s} className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded-full">{s}×{q}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="font-semibold text-sm text-zinc-900 mb-3">Payment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>{CURRENCY}{order.subtotal}</span></div>
                <div className="flex justify-between text-zinc-600"><span>Delivery</span><span>{order.delivery === 0 ? <span className="text-green-600">Free</span> : `${CURRENCY}${order.delivery}`}</span></div>
                <div className="flex justify-between font-bold text-zinc-900 pt-1 border-t border-zinc-100"><span>Total</span><span>{CURRENCY}{order.total}</span></div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {order.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                </span>
                <span className="text-xs text-zinc-400 capitalize">{order.payment_method}</span>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="font-semibold text-sm text-zinc-900 mb-3">Delivery Address</h3>
              <div className="text-sm text-zinc-600 space-y-0.5">
                <p className="font-semibold text-zinc-900">{order.address.full_name}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>{order.address.area}, {order.address.city}</p>
                <p>{order.address.state} - {order.address.pincode}</p>
                <p className="text-zinc-400">{order.address.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
