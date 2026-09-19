import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Truck, CheckCircle, Clock, Package, X } from 'lucide-react'
import { CURRENCY } from '../../config/brand'

const MOCK_ORDER = {
  id: 'TZ-2024-312', customer: 'Priya Sharma', phone: '9876543210', email: 'priya@example.com',
  amount: 1347, subtotal: 1198, delivery: 79, discount: 0, status: 'design_review',
  date: '2024-01-20T10:30:00Z', payment: 'paid', payment_method: 'upi',
  tracking_id: '', courier: '',
  address: { full_name: 'Priya Sharma', phone: '9876543210', line1: '12 MG Road', area: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' },
  items: [
    { id: 1, name: 'Classic Oversized Tee', colour: 'Black', sizes: { M: 1, L: 1 }, base_price: 599, front_print: 149, back_print: 149, total: 1347, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&q=80' },
  ],
  timeline: [
    { status: 'placed', label: 'Order Placed', time: '2024-01-20T10:30:00Z', done: true },
    { status: 'confirmed', label: 'Confirmed', time: '2024-01-20T11:00:00Z', done: true },
    { status: 'design_review', label: 'Design Review', time: '2024-01-20T14:00:00Z', done: true },
    { status: 'design_approved', label: 'Design Approved', time: null, done: false },
    { status: 'printing', label: 'Printing', time: null, done: false },
    { status: 'quality_check', label: 'Quality Check', time: null, done: false },
    { status: 'packed', label: 'Packed', time: null, done: false },
    { status: 'shipped', label: 'Shipped', time: null, done: false },
    { status: 'delivered', label: 'Delivered', time: null, done: false },
  ],
}

const ALL_STATUSES = ['placed', 'confirmed', 'design_review', 'design_approved', 'design_rejected',
  'printing', 'quality_check', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned']

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700', confirmed: 'bg-indigo-100 text-indigo-700',
  design_review: 'bg-yellow-100 text-yellow-700', design_approved: 'bg-green-100 text-green-700',
  design_rejected: 'bg-red-100 text-red-700', printing: 'bg-purple-100 text-purple-700',
  quality_check: 'bg-orange-100 text-orange-700', packed: 'bg-teal-100 text-teal-700',
  shipped: 'bg-cyan-100 text-cyan-700', out_for_delivery: 'bg-sky-100 text-sky-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-zinc-100 text-zinc-500',
  returned: 'bg-red-100 text-red-600',
}

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(MOCK_ORDER)
  const [showModal, setShowModal] = useState(false)
  const [newStatus, setNewStatus] = useState(order.status)
  const [trackingId, setTrackingId] = useState(order.tracking_id)
  const [courier, setCourier] = useState(order.courier)
  const [note, setNote] = useState('')

  const handleUpdateStatus = () => {
    setOrder(prev => ({ ...prev, status: newStatus, tracking_id: trackingId, courier }))
    setShowModal(false)
    setNote('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/orders" className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Order #{id || order.id}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${STATUS_COLORS[order.status] || 'bg-zinc-100 text-zinc-600'}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          <button onClick={() => setShowModal(true)} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors">
            Update Status
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <h2 className="font-bold text-zinc-900 mb-5 flex items-center gap-2"><Truck size={15} /> Order Timeline</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-100" />
              <div className="space-y-5">
                {order.timeline.map((step, i) => {
                  const isCurrent = step.status === order.status
                  return (
                    <div key={step.status} className="flex gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${isCurrent ? 'bg-black text-white' : step.done ? 'bg-green-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                        {step.done && !isCurrent ? <CheckCircle size={14} /> : isCurrent ? <Clock size={14} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <p className={`text-sm font-semibold ${step.done ? 'text-zinc-900' : 'text-zinc-400'}`}>{step.label}</p>
                        {step.time && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {new Date(step.time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <h2 className="font-bold text-zinc-900 mb-4 flex items-center gap-2"><Package size={15} /> Order Items</h2>
            <div className="space-y-4">
              {order.items.map(item => (
                <div key={item.id} className="flex gap-4 p-4 bg-zinc-50 rounded-xl">
                  <img src={item.image} alt="" className="w-16 h-16 rounded-xl object-cover bg-zinc-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900">{item.name}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">Colour: {item.colour}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(item.sizes).filter(([, q]) => q > 0).map(([s, q]) => (
                        <span key={s} className="text-xs bg-white border border-zinc-200 px-2 py-0.5 rounded-full">{s} × {q}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-zinc-900">{CURRENCY}{item.total}</p>
                    <p className="text-xs text-zinc-400 mt-1">Base: {CURRENCY}{item.base_price}</p>
                    {item.front_print > 0 && <p className="text-xs text-zinc-400">Front: +{CURRENCY}{item.front_print}</p>}
                    {item.back_print > 0 && <p className="text-xs text-zinc-400">Back: +{CURRENCY}{item.back_print}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{CURRENCY}{order.subtotal}</span></div>
              <div className="flex justify-between text-zinc-500"><span>Delivery</span><span>{order.delivery === 0 ? <span className="text-green-600">Free</span> : `${CURRENCY}${order.delivery}`}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{CURRENCY}{order.discount}</span></div>}
              <div className="flex justify-between font-bold text-zinc-900 pt-1 border-t border-zinc-100"><span>Total</span><span>{CURRENCY}{order.amount}</span></div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <h3 className="font-semibold text-sm text-zinc-900 mb-3">Customer</h3>
            <p className="font-semibold text-zinc-900">{order.customer}</p>
            <p className="text-sm text-zinc-500 mt-1">{order.phone}</p>
            <p className="text-sm text-zinc-500">{order.email}</p>
            <div className="flex gap-2 mt-3">
              <a href={`tel:${order.phone}`} className="flex-1 text-center text-xs font-semibold py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Call</a>
              <a href={`https://wa.me/91${order.phone}`} target="_blank" rel="noreferrer" className="flex-1 text-center text-xs font-semibold py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors">WhatsApp</a>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <h3 className="font-semibold text-sm text-zinc-900 mb-3">Delivery Address</h3>
            <div className="text-sm text-zinc-600 space-y-0.5">
              <p className="font-semibold text-zinc-900">{order.address.full_name}</p>
              <p>{order.address.line1}</p>
              <p>{order.address.area}, {order.address.city}</p>
              <p>{order.address.state} - {order.address.pincode}</p>
              <p className="text-zinc-400">{order.address.phone}</p>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5">
            <h3 className="font-semibold text-sm text-zinc-900 mb-3">Payment</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${order.payment === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {order.payment === 'paid' ? 'Paid' : 'Pending'}
              </span>
              <span className="text-sm text-zinc-500 capitalize">{order.payment_method}</span>
            </div>
          </div>

          {/* Tracking */}
          {(order.tracking_id || order.courier) && (
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="font-semibold text-sm text-zinc-900 mb-3">Shipping</h3>
              {order.courier && <p className="text-sm text-zinc-600">Courier: <span className="font-semibold">{order.courier}</span></p>}
              {order.tracking_id && <p className="text-sm text-zinc-600 mt-1">Tracking: <span className="font-semibold font-mono">{order.tracking_id}</span></p>}
            </div>
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-zinc-900">Update Order Status</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">New Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white capitalize">
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              {(newStatus === 'shipped' || newStatus === 'out_for_delivery') && (
                <>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Courier</label>
                    <input value={courier} onChange={e => setCourier(e.target.value)} placeholder="BlueDart, Delhivery..."
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Tracking ID</label>
                    <input value={trackingId} onChange={e => setTrackingId(e.target.value)} placeholder="BD123456789IN"
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Note (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add a note..."
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50">Cancel</button>
                <button onClick={handleUpdateStatus} className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800">Update</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
