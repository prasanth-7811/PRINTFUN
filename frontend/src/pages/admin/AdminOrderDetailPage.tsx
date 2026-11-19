import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Truck,
  CheckCircle,
  Clock,
  Package,
  X,
  MessageCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { CURRENCY } from '../../config/brand'
import { STORE_WHATSAPP_DISPLAY } from '../../utils/whatsapp'
import { orderService } from '../../services/orders'
import type { Order, OrderStatus } from '../../types'

const ALL_STATUSES: OrderStatus[] = [
  'placed',
  'confirmed',
  'design_review',
  'design_approved',
  'design_rejected',
  'printing',
  'quality_check',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  design_review: 'bg-yellow-100 text-yellow-700',
  design_approved: 'bg-green-100 text-green-700',
  design_rejected: 'bg-red-100 text-red-700',
  printing: 'bg-purple-100 text-purple-700',
  quality_check: 'bg-orange-100 text-orange-700',
  packed: 'bg-teal-100 text-teal-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  out_for_delivery: 'bg-sky-100 text-sky-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
}

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'placed', label: 'Order Placed' },
  { status: 'confirmed', label: 'Order Confirmed' },
  { status: 'design_review', label: 'Design Review' },
  { status: 'design_approved', label: 'Design Approved' },
  { status: 'printing', label: 'Printing Production' },
  { status: 'quality_check', label: 'Quality Check' },
  { status: 'packed', label: 'Packed' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' },
]

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<OrderStatus>('placed')
  const [trackingId, setTrackingId] = useState('')
  const [courier, setCourier] = useState('')
  const [note, setNote] = useState('')

  const loadOrder = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await orderService.getAdminOrder(id)
      setOrder(data)
      setNewStatus(data.status)
      setTrackingId(data.tracking_id || '')
      setCourier(data.courier || '')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load order details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [id])

  const handleUpdateStatus = async () => {
    if (!id || !order) return
    setUpdating(true)
    try {
      const updated = await orderService.updateOrderStatus(id, {
        status: newStatus,
        tracking_id: trackingId.trim() || undefined,
        courier: courier.trim() || undefined,
        note: note.trim() || undefined,
      })
      setOrder(updated)
      setShowModal(false)
      setNote('')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update order status.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-3 text-zinc-400" />
        <p className="text-sm text-zinc-500 font-medium">Loading live order details...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-black">
          <ArrowLeft size={16} /> Back to orders
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600">
          <AlertCircle size={28} className="mx-auto mb-2 text-red-500" />
          <h2 className="font-bold text-base">Order Not Found</h2>
          <p className="text-xs text-red-500 mt-1">{error || 'Order record could not be located.'}</p>
        </div>
      </div>
    )
  }

  const customerName = order.address?.full_name || 'Customer'
  const customerPhone = order.address?.phone || ''
  const customerEmail = order.address?.email || ''
  const orderNumber = order.order_number || String(order.id)

  const currentStepIdx = TIMELINE_STEPS.findIndex((s) => s.status === order.status)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/orders" className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-zinc-900">Order #{orderNumber}</h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] || 'bg-zinc-100 text-zinc-600'}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Placed on {order.created_at ? new Date(order.created_at).toLocaleString('en-IN') : 'Recently'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewStatus(order.status)
              setTrackingId(order.tracking_id || '')
              setCourier(order.courier || '')
              setShowModal(true)
            }}
            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Update Fulfillment Status
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Timeline & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <h2 className="font-bold text-zinc-900 mb-5 flex items-center gap-2 text-sm">
              <Truck size={16} /> Fulfillment Timeline
            </h2>
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-zinc-100" />
              <div className="space-y-4">
                {TIMELINE_STEPS.map((step, idx) => {
                  const isDone = currentStepIdx >= idx
                  const isCurrent = step.status === order.status
                  const historyEntry = order.status_history?.find((h) => h.status === step.status)

                  return (
                    <div key={step.status} className="flex gap-4 relative">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                          isCurrent
                            ? 'bg-black text-white ring-4 ring-black/10'
                            : isDone
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-100 text-zinc-400'
                        }`}
                      >
                        {isDone && !isCurrent ? (
                          <CheckCircle size={14} />
                        ) : isCurrent ? (
                          <Clock size={14} />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <p className={`text-sm font-semibold ${isDone ? 'text-zinc-900' : 'text-zinc-400'}`}>
                          {step.label}
                        </p>
                        {historyEntry && (
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {historyEntry.timestamp || (historyEntry as any).created_at
                              ? new Date(historyEntry.timestamp || (historyEntry as any).created_at).toLocaleString('en-IN')
                              : ''}
                            {historyEntry.note && ` — "${historyEntry.note}"`}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <h2 className="font-bold text-zinc-900 mb-4 flex items-center gap-2 text-sm">
              <Package size={16} /> Customized Items ({order.items?.length || 0})
            </h2>

            <div className="space-y-4">
              {order.items?.map((item) => {
                const prod = (item.product as any) || {}
                const img = prod.images?.[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=120&q=80'
                const qty = Object.values(item.sizes || {}).reduce((a, b) => a + b, 0) || 1

                return (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <img
                      src={img}
                      alt={prod.name || 'Product'}
                      className="w-20 h-20 rounded-xl object-cover bg-zinc-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-zinc-900">{prod.name || 'Custom Garment'}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                        <span>Colour: <strong className="text-zinc-800">{item.colour}</strong></span>
                        <span>•</span>
                        <span>Total Qty: <strong className="text-zinc-800">{qty}</strong></span>
                      </div>

                      {/* Sizes Breakdown */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(item.sizes || {})
                          .filter(([, q]) => Number(q) > 0)
                          .map(([s, q]) => (
                            <span key={s} className="text-xs font-semibold bg-white border border-zinc-200 px-2 py-0.5 rounded-lg shadow-2xs">
                              {s} × {q}
                            </span>
                          ))}
                      </div>

                      {/* Artwork Print Options */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-200/60 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                        {item.print_option_id && (
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium">
                            Print: {item.print_option_id.replace(/_/g, ' ')}
                          </span>
                        )}
                        {item.front_print_cost > 0 && <span>Front: +{CURRENCY}{item.front_print_cost}</span>}
                        {item.back_print_cost > 0 && <span>Back: +{CURRENCY}{item.back_print_cost}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-sm text-zinc-900">{CURRENCY}{item.total}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Base: {CURRENCY}{item.base_price}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Price Breakdown */}
            <div className="mt-5 pt-4 border-t border-zinc-100 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>{CURRENCY}{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Courier Delivery</span>
                <span>{order.delivery === 0 ? <span className="text-emerald-600 font-semibold">Free</span> : `${CURRENCY}${order.delivery}`}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{CURRENCY}{order.discount}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base text-zinc-900 pt-2 border-t border-zinc-100">
                <span>Grand Total</span>
                <span>{CURRENCY}{order.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Details, Address, Shipping */}
        <div className="space-y-4">
          {/* Customer Card */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-3">Customer Details</h3>
            <p className="font-bold text-sm text-zinc-900">{customerName}</p>
            {customerPhone && <p className="text-xs text-zinc-500 mt-1">{customerPhone}</p>}
            {customerEmail && <p className="text-xs text-zinc-500">{customerEmail}</p>}

            <div className="flex gap-2 mt-4">
              {customerPhone && (
                <>
                  <a
                    href={`tel:${customerPhone}`}
                    className="flex-1 text-center text-xs font-semibold py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Call
                  </a>
                  <a
                    href={`https://wa.me/91${String(customerPhone).replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center text-xs font-semibold py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <MessageCircle size={13} />
                    WhatsApp
                  </a>
                </>
              )}
            </div>

            <p className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
              New order notifications routed to WhatsApp: <strong className="text-zinc-700">{STORE_WHATSAPP_DISPLAY}</strong>
            </p>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-3">Shipping Address</h3>
            {order.address ? (
              <div className="text-xs text-zinc-600 space-y-1 leading-relaxed">
                <p className="font-bold text-zinc-900">{order.address.full_name}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
                <p className="text-zinc-500">Phone: {order.address.phone}</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No address on file</p>
            )}
          </div>

          {/* Payment & Courier Tracking */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm space-y-3">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-2">Payment Details</h3>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    order.payment_status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {order.payment_status || 'unpaid'}
                </span>
                <span className="text-xs text-zinc-600 font-medium capitalize">
                  {order.payment_method || 'UPI'}
                </span>
              </div>
            </div>

            {(order.tracking_id || order.courier) && (
              <div className="pt-3 border-t border-zinc-100">
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-2">Courier Tracking</h3>
                {order.courier && (
                  <p className="text-xs text-zinc-600">
                    Courier: <strong className="text-zinc-900">{order.courier}</strong>
                  </p>
                )}
                {order.tracking_id && (
                  <p className="text-xs text-zinc-600 mt-1">
                    Tracking ID: <strong className="font-mono text-zinc-900">{order.tracking_id}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-zinc-900 text-base">Update Order Status</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                  Select New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white capitalize"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {(newStatus === 'shipped' || newStatus === 'out_for_delivery') && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                      Courier Partner Name
                    </label>
                    <input
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      placeholder="Blue Dart, Delhivery, ST Courier..."
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                      Waybill / Tracking Number
                    </label>
                    <input
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      placeholder="e.g. BLUEDART-8821094"
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                  Status Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Dispatched from Chennai printing hub"
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleUpdateStatus}
                  className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {updating ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-white" />
                      Saving...
                    </>
                  ) : (
                    'Save Status'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
