import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Search } from 'lucide-react'
import { productService } from '../../services/products'
import api from '../../services/api'

interface InventoryRow {
  id: number
  product_id: number
  variant_id: number | null
  colour: string
  size: string
  stock: number
  product_name?: string
  product_type?: string
  variant_name?: string
  audience?: string
}

export default function AdminInventoryPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editVal, setEditVal] = useState(0)

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productService.getProducts({ include_inactive: true }).then(r => r.items),
  })

  const { data: inventory = [] } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: () => api.get('/admin/inventory').then(r => r.data as InventoryRow[]),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) =>
      api.put(`/admin/inventory/${id}`, { stock }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-inventory'] }),
  })

  // Enrich raw inventory with product/variant names.
  const rows: InventoryRow[] = inventory.map(i => {
    const product = products.find(p => p.id === i.product_id)
    const variant = product?.variants?.find(v => v.id === i.variant_id)
    return {
      ...i,
      product_name: product?.name,
      product_type: product?.type,
      variant_name: variant?.name,
      audience: variant?.audience,
    }
  })

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return [r.product_name, r.variant_name, r.colour, r.size, r.product_type]
      .filter(Boolean).some(v => (v as string).toLowerCase().includes(q))
  })

  const saveEdit = (id: number) => {
    updateMutation.mutate({ id, stock: Math.max(0, editVal) })
    setEditId(null)
  }

  const lowStock = filtered.filter(i => i.stock > 0 && i.stock <= 5).length
  const outOfStock = filtered.filter(i => i.stock === 0).length

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-zinc-900">Inventory</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-2xl font-black text-zinc-900">{filtered.filter(i => i.stock > 5).length}</p>
          <p className="text-xs text-zinc-400 mt-1">In Stock</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
          <p className="text-2xl font-black text-amber-700">{lowStock}</p>
          <p className="text-xs text-amber-500 mt-1">Low Stock (≤5)</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
          <p className="text-2xl font-black text-red-600">{outOfStock}</p>
          <p className="text-xs text-red-400 mt-1">Out of Stock</p>
        </div>
      </div>

      <div className="relative w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product, colour, size..."
          className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr className="text-xs text-zinc-500">
                <th className="text-left px-5 py-3 font-semibold">Product</th>
                <th className="text-left px-5 py-3 font-semibold">Variant</th>
                <th className="text-left px-5 py-3 font-semibold">Audience</th>
                <th className="text-left px-5 py-3 font-semibold">Colour</th>
                <th className="text-left px-5 py-3 font-semibold">Size</th>
                <th className="text-left px-5 py-3 font-semibold">Stock</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-zinc-50 ${item.stock === 0 ? 'bg-red-50/30' : item.stock <= 5 ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-5 py-3 font-medium text-zinc-900">{item.product_name || '—'}</td>
                  <td className="px-5 py-3 text-zinc-600">{item.variant_name || '—'}</td>
                  <td className="px-5 py-3">
                    {item.audience && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.audience === 'kids' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.audience === 'kids' ? 'Kids' : 'Adults'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{item.colour}</td>
                  <td className="px-5 py-3 font-semibold text-zinc-700">{item.size}</td>
                  <td className="px-5 py-3">
                    {editId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" value={editVal} onChange={e => setEditVal(Number(e.target.value))} min={0}
                          className="w-16 px-2 py-1 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                        <button onClick={() => saveEdit(item.id)} className="text-xs bg-black text-white px-2 py-1 rounded-lg">Save</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-zinc-400 hover:text-zinc-700">Cancel</button>
                      </div>
                    ) : (
                      <span className="font-semibold text-zinc-900">{item.stock}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {item.stock === 0 ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle size={12} /> Out of Stock</span>
                    ) : item.stock <= 5 ? (
                      <span className="text-xs font-semibold text-amber-600">Low Stock</span>
                    ) : (
                      <span className="text-xs font-semibold text-green-600">In Stock</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => { setEditId(item.id); setEditVal(item.stock) }} className="text-xs text-zinc-500 hover:text-black underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-zinc-400 text-sm py-12">No inventory rows found.</p>
        )}
      </div>
    </div>
  )
}
