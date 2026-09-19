import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, CheckCircle, XCircle, Printer, Truck } from 'lucide-react'
import { CURRENCY } from '../../config/brand'

const MOCK_ORDERS = [
  { id: 'TZ-2024-312', customer: 'Priya Sharma', phone: '9876543210', amount: 1347, status: 'design_review', date: '2024-01-20', items: 2, payment: 'paid' },
  { id: 'TZ-2024-311', customer: 'Arjun Mehta', phone: '9123456789', amount: 897, status: 'printing', date: '2024-01-19', items: 1, payment: 'paid' },
  { id: 'TZ-2024-310', customer: 'Sneha Patel', phone: '9988776655', amount: 2194, status: 'packed', date: '2024-01-18', items: 3, payment: 'paid' },
  { id: 'TZ-2024-309', customer: 'Karan Singh', phone: '9871234560', amount: 599, status: 'delivered', date: '2024-01-15', items: 1, payment: 'paid' },
  { id: 'TZ-2024-308', customer: 'Meera Nair', phone: '9765432100', amount: 1796, status: 'shipped', date: '2024-01-14', items: 2, payment: 'paid' },
  { id: 'TZ-2024-307', customer: 'Vikram Rao', phone: '9654321098', amount: 448, status: 'confirmed', date: '2024-01-13', items: 1, payment: 'pending' },
  { id: 'TZ-2024-306', customer: 'Ananya Das', phone: '9543210987', amount: 897, status: 'design_rejected', date: '2024-01-12', items: 1, payment: 'paid' },
  { id: 'TZ-2024-305', customer: 'Rohit Kumar', phone: '9432109876', amount: 1347, status: 'cancelled', date: '2024-01-11', items: 2, payment: 'refunded' },
]

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700', confirmed: 'bg-indigo-100 text-indigo-700',
  design_review: 'bg-yellow-100 text-yellow-700', design_approved: 'bg-green-100 text-green-700',
  design_rejected: 'bg-red-100 text-red-700', printing: 'bg-purple-100 text-purple-700',
  quality_check: 'bg-orange-100 text-orange-700', packed: 'bg-teal-100 text-teal-700',
  shipped: 'bg-cyan-100 text-cyan-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
}

const ALL_STATUSES = ['all', 'placed', 'confirmed', 'design_review', 'design_approved', 'design_rejected', 'printing', 'quality_check', 'packed', 'shipped', 'delivered', 'cancelled']

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = MOCK_ORDERS.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (search && !o.id.toLowerCase().includes(search.toLowerCase()) && !o.customer.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-zinc-900">Orders</h1>
        <span className="text-sm text-zinc-400">{filtered.length} orders</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
            className="pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black w-56" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none bg-white capitalize">
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr className="text-xs text-zinc-500">
                <th className="text-left px-5 py-3 font-semibold">Order</th>
                <th className="text-left px-5 py-3 font-semibold">Customer</th>
                <th className="text-left px-5 py-3 font-semibold">Date</th>
                <th className="text-left px-5 py-3 font-semibold">Items</th>
                <th className="text-left px-5 py-3 font-semibold">Amount</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-zinc-900">#{o.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-zinc-900">{o.customer}</p>
                    <p className="text-xs text-zinc-400">{o.phone}</p>
                  </td>
                  <td className="px-5 py-4 text-zinc-500">{new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-5 py-4 text-zinc-600">{o.items}</td>
                  <td className="px-5 py-4 font-semibold text-zinc-900">{CURRENCY}{o.amount}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[o.status] || 'bg-zinc-100 text-zinc-600'}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <Link to={`/admin/orders/${o.id}`} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900" title="View">
                        <Eye size={14} />
                      </Link>
                      {o.status === 'design_review' && (
                        <>
                          <button className="p-1.5 rounded-lg hover:bg-green-50 text-zinc-400 hover:text-green-600" title="Approve"><CheckCircle size={14} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500" title="Reject"><XCircle size={14} /></button>
                        </>
                      )}
                      {o.status === 'design_approved' && (
                        <button className="p-1.5 rounded-lg hover:bg-purple-50 text-zinc-400 hover:text-purple-600" title="Start Printing"><Printer size={14} /></button>
                      )}
                      {o.status === 'packed' && (
                        <button className="p-1.5 rounded-lg hover:bg-cyan-50 text-zinc-400 hover:text-cyan-600" title="Mark Shipped"><Truck size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">No orders found</div>
        )}
      </div>
    </div>
  )
}
