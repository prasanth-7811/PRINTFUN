import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, Heart, Eye } from 'lucide-react'
import { StarRating } from '../components/ui/index'
import { CURRENCY } from '../config/brand'

const MOCK_PRODUCTS = [
  { id: 1, name: 'Classic Oversized Tee', type: 'Oversized', price: 599, rating: 4.8, reviews: 124, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', colours: [{ name: 'Black', hex: '#000000' }, { name: 'White', hex: '#ffffff' }], stock: 'in_stock', is_new: false, is_featured: true },
  { id: 2, name: 'Premium Round Neck', type: 'Round Neck', price: 499, rating: 4.6, reviews: 89, image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80', colours: [{ name: 'Navy', hex: '#1e3a5f' }, { name: 'Black', hex: '#000000' }], stock: 'in_stock', is_new: true, is_featured: false },
  { id: 3, name: 'Streetwear Drop Shoulder', type: 'Oversized', price: 699, rating: 4.9, reviews: 201, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80', colours: [{ name: 'White', hex: '#ffffff' }, { name: 'Grey', hex: '#d4d4d4' }], stock: 'in_stock', is_new: false, is_featured: true },
  { id: 4, name: 'V-Neck Essential', type: 'V-Neck', price: 449, rating: 4.5, reviews: 67, image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&q=80', colours: [{ name: 'Black', hex: '#000000' }, { name: 'White', hex: '#ffffff' }], stock: 'low_stock', is_new: false, is_featured: false },
  { id: 5, name: 'Polo Classic', type: 'Polo', price: 799, rating: 4.7, reviews: 55, image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=80', colours: [{ name: 'Navy', hex: '#1e3a5f' }, { name: 'White', hex: '#ffffff' }], stock: 'in_stock', is_new: true, is_featured: false },
  { id: 6, name: 'Full Sleeve Comfort', type: 'Full Sleeve', price: 649, rating: 4.4, reviews: 43, image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80', colours: [{ name: 'Grey', hex: '#6b7280' }, { name: 'Black', hex: '#000000' }], stock: 'in_stock', is_new: false, is_featured: false },
  { id: 7, name: 'Minimal Half Sleeve', type: 'Half Sleeve', price: 399, rating: 4.3, reviews: 31, image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80', colours: [{ name: 'White', hex: '#ffffff' }, { name: 'Red', hex: '#dc2626' }], stock: 'out_of_stock', is_new: false, is_featured: false },
  { id: 8, name: 'Urban Oversized Fit', type: 'Oversized', price: 749, rating: 4.8, reviews: 178, image: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400&q=80', colours: [{ name: 'Black', hex: '#000000' }, { name: 'Green', hex: '#16a34a' }], stock: 'in_stock', is_new: true, is_featured: true },
]

const TYPES = ['Regular Fit', 'Oversized', 'Polo', 'Full Sleeve', 'Half Sleeve', 'Round Neck', 'V-Neck']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const PRICE_RANGES = [
  { label: 'Under ₹499', min: 0, max: 499 },
  { label: '₹500–₹999', min: 500, max: 999 },
  { label: '₹1000–₹1499', min: 1000, max: 1499 },
  { label: '₹1500+', min: 1500, max: Infinity },
]

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedColours, setSelectedColours] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [sort, setSort] = useState('featured')
  const [wishlist, setWishlist] = useState<number[]>([])

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const filtered = MOCK_PRODUCTS.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.type.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedTypes.length && !selectedTypes.includes(p.type)) return false
    if (selectedColours.length && !p.colours.some(c => selectedColours.includes(c.name))) return false
    if (selectedPrice !== null) {
      const range = PRICE_RANGES[selectedPrice]
      if (p.price < range.min || p.price > range.max) return false
    }
    return true
  }).sort((a, b) => {
    if (sort === 'price_asc') return a.price - b.price
    if (sort === 'price_desc') return b.price - a.price
    if (sort === 'rating') return b.rating - a.rating
    if (sort === 'newest') return b.is_new ? 1 : -1
    return b.is_featured ? 1 : -1
  })

  const clearFilters = () => {
    setSelectedTypes([]); setSelectedColours([]); setSelectedSizes([]); setSelectedPrice(null); setSearch('')
  }

  const hasFilters = selectedTypes.length || selectedColours.length || selectedSizes.length || selectedPrice !== null || search

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Types */}
      <div>
        <h4 className="font-semibold text-sm text-zinc-900 mb-3">T-Shirt Type</h4>
        <div className="space-y-2">
          {TYPES.map(t => (
            <label key={t} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={selectedTypes.includes(t)} onChange={() => toggle(selectedTypes, t, setSelectedTypes)} className="rounded border-zinc-300 text-black focus:ring-black" />
              <span className="text-sm text-zinc-600 group-hover:text-zinc-900">{t}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Colours */}
      <div>
        <h4 className="font-semibold text-sm text-zinc-900 mb-3">Colour</h4>
        <div className="flex flex-wrap gap-2">
          {[{ name: 'Black', hex: '#000' }, { name: 'White', hex: '#fff' }, { name: 'Grey', hex: '#9ca3af' }, { name: 'Navy', hex: '#1e3a5f' }, { name: 'Red', hex: '#dc2626' }, { name: 'Green', hex: '#16a34a' }].map(c => (
            <button key={c.name} onClick={() => toggle(selectedColours, c.name, setSelectedColours)} title={c.name}
              className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColours.includes(c.name) ? 'border-black scale-110' : 'border-zinc-200 hover:border-zinc-400'}`}
              style={{ background: c.hex }} />
          ))}
        </div>
      </div>
      {/* Sizes */}
      <div>
        <h4 className="font-semibold text-sm text-zinc-900 mb-3">Size</h4>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(s => (
            <button key={s} onClick={() => toggle(selectedSizes, s, setSelectedSizes)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedSizes.includes(s) ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {/* Price */}
      <div>
        <h4 className="font-semibold text-sm text-zinc-900 mb-3">Price Range</h4>
        <div className="space-y-2">
          {PRICE_RANGES.map((r, i) => (
            <label key={r.label} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="price" checked={selectedPrice === i} onChange={() => setSelectedPrice(i)} className="text-black focus:ring-black" />
              <span className="text-sm text-zinc-600 group-hover:text-zinc-900">{r.label}</span>
            </label>
          ))}
        </div>
      </div>
      {hasFilters && (
        <button onClick={clearFilters} className="w-full py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
          Clear All Filters
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-zinc-950 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl font-black text-white mb-3">Shop Collection</h1>
          <p className="text-zinc-400 text-sm">Premium custom T-shirts for every style</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50">
            <SlidersHorizontal size={16} /> Filters {hasFilters ? `(${[selectedTypes.length, selectedColours.length, selectedSizes.length, selectedPrice !== null ? 1 : 0].reduce((a, b) => a + b, 0)})` : ''}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-zinc-400 hidden sm:block">{filtered.length} products</span>
            <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white">
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Best Rated</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-56 shrink-0">
            <FilterPanel />
          </aside>

          {/* Mobile Filters Drawer */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg">Filters</h3>
                  <button onClick={() => setFiltersOpen(false)}><X size={20} /></button>
                </div>
                <FilterPanel />
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-400 text-lg mb-4">No products found</p>
                <button onClick={clearFilters} className="text-sm text-black underline">Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(p => (
                  <div key={p.id} className="group bg-white rounded-2xl border border-zinc-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="relative aspect-square bg-zinc-50 overflow-hidden">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      {p.is_new && <span className="absolute top-2 left-2 bg-black text-white text-xs font-semibold px-2 py-0.5 rounded-full">New</span>}
                      {p.stock === 'out_of_stock' && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="bg-white text-zinc-600 text-xs font-semibold px-3 py-1 rounded-full border">Out of Stock</span></div>}
                      <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setWishlist(w => w.includes(p.id) ? w.filter(x => x !== p.id) : [...w, p.id])} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-zinc-50">
                          <Heart size={14} fill={wishlist.includes(p.id) ? '#ef4444' : 'none'} stroke={wishlist.includes(p.id) ? '#ef4444' : 'currentColor'} />
                        </button>
                        <Link to={`/product/${p.id}`} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-zinc-50">
                          <Eye size={14} />
                        </Link>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-zinc-400 mb-0.5">{p.type}</p>
                      <h3 className="font-semibold text-zinc-900 text-sm mb-1.5 line-clamp-1">{p.name}</h3>
                      <div className="flex items-center gap-1.5 mb-2">
                        <StarRating rating={p.rating} size={11} />
                        <span className="text-xs text-zinc-400">({p.reviews})</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-zinc-900 text-sm">{CURRENCY}{p.price}</span>
                        <div className="flex gap-1">
                          {p.colours.map(c => <span key={c.name} className="w-3.5 h-3.5 rounded-full border border-zinc-200" style={{ background: c.hex }} />)}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Link to={`/product/${p.id}`} className="flex-1 text-center py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">View</Link>
                        <Link to={`/design-studio?product=${p.id}`} className="flex-1 text-center py-1.5 text-xs font-medium bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors">Customize</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
