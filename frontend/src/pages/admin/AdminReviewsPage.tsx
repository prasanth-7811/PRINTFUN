import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Search, Star, Trash2, RefreshCw } from 'lucide-react'
import api from '../../services/api'

interface ReviewRow {
  id: number
  product_id: number
  product_name?: string
  customer_name?: string
  rating: number
  text?: string
  image?: string
  is_verified: boolean
  is_approved: boolean
  created_at: string
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  const fetchReviews = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.get('/reviews/admin/all')
      setReviews(res.data || [])
    } catch {
      // Keep state if request fails
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const filtered = reviews.filter((r) => {
    const prod = (r.product_name || '').toLowerCase()
    const cust = (r.customer_name || '').toLowerCase()
    const text = (r.text || '').toLowerCase()
    const term = search.toLowerCase()
    if (search && !prod.includes(term) && !cust.includes(term) && !text.includes(term)) return false
    if (filter === 'pending' && r.is_approved) return false
    if (filter === 'approved' && !r.is_approved) return false
    return true
  })

  const moderate = async (id: number, approve: boolean) => {
    try {
      await api.put(`/reviews/${id}`, { is_approved: approve })
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_approved: approve } : r))
      )
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update review status.')
    }
  }

  const deleteReview = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer review?')) return
    try {
      await api.delete(`/reviews/${id}`)
      setReviews((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete review.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-900">Reviews Moderation</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Reviews
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Approve, manage, or remove customer product ratings and reviews.
          </p>
        </div>

        <button
          onClick={() => fetchReviews(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews..."
            className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none bg-white"
        >
          <option value="all">All Reviews ({reviews.length})</option>
          <option value="pending">Pending ({reviews.filter((r) => !r.is_approved).length})</option>
          <option value="approved">Approved ({reviews.filter((r) => r.is_approved).length})</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-zinc-300" />
            Loading live customer reviews...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50/60 border-b border-zinc-100">
                <tr className="text-xs text-zinc-500">
                  <th className="text-left px-5 py-3 font-semibold">Product</th>
                  <th className="text-left px-5 py-3 font-semibold">Customer</th>
                  <th className="text-left px-5 py-3 font-semibold">Rating</th>
                  <th className="text-left px-5 py-3 font-semibold">Review</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                      No customer reviews match your filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((review) => (
                    <tr key={review.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-5 py-3 font-medium text-xs text-zinc-900 whitespace-nowrap">
                        {review.product_name || `Product #${review.product_id}`}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-600 whitespace-nowrap">
                        {review.customer_name || 'Customer'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              fill={s <= review.rating ? '#f59e0b' : 'none'}
                              stroke="#f59e0b"
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-600 max-w-xs truncate">
                        {review.text || <span className="italic text-zinc-400">No written text</span>}
                      </td>
                      <td className="px-5 py-3">
                        {review.is_approved ? (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Approved
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!review.is_approved ? (
                            <button
                              onClick={() => moderate(review.id, true)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600 transition-colors"
                              title="Approve for public display"
                            >
                              <CheckCircle size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => moderate(review.id, false)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-zinc-400 hover:text-amber-600 transition-colors"
                              title="Hide from public display"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteReview(review.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
