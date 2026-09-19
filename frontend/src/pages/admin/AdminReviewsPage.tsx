import { useState } from 'react'
import { CheckCircle, XCircle, Search, Star } from 'lucide-react'

const MOCK_REVIEWS = [
  { id: 1, product: 'Classic Oversized Tee', customer: 'Arjun Mehta', rating: 5, text: 'Perfect fit and the print quality is outstanding.', date: '2024-01-15', verified: true, approved: true },
  { id: 2, product: 'Premium Round Neck', customer: 'Sneha Patel', rating: 5, text: 'The fabric is so soft and the oversized fit is exactly what I wanted.', date: '2024-01-12', verified: true, approved: true },
  { id: 3, product: 'Streetwear Drop Shoulder', customer: 'Karan Singh', rating: 4, text: 'Great quality tee. The design studio made it super easy to customize.', date: '2024-01-10', verified: true, approved: false },
  { id: 4, product: 'V-Neck Essential', customer: 'Priya Sharma', rating: 3, text: 'Good but the print cracked after first wash. Disappointed.', date: '2024-01-08', verified: true, approved: false },
  { id: 5, product: 'Polo Classic', customer: 'Rohit Kumar', rating: 2, text: 'Size runs small. Had to return.', date: '2024-01-05', verified: false, approved: false },
]

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState(MOCK_REVIEWS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  const filtered = reviews.filter(r => {
    if (search && !r.product.toLowerCase().includes(search.toLowerCase()) && !r.customer.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'pending' && r.approved) return false
    if (filter === 'approved' && !r.approved) return false
    return true
  })

  const moderate = (id: number, approve: boolean) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, approved: approve } : r))
  }

  const deleteReview = (id: number) => {
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-zinc-900">Reviews Moderation</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..."
            className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none bg-white">
          <option value="all">All Reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr className="text-xs text-zinc-500">
                <th className="text-left px-5 py-3 font-semibold">Product</th>
                <th className="text-left px-5 py-3 font-semibold">Customer</th>
                <th className="text-left px-5 py-3 font-semibold">Rating</th>
                <th className="text-left px-5 py-3 font-semibold">Review</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">No reviews found</td>
                </tr>
              ) : filtered.map(review => (
                <tr key={review.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-900 whitespace-nowrap">{review.product}</td>
                  <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">{review.customer}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={s <= review.rating ? '#f59e0b' : 'none'} stroke="#f59e0b" />)}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600 max-w-xs truncate">{review.text}</td>
                  <td className="px-5 py-3">
                    {review.approved
                      ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Approved</span>
                      : <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      {!review.approved && (
                        <button onClick={() => moderate(review.id, true)} className="p-1.5 rounded-lg hover:bg-green-50 text-zinc-400 hover:text-green-600" title="Approve">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {review.approved && (
                        <button onClick={() => moderate(review.id, false)} className="p-1.5 rounded-lg hover:bg-amber-50 text-zinc-400 hover:text-amber-600" title="Hide">
                          <XCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteReview(review.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500" title="Delete">
                        <XCircle size={14} />
                      </button>
                    </div>
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
