import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { CURRENCY } from '../../config/brand'
import api from '../../services/api'

interface RecentOrder {
  id: number
  order_number: string
  customer: string
  phone?: string
  amount: number
  status: string
  payment_status: string
  payment_method: string
  item_count: number
  created_at: string | null
}

interface DashboardData {
  total_sales: number
  total_orders: number
  new_orders: number
  printing: number
  quality_check: number
  packed: number
  shipped: number
  delivered: number
  cancelled: number
  customers: number
  products: number
  designs: number
  low_stock: number
  out_of_stock: number
  recent_orders: RecentOrder[]
  monthly_sales: { month: string; sales: number }[]
  weekly_orders: { day: string; date: string; orders: number }[]
  is_live?: boolean
}

const INITIAL_DATA: DashboardData = {
  total_sales: 0,
  total_orders: 0,
  new_orders: 0,
  printing: 0,
  quality_check: 0,
  packed: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
  customers: 0,
  products: 0,
  designs: 0,
  low_stock: 0,
  out_of_stock: 0,
  recent_orders: [],
  monthly_sales: [],
  weekly_orders: [],
  is_live: false,
}

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

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await api.get('/admin/dashboard')
      if (res.data) {
        setData(res.data)
        setLastUpdated(new Date())
      }
    } catch {
      // Keep existing data if network/auth glitch occurs
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    // Auto-refresh every 30 seconds for live monitoring
    const timer = setInterval(() => fetchDashboard(), 30000)
    return () => clearInterval(timer)
  }, [])

  const cards = [
    {
      label: 'Total Revenue',
      value: `${CURRENCY}${data.total_sales.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      hint: 'Paid customer orders',
    },
    {
      label: 'Total Orders',
      value: data.total_orders,
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      hint: `${data.new_orders} new to process`,
    },
    {
      label: 'Registered Customers',
      value: data.customers,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      hint: 'Active store users',
    },
    {
      label: 'Catalogue Products',
      value: data.products,
      icon: Layers,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      hint: `${data.low_stock} low in stock`,
    },
    {
      label: 'In Printing',
      value: data.printing,
      icon: Package,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      hint: 'Active production queue',
    },
    {
      label: 'Shipped',
      value: data.shipped,
      icon: Truck,
      color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
      hint: 'In courier transit',
    },
    {
      label: 'Delivered',
      value: data.delivered,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600 border-green-100',
      hint: 'Completed orders',
    },
    {
      label: 'Cancelled Orders',
      value: data.cancelled,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-500 border-red-100',
      hint: `${data.cancelled} total cancelled`,
    },
  ]

  const formatTimeAgo = (iso?: string | null) => {
    if (!iso) return 'Just now'
    try {
      const diffMs = Date.now() - new Date(iso).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    } catch {
      return 'Recent'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-zinc-900">Live Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Data
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Real-time sales, order fulfillment, and customer metrics from PRINTHEAVEN.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 hidden sm:inline">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Primary 8-Metric Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, hint }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{label}</span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${color}`}
              >
                <Icon size={15} />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-900 tracking-tight">
              {loading ? '—' : value}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">{hint}</p>
          </div>
        ))}
      </div>

      {/* Dynamic Live Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Sales */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Monthly Revenue</h3>
              <p className="text-xs text-zinc-400">Actual sales across previous 6 months</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {CURRENCY}
              {data.monthly_sales.reduce((acc, m) => acc + m.sales, 0).toLocaleString('en-IN')} Total
            </span>
          </div>

          {data.monthly_sales.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={data.monthly_sales}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                />
                <Tooltip
                  formatter={(v: number | string) => [
                    `₹${Number(v).toLocaleString('en-IN')}`,
                    'Revenue',
                  ]}
                />
                <Bar dataKey="sales" fill="#18181b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-zinc-400 text-xs">
              <TrendingUp size={24} className="mb-2 text-zinc-300" />
              <span>No revenue data recorded yet for this period.</span>
            </div>
          )}
        </div>

        {/* Weekly Orders */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Orders This Week</h3>
              <p className="text-xs text-zinc-400">Daily incoming orders for the last 7 days</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {data.weekly_orders.reduce((acc, d) => acc + d.orders, 0)} Orders
            </span>
          </div>

          {data.weekly_orders.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={data.weekly_orders}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(_, arr) => arr[0]?.payload?.date || ''}
                  formatter={(v: number | string) => [`${v} orders`, 'Volume']}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#18181b"
                  strokeWidth={2.5}
                  dot={{ fill: '#18181b', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-zinc-400 text-xs">
              <ShoppingBag size={24} className="mb-2 text-zinc-300" />
              <span>No order activity in the last 7 days.</span>
            </div>
          )}
        </div>
      </div>

      {/* Real Live Recent Orders Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-zinc-900 text-sm">Recent Live Orders</h3>
            <p className="text-xs text-zinc-400">Real-time incoming orders placed by customers</p>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-black font-semibold transition-colors"
          >
            <span>Manage All Orders</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {data.recent_orders.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">
            <ShoppingBag size={36} className="mx-auto mb-3 text-zinc-300" />
            <p className="text-sm font-semibold text-zinc-700 mb-1">No Orders Placed Yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Customer orders placed on the website will automatically appear here with design and print details.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-400 border-b border-zinc-100">
                  <th className="text-left pb-3 font-medium">Order ID</th>
                  <th className="text-left pb-3 font-medium">Customer</th>
                  <th className="text-left pb-3 font-medium">Items</th>
                  <th className="text-left pb-3 font-medium">Amount</th>
                  <th className="text-left pb-3 font-medium">Payment</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Placed</th>
                  <th className="text-right pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 font-mono font-bold text-xs text-zinc-900">
                      #{o.order_number || o.id}
                    </td>
                    <td className="py-3 text-zinc-700">
                      <div className="font-semibold text-xs text-zinc-900">{o.customer}</div>
                      {o.phone && <div className="text-[11px] text-zinc-400">{o.phone}</div>}
                    </td>
                    <td className="py-3 text-xs text-zinc-500 font-medium">
                      {o.item_count} item{o.item_count === 1 ? '' : 's'}
                    </td>
                    <td className="py-3 font-bold text-xs text-zinc-900">
                      {CURRENCY}
                      {o.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          o.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {o.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                          STATUS_COLORS[o.status] || 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-400 text-xs">
                      {formatTimeAgo(o.created_at)}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-black hover:underline"
                      >
                        View Details →
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
