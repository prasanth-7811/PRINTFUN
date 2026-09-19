import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronRight, RotateCcw, X } from 'lucide-react'
import { orderService } from '../services/orders'
import type { Order } from '../types'
import { CURRENCY } from '../config/brand'

const STATUS_LABELS: Record<string, string> = {
  placed: 'Order Placed', confirmed: 'Confirmed', design_review: 'Design Review',
  design_approved: 'Design Approved', design_rejected: 'Design Rejected',
  printing: 'Printing', quality_check: 'Quality Check', packed: 'Packed',
  shipped: 'Shipped', out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
  cancelled: 'Cancelled', return_requested: 'Return Requested', returned: 'Returned',
  refund_requested: 'Refund Requested', refunded: 'Refunded',
}

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700', confirmed: 'bg-indigo-100 text-indigo-700',
  design_review: 'bg-yellow-100 text-yellow-700', design_approved: 'bg-green-100 text-green-700',
  design_rejected: 'bg-red-100 text-red-700', printing: 'bg-purple-100 text-purple-700',
  quality_check: 'bg-orange-100 text-orange-700', packed: 'bg-teal-100 text-teal-700',
  shipped: 'bg-cyan-100 text-cyan-700', out_for_delivery: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-zinc-100 text-zinc-600',
  return_requested: 'bg-amber-100 text-amber-700', returned: 'bg-zinc-100 text-zinc-600',
  refund_requested: 'bg-amber-100 text-amber-700', refunded: 'bg-green-100 text-green-700',
}

// Mock orders for dev
const MOCK_ORDERS: Order[] = [
  {
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
  },
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    orderService.getOrders().then(setOrders).catch(() => setOrders(MOCK_ORDERS)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>

  if (orders.length === 0) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="text-center">
        <Package size={64} className="text-zinc-200 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-zinc-900 mb-3">No orders yet</h2>
        <p className="text-zinc-500 text-sm mb-8">Your orders will appear here once you place one.</p>
        <Link to="/shop" className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800">Shop Now</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-black text-zinc-900 mb-8">My Orders</h1>
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-zinc-100 p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-bold text-zinc-900">#{order.order_number}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-zinc-100 text-zinc-600'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
                {order.items.map(item => (
                  <div key={item.id} className="shrink-0 w-14 h-14 rounded-xl bg-zinc-100 overflow-hidden">
                    <img src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&q=80'} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900">{CURRENCY}{order.total}</span>
                <div className="flex gap-2">
                  {['placed', 'confirmed', 'design_review'].includes(order.status) && (
                    <button className="flex items-center gap-1 text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
                      <X size={12} /> Cancel
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <button className="flex items-center gap-1 text-xs text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50">
                      <RotateCcw size={12} /> Return
                    </button>
                  )}
                  <Link to={`/orders/${order.id}`} className="flex items-center gap-1 text-xs font-semibold bg-black text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800">
                    Track <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
