import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Search, X, Image as ImageIcon, Package } from 'lucide-react'
import { CURRENCY } from '../../config/brand'
import { Modal } from '../../components/ui/index'
import { productService } from '../../services/products'
import type { Product, ProductVariant, Audience } from '../../types'

const CATEGORIES = ['Round Neck', 'Polo', 'Oversized', 'Hoodies']
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const COLOUR_CHOICES = [
  { name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#f5f5f5' },
  { name: 'Navy', hex: '#1e3a5f' }, { name: 'Maroon', hex: '#7f1d1d' },
  { name: 'Royal Blue', hex: '#2563eb' }, { name: 'Olive Green', hex: '#556b2f' },
  { name: 'Mustard', hex: '#d9a020' }, { name: 'Orange', hex: '#ea580c' },
  { name: 'Cream', hex: '#f5ead6' }, { name: 'Lavender', hex: '#c8b6e2' },
  { name: 'Pastel Pink', hex: '#f3c6d6' }, { name: 'Pastel Mint', hex: '#bfe8d2' },
  { name: 'Light Brown', hex: '#b08968' }, { name: 'Half White', hex: '#eee9e0' },
]

type ProductForm = {
  name: string; slug: string; type: string; base_price: number
  description: string; fabric: string; gsm: number | ''
  audiences: Audience[]; coming_soon: boolean; is_featured: boolean
}

const EMPTY_FORM: ProductForm = {
  name: '', slug: '', type: CATEGORIES[0], base_price: 0,
  description: '', fabric: '', gsm: '',
  audiences: ['adults'], coming_soon: false, is_featured: false,
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productService.getProducts({ include_inactive: true }).then(r => r.items),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-products'] })

  const createMutation = useMutation({
    mutationFn: (data: ProductForm) => productService.createProduct({
      ...data,
      gsm: data.gsm === '' ? null : Number(data.gsm),
      colours: [], sizes: ALL_SIZES, images: [], tags: [],
    } as Partial<Product>),
    onSuccess: () => { invalidate(); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductForm }) =>
      productService.updateProduct(id, {
        ...data,
        gsm: data.gsm === '' ? null : Number(data.gsm),
      } as Partial<Product>),
    onSuccess: () => { invalidate(); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: invalidate,
  })

  const uploadMutation = useMutation({
    mutationFn: ({ id, files }: { id: number; files: File[] }) =>
      productService.uploadImages(id, files),
    onSuccess: () => { invalidate(); setImageFiles([]) },
  })

  const createVariantMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: number; data: Partial<ProductVariant> }) =>
      productService.createVariant(productId, data),
    onSuccess: () => invalidate(),
  })

  const updateVariantMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductVariant> }) =>
      productService.updateVariant(id, data),
    onSuccess: invalidate,
  })

  const deleteVariantMutation = useMutation({
    mutationFn: productService.deleteVariant,
    onSuccess: invalidate,
  })

  const closeModal = () => {
    setShowModal(false); setEditing(null); setForm(EMPTY_FORM); setImageFiles([])
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name, slug: p.slug, type: p.type, base_price: p.base_price,
      description: p.description || '', fabric: p.fabric || '',
      gsm: p.gsm ?? '', audiences: p.audiences || ['adults'],
      coming_soon: p.coming_soon, is_featured: p.is_featured,
    })
    setShowModal(true)
  }

  const submitForm = () => {
    if (!form.name.trim()) return
    if (editing) updateMutation.mutate({ id: editing.id, data: form })
    else createMutation.mutate(form)
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase())
  )

  const toggleAudience = (a: Audience) =>
    setForm(f => ({
      ...f,
      audiences: f.audiences.includes(a) ? f.audiences.filter(x => x !== a) : [...f.audiences, a],
    }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Products</h1>
          <p className="text-xs text-zinc-400 mt-1">Manage catalog, variants, audiences, colours & stock</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors">
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="relative w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
          className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
      </div>

      <div className="space-y-3">
        {filtered.map(p => {
          const open = expanded === p.id
          const variants = p.variants || []
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <img src={p.images?.[0]} alt="" className="w-12 h-12 rounded-xl object-cover bg-zinc-100" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{p.name}</span>
                    <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{p.type}</span>
                    {(p.audiences || []).map(a => (
                      <span key={a} className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {a === 'kids' ? 'Kids' : 'Adults'}
                      </span>
                    ))}
                    {p.coming_soon && (
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Coming Soon</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {variants.length} variant{variants.length !== 1 ? 's' : ''} · {CURRENCY}{p.base_price} onwards
                    {p.gsm ? ` · ${p.gsm} GSM` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpanded(open ? null : p.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50">
                    {open ? 'Hide' : 'Variants'}
                  </button>
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"><Edit2 size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>

              {open && (
                <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 space-y-3">
                  {variants.map(v => (
                    <VariantRow
                      key={v.id}
                      variant={v}
                      onUpdate={(data) => updateVariantMutation.mutate({ id: v.id, data })}
                      onDelete={() => deleteVariantMutation.mutate(v.id)}
                    />
                  ))}
                  <button
                    onClick={() => createVariantMutation.mutate({
                      productId: p.id,
                      data: {
                        name: `${p.name} — Kids`, slug: `${p.slug}-kids`,
                        audience: 'kids', price: null, colours: [], sizes: [],
                        fabric: p.fabric, gsm: p.gsm, is_active: true,
                      },
                    })}
                    className="text-xs font-medium px-3 py-2 rounded-lg border border-dashed border-zinc-300 text-zinc-500 hover:border-black hover:text-black"
                  >
                    + Add Kids Variant
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-zinc-100">
            <Package size={28} className="mx-auto text-zinc-300" />
            <p className="text-zinc-400 text-sm mt-3">No products yet. Add your first product.</p>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Edit Product' : 'Add New Product'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Product Name</label>
            <input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))}
              placeholder="Round Neck T-Shirt" className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Slug</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="round-neck-t-shirt" className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Category</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none bg-white">
                {CATEGORIES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Starting Price ({CURRENCY})</label>
              <input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: Number(e.target.value) }))}
                min={0} className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Fabric</label>
              <input value={form.fabric} onChange={e => setForm(f => ({ ...f, fabric: e.target.value }))}
                placeholder="100% RL Combed Cotton" className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">GSM</label>
              <input type="number" value={form.gsm} onChange={e => setForm(f => ({ ...f, gsm: e.target.value === '' ? '' : Number(e.target.value) }))}
                placeholder="180" className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Product description" className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Available Audiences</label>
            <div className="flex gap-2">
              {(['kids', 'adults'] as Audience[]).map(a => (
                <button key={a} onClick={() => toggleAudience(a)} type="button"
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${form.audiences.includes(a) ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-600'}`}>
                  {a === 'kids' ? 'Kids' : 'Adults'}
                </button>
              ))}
            </div>
            {form.type === 'Hoodies' && form.audiences.includes('kids') && (
              <p className="text-xs text-amber-600 mt-1.5">Hoodies are adults-only per the catalog.</p>
            )}
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.coming_soon} onChange={e => setForm(f => ({ ...f, coming_soon: e.target.checked }))} className="rounded border-zinc-300 text-black" />
              Mark as Coming Soon
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="rounded border-zinc-300 text-black" />
              Featured
            </label>
          </div>

          {/* Image upload */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Product Images</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm cursor-pointer hover:bg-zinc-50">
                <ImageIcon size={14} /> Choose files
                <input type="file" accept="image/png,image/jpeg" multiple className="hidden"
                  onChange={e => setImageFiles(Array.from(e.target.files || []))} />
              </label>
              <span className="text-xs text-zinc-400">{imageFiles.length} file(s) selected</span>
              {editing && imageFiles.length > 0 && (
                <button onClick={() => uploadMutation.mutate({ id: editing.id, files: imageFiles })}
                  className="text-xs font-medium px-3 py-2 rounded-lg bg-black text-white">Upload</button>
              )}
            </div>
            {editing && (editing.images || []).length > 0 && (
              <div className="flex gap-2 mt-3">
                {editing.images.map((img, i) => (
                  <img key={i} src={img} alt="" className="w-14 h-14 rounded-lg object-cover border border-zinc-200" />
                ))}
              </div>
            )}
            {!editing && <p className="text-xs text-zinc-400 mt-1">Save the product first, then upload images.</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={closeModal} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50">Cancel</button>
            <button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40">
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant editor — one row per Kids/Adults variant
// ---------------------------------------------------------------------------
function VariantRow({
  variant, onUpdate, onDelete,
}: {
  variant: ProductVariant
  onUpdate: (data: Partial<ProductVariant>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState<string>(variant.price?.toString() ?? '')
  const [sizes, setSizes] = useState<string[]>(variant.sizes || [])
  const [chosenColours, setChosenColours] = useState<string[]>((variant.colours || []).map(c => c.name))
  const [fabric, setFabric] = useState(variant.fabric || '')
  const [gsm, setGsm] = useState<string>(variant.gsm?.toString() ?? '')

  const toggleSize = (s: string) =>
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  const toggleColour = (name: string) =>
    setChosenColours(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])

  const save = () => {
    onUpdate({
      price: price === '' ? null : Number(price),
      sizes,
      colours: COLOUR_CHOICES.filter(c => chosenColours.includes(c.name)),
      fabric: fabric || null,
      gsm: gsm === '' ? null : Number(gsm),
    })
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center gap-4">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${variant.audience === 'kids' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {variant.audience === 'kids' ? 'Kids' : 'Adults'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 truncate">{variant.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {variant.price !== null
              ? <span className="text-xs text-zinc-600">{CURRENCY}{variant.price}</span>
              : <span className="text-xs text-amber-600 font-medium">Contact for pricing</span>}
            {variant.gsm && <span className="text-xs text-zinc-400">· {variant.gsm} GSM</span>}
            <span className="text-xs text-zinc-400">· {variant.sizes.length || 0} sizes</span>
            <span className="text-xs text-zinc-400">· {variant.colours.length} colours</span>
          </div>
        </div>
        {!variant.configured && (
          <span className="text-xs font-medium text-amber-600">Unconfigured</span>
        )}
        <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"><Edit2 size={13} /></button>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500"><Trash2 size={13} /></button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-300 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">
          {variant.name} <span className="text-xs font-normal text-zinc-400">({variant.audience})</span>
        </p>
        <button onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-700"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Price ({CURRENCY}) — blank = contact us</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="170"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">Fabric</label>
          <input value={fabric} onChange={e => setFabric(e.target.value)} placeholder="100% RL Combed Cotton"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 mb-1 block">GSM</label>
          <input type="number" value={gsm} onChange={e => setGsm(e.target.value)} placeholder="180"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Sizes</label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SIZES.map(s => (
            <button key={s} onClick={() => toggleSize(s)} type="button"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${sizes.includes(s) ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-600'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Colours</label>
        <div className="flex flex-wrap gap-1.5">
          {COLOUR_CHOICES.map(c => (
            <button key={c.name} onClick={() => toggleColour(c.name)} type="button" title={c.name}
              className={`w-7 h-7 rounded-full border-2 transition-all ${chosenColours.includes(c.name) ? 'border-black scale-110' : 'border-zinc-200'}`}
              style={{ background: c.hex }} />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold">Save Variant</button>
        <button onClick={() => setEditing(false)} className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium">Cancel</button>
      </div>
    </div>
  )
}
