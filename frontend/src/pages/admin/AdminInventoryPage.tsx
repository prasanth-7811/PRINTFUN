import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

const INVENTORY = [
  { type: 'Oversized', colour: 'Black', size: 'S', stock: 24 },
  { type: 'Oversized', colour: 'Black', size: 'M', stock: 31 },
  { type: 'Oversized', colour: 'Black', size: 'L', stock: 8 },
  { type: 'Oversized', colour: 'Black', size: 'XL', stock: 5 },
  { type: 'Oversized', colour: 'White', size: 'S', stock: 18 },
  { type: 'Oversized', colour: 'White', size: 'M', stock: 22 },
  { type: 'Oversized', colour: 'White', size: 'L', stock: 3 },
  { type: 'Round Neck', colour: 'Black', size: 'S', stock: 40 },
  { type: 'Round Neck', colour: 'Black', size: 'M', stock: 35 },
  { type: 'Round Neck', colour: 'Navy', size: 'M', stock: 0 },
  { type: 'V-Neck', colour: 'White', size: 'S', stock: 12 },
  { type: 'V-Neck', colour: 'White', size: 'M', stock: 0 },
]

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState(INVENTORY)
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState(0)

  const getKey = (i: typeof INVENTORY[0]) => `${i.type}-${i.colour}-${i.size}`

  const saveEdit = (key: string) => {
    setInventory(prev => prev.map(i => getKey(i) === key ? { ...i, stock: editVal } : i))
    setEditId(null)
  }

  const lowStock = inventory.filter(i => i.stock > 0 && i.stock <= 5).length
  const outOfStock = inventory.filter(i => i.stock === 0).length

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-zinc-900">Inventory</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-100 p-4">
          <p className="text-2xl font-black text-zinc-900">{inventory.filter(i => i.stock > 5).length}</p>
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

      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr className="text-xs text-zinc-500">
              <th className="text-left px-5 py-3 font-semibold">Type</th>
              <th className="text-left px-5 py-3 font-semibold">Colour</th>
              <th className="text-left px-5 py-3 font-semibold">Size</th>
              <th className="text-left px-5 py-3 font-semibold">Stock</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {inventory.map(item => {
              const key = getKey(item)
              return (
                <tr key={key} className={`hover:bg-zinc-50 ${item.stock === 0 ? 'bg-red-50/30' : item.stock <= 5 ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-5 py-3 font-medium text-zinc-900">{item.type}</td>
                  <td className="px-5 py-3 text-zinc-600">{item.colour}</td>
                  <td className="px-5 py-3 font-semibold text-zinc-700">{item.size}</td>
                  <td className="px-5 py-3">
                    {editId === key ? (
                      <div className="flex items-center gap-2">
                        <input type="number" value={editVal} onChange={e => setEditVal(Number(e.target.value))} min={0}
                          className="w-16 px-2 py-1 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                        <button onClick={() => saveEdit(key)} className="text-xs bg-black text-white px-2 py-1 rounded-lg">Save</button>
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
                    <button onClick={() => { setEditId(key); setEditVal(item.stock) }} className="text-xs text-zinc-500 hover:text-black underline">Edit</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
