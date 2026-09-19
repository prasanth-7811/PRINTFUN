import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Users, Package, TrendingUp, Clock, CheckCircle, Truck, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, type TooltipProps } from 'recharts'
import { CURRENCY } from '../../config/brand'
import api from '../../services/api'

const MOCK_STATS = {
  total_sales: 284750, total_orders: 312, new_orders: 18, printing: 24,
  quality_check: 8, packed: 12, shipped: 31, delivered: 198, cancelled: 11,
  returned: 4, customers: 267,
}

const MOCK_SALES = [
  { month: 'Aug', sales: 18400 }, { month: 'Sep', sales: 24200 }, { month: 'Oct', sales: 31500 },
  { month: 'Nov', sales: 28900 }, { month: 'Dec', sales: 42100 }, { month: 'Jan', sales: 38600 },
]

const MOCK_ORDERS_CHART = [
  { day: 'Mon', orders: 12 }, { day: 'Tue', orders: 19 }, { day: 'Wed', orders: 8 },
  { day: 'Thu', orders: 24 }, { day: 'Fri', orders: 31 }, { day: 'Sat', orders: 28 }, { day: 'Sun', orders: 15 },
]

const RECENT_ORDERS = [
  { id: 'TZ-2024-312', customer: 'Priya Sharma', amount: 1347, status: 'design_review', time: '10 min ago' },
  { id: 'TZ-2024-311', customer: 'Arjun Mehta', amount: 897, status: 'printing', time: '1 hr ago' },
  { id: 'TZ-2024-310', customer: 'Sneha Patel', amount: 2194, status: 'packed', time: '3 hrs ago' },
  { id: 'TZ-2024-309', customer: 'Karan Singh', amount: 599, status: 'delivered', time: '5 hrs ago' },
]

const STATUS_COLORS: Record<string, string> = {
  design_review: 'bg-yellow-100 text-yellow-700', printing: 'bg-purple-100 text-purple-700',
  packed: 'bg-teal-100 text-teal-700', delivered: 'bg-green-100 text-green-700',
  shipped: 'bg-cyan-100 text-cyan-700', confirmed: 'bg-indigo-100 text-indigo-700',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(MOCK_STATS)

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => {})
  }, [])

  const cards = [
    { label: 'Total Sales', value: `${CURRENCY}${stats.total_sales.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { label: 'Total Orders', value: stats.total_orders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: 'New Orders', value: stats.new_orders, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Printing', value: stats.printing, icon: Package, color: 'bg-purple-50 text-purple-600' },
    { label: 'Shipped', value: stats.shipped, icon: Truck, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Cancelled', value: stats.cancelled, icon: AlertTriangle, color: 'bg-red-50 text-red-500' },
    { label: 'Customers', value: stats.customers, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-zinc-100 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={16} />
            </div>
            <p className="text-2xl font-black text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <h3 className="font-semibold text-zinc-900 mb-4">Monthly Sales</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_SALES}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number | string) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Sales']} />
              <Bar dataKey="sales" fill="#18181b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-5">
          <h3 className="font-semibold text-zinc-900 mb-4">Orders This Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={MOCK_ORDERS_CHART}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#18181b" strokeWidth={2} dot={{ fill: '#18181b', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900">Recent Orders</h3>
          <Link to="/admin/orders" className="text-xs text-zinc-500 hover:text-black font-medium">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-100">
                <th className="text-left pb-3 font-medium">Order</th>
                <th className="text-left pb-3 font-medium">Customer</th>
                <th className="text-left pb-3 font-medium">Amount</th>
                <th className="text-left pb-3 font-medium">Status</th>
                <th className="text-left pb-3 font-medium">Time</th>
                <th className="text-left pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {RECENT_ORDERS.map(o => (
                <tr key={o.id}>
                  <td className="py-3 font-semibold text-zinc-900">#{o.id}</td>
                  <td className="py-3 text-zinc-600">{o.customer}</td>
                  <td className="py-3 font-semibold">{CURRENCY}{o.amount}</td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] || 'bg-zinc-100 text-zinc-600'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400 text-xs">{o.time}</td>
                  <td className="py-3">
                    <Link to={`/admin/orders/${o.id}`} className="text-xs text-black font-medium hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
