import { useState } from 'react'
import { Search } from 'lucide-react'
import { CURRENCY } from '../../config/brand'

const MOCK_CUSTOMERS = [
  { id: 1, name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', orders: 8, spent: 9876, last_order: '2024-01-20', status: 'active' },
  { id: 2, name: 'Arjun Mehta', email: 'arjun@example.com', phone: '9123456789', orders: 5, spent: 5430, last_order: '2024-01-19', status: 'active' },
  { id: 3, name: 'Sneha Patel', email: 'sneha@example.com', phone: '9988776655', orders: 12, spent: 14320, last_order: '2024-01-18', status: 'active' },
  { id: 4, name: 'Karan Singh', email: 'karan@example.com', phone: '9871234560', orders: 3, spent: 2197, last_order: '2024-01-15', status: 'active' },
  { id: 5, name: 'Meera Nair', email: 'meera@example.com', phone: '9765432100', orders: 1, spent: 599, last_order: '2024-01-10', status: 'inactive' },
]

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_CUSTOMERS.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-zinc-900">Customers</h1>
        <span className="text-sm text-zinc-400">{filtered.length} customers</span>
      </div>

      <div className="relative w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
          className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr className="text-xs text-zinc-500">
              <th className="text-left px-5 py-3 font-semibold">Customer</th>
              <th className="text-left px-5 py-3 font-semibold">Phone</th>
              <th className="text-left px-5 py-3 font-semibold">Orders</th>
              <th className="text-left px-5 py-3 font-semibold">Total Spent</th>
              <th className="text-left px-5 py-3 font-semibold">Last Order</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">{c.name[0]}</div>
                    <div>
                      <p className="font-medium text-zinc-900">{c.name}</p>
                      <p className="text-xs text-zinc-400">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-zinc-500">{c.phone}</td>
                <td className="px-5 py-4 font-semibold text-zinc-900">{c.orders}</td>
                <td className="px-5 py-4 font-semibold text-zinc-900">{CURRENCY}{c.spent.toLocaleString('en-IN')}</td>
                <td className="px-5 py-4 text-zinc-500">{new Date(c.last_order).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2 text-xs">
                    <a href={`tel:${c.phone}`} className="px-2 py-1 bg-zinc-100 rounded-lg hover:bg-zinc-200 text-zinc-600">Call</a>
                    <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noreferrer" className="px-2 py-1 bg-green-100 rounded-lg hover:bg-green-200 text-green-700">WhatsApp</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
