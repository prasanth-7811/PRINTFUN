import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, RefreshCw, ShoppingBag, ArrowRight } from 'lucide-react'
import { CURRENCY } from '../../config/brand'
import { orderService } from '../../services/orders'
import type { Order } from '../../types'

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

const ALL_STATUSES = [
  'all',
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchOrders = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await orderService.getAdminOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setOrders(res.items || [])
    } catch {
      // Keep state if fetch fails
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const num = (o.order_number || String(o.id)).toLowerCase()
    const name = (o.address?.full_name || '').toLowerCase()
    const phone = (o.address?.phone || '').toLowerCase()
    const email = (o.address?.email || '').toLowerCase()
    return num.includes(term) || name.includes(term) || phone.includes(term) || email.includes(term)
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-900">Orders</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Orders
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage fulfillment, design approval, tracking IDs, and customer deliveries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-medium">
            {filtered.length} order{filtered.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, phone..."
            className="pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black w-64 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none bg-white capitalize"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-zinc-300" />
            Loading live orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <ShoppingBag size={36} className="mx-auto mb-3 text-zinc-300" />
            <p className="text-sm font-semibold text-zinc-800 mb-1">No Orders Found</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {search || statusFilter !== 'all'
                ? 'No orders match your filter criteria.'
                : 'Customer orders placed on the store will appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left py-3 px-4 font-medium">Order Number</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Items</th>
                  <th className="text-left py-3 px-4 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 font-medium">Payment</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-right py-3 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-zinc-900">
                      #{o.order_number || o.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-xs text-zinc-900">
                        {o.address?.full_name || 'Customer'}
                      </div>
                      {o.address?.phone && (
                        <div className="text-[11px] text-zinc-400">{o.address.phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-500 font-medium">
                      {o.items?.length || 0} item{o.items?.length === 1 ? '' : 's'}
                    </td>
                    <td className="py-3 px-4 font-bold text-xs text-zinc-900">
                      {CURRENCY}
                      {Number(o.total || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          o.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {o.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                          STATUS_COLORS[o.status] || 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-400">
                      {o.created_at
                        ? new Date(o.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-black hover:underline"
                      >
                        <span>View</span>
                        <Eye size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
