import { useState } from 'react'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { CURRENCY } from '../../config/brand'
import { Modal } from '../../components/ui/index'

const MOCK_PRODUCTS = [
  { id: 1, name: 'Classic Oversized Tee', type: 'Oversized', price: 599, stock: 48, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&q=80', active: true },
  { id: 2, name: 'Premium Round Neck', type: 'Round Neck', price: 499, stock: 62, image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=100&q=80', active: true },
  { id: 3, name: 'Streetwear Drop Shoulder', type: 'Oversized', price: 699, stock: 31, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=100&q=80', active: true },
  { id: 4, name: 'V-Neck Essential', type: 'V-Neck', price: 449, stock: 8, image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=100&q=80', active: true },
  { id: 5, name: 'Polo Classic', type: 'Polo', price: 799, stock: 0, image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=100&q=80', active: false },
]

export default function AdminProductsPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [products, setProducts] = useState(MOCK_PRODUCTS)

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-zinc-900">Products</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors">
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="relative w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
          className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr className="text-xs text-zinc-500">
              <th className="text-left px-5 py-3 font-semibold">Product</th>
              <th className="text-left px-5 py-3 font-semibold">Type</th>
              <th className="text-left px-5 py-3 font-semibold">Price</th>
              <th className="text-left px-5 py-3 font-semibold">Stock</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="w-10 h-10 rounded-xl object-cover bg-zinc-100" />
                    <span className="font-medium text-zinc-900">{p.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-zinc-500">{p.type}</td>
                <td className="px-5 py-4 font-semibold">{CURRENCY}{p.price}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {p.stock === 0 ? 'Out of Stock' : p.stock <= 10 ? `Low (${p.stock})` : `In Stock (${p.stock})`}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${p.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                    {p.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"><Edit2 size={14} /></button>
                    <button onClick={() => setProducts(prev => prev.filter(x => x.id !== p.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Product">
        <div className="space-y-4">
          {[
            { label: 'Product Name', placeholder: 'Classic Oversized Tee' },
            { label: 'Base Price (₹)', placeholder: '599' },
            { label: 'Material', placeholder: '100% Cotton, 220 GSM' },
          ].map(f => (
            <div key={f.label}>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label}</label>
              <input placeholder={f.placeholder} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Type</label>
            <select className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none bg-white">
              {['Regular Fit', 'Oversized', 'Polo', 'Full Sleeve', 'Half Sleeve', 'Round Neck', 'V-Neck'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50">Cancel</button>
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800">Save Product</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
