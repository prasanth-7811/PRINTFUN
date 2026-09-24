import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, Heart, Eye } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { StarRating } from '../components/ui/index'
import { CURRENCY } from '../config/brand'
import { productService } from '../services/products'
import type { Product, Audience } from '../types'

const PRICE_RANGES = [
  { label: 'Under ₹150', min: 0, max: 149 },
  { label: '₹150–₹299', min: 150, max: 299 },
  { label: '₹300–₹499', min: 300, max: 499 },
  { label: '₹500+', min: 500, max: Infinity },
]

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedAudience, setSelectedAudience] = useState<Audience | ''>('')
  const [selectedColours, setSelectedColours] = useState<string[]>([])
  const [selectedGsm, setSelectedGsm] = useState<number[]>([])
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [sort, setSort] = useState('featured')
  const [wishlist, setWishlist] = useState<number[]>([])

  const { data: filterFacets } = useQuery({
    queryKey: ['product-filters'],
    queryFn: productService.getFilters,
  })

  // Server-side filters that map 1:1 to the backend params (audience, price
  // range, sort) and a large page so client-side refinement below is never
  // truncated by pagination. Multi-select facets + free-text search that don't
  // map to single-value params stay client-side.
  const priceRange = selectedPrice !== null ? PRICE_RANGES[selectedPrice] : null
  const serverParams = {
    sort,
    include_inactive: false,
    per_page: 100,
    audience: selectedAudience || undefined,
    min_price: priceRange ? priceRange.min : undefined,
    max_price: priceRange && priceRange.max !== Infinity ? priceRange.max : undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['products', serverParams],
    queryFn: () => productService.getProducts(serverParams),
  })

  const products = data?.items ?? []

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const toggleNum = (arr: number[], val: number, set: (v: number[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  // Audience and price are applied server-side (see serverParams); refine the
  // result here by the multi-select facets and free-text search.
  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.type.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedTypes.length && !selectedTypes.includes(p.type)) return false
      if (selectedColours.length && !(p.colours || []).some(c => selectedColours.includes(c.name))) return false
      if (selectedGsm.length && !(p.gsm && selectedGsm.includes(p.gsm))) return false
      return true
    })
  }, [products, search, selectedTypes, selectedColours, selectedGsm])

  const clearFilters = () => {
    setSelectedTypes([]); setSelectedAudience(''); setSelectedColours([])
    setSelectedGsm([]); setSelectedPrice(null); setSearch('')
  }

  const hasFilters = selectedTypes.length || selectedAudience || selectedColours.length ||
    selectedGsm.length || selectedPrice !== null || search

  const audienceLabel = (p: Product) =>
    (p.audiences || []).map(a => a === 'kids' ? 'Kids' : 'Adults').join(' + ')

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h4 className="font-semibold text-sm text-zinc-900 mb-3">Category</h4>
        <div className="space-y-2">
          {(filterFacets?.types || []).map(t => (
            <label key={t} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={selectedTypes.includes(t)} onChange={() => toggle(selectedTypes, t, setSelectedTypes)} className="rounded border-zinc-300 text-black focus:ring-black" />
              <span className="text-sm text-zinc-600 group-hover:text-zinc-900">{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div>
        <h4 className="font-semibold text-sm text-zinc-900 mb-3">Available For</h4>
        <div className="flex gap-2">
          {['', 'kids', 'adults'].map(a => (
            <button key={a || 'all'} onClick={() => setSelectedAudience(a as Audience | '')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedAudience === a ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
              {a === '' ? 'All' : a === 'kids' ? 'Kids' : 'Adults'}
            </button>
          ))}
        </div>
      </div>

      {/* Colours */}
      <div>
        <h4 className="font-semibold text-sm text-zinc-900 mb-3">Colour</h4>
        <div className="flex flex-wrap gap-2">
          {(filterFacets?.colours || []).map(c => (
            <button key={c.name} onClick={() => toggle(selectedColours, c.name, setSelectedColours)} title={c.name}
              className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColours.includes(c.name) ? 'border-black scale-110' : 'border-zinc-200 hover:border-zinc-400'}`}
              style={{ background: c.hex }} />
          ))}
        </div>
      </div>

      {/* GSM */}
      <div>
        <h4 className="font-semibold text-sm text-zinc-900 mb-3">GSM</h4>
        <div className="flex flex-wrap gap-2">
          {(filterFacets?.gsm || []).map(g => (
            <button key={g} onClick={() => toggleNum(selectedGsm, g, setSelectedGsm)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedGsm.includes(g) ? 'bg-black text-white border-black' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
              {g}
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
            <SlidersHorizontal size={16} /> Filters {hasFilters ? `(${[selectedTypes.length, selectedAudience ? 1 : 0, selectedColours.length, selectedGsm.length, selectedPrice !== null ? 1 : 0].reduce((a, b) => a + b, 0)})` : ''}
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
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-zinc-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-zinc-100 rounded w-1/3" />
                      <div className="h-3 bg-zinc-100 rounded w-3/4" />
                      <div className="h-3 bg-zinc-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-400 text-lg mb-4">No products found</p>
                <button onClick={clearFilters} className="text-sm text-black underline">Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(p => (
                  <div key={p.id} className="group bg-white rounded-2xl border border-zinc-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="relative aspect-square bg-zinc-50 overflow-hidden">
                      <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      {p.is_new && <span className="absolute top-2 left-2 bg-black text-white text-xs font-semibold px-2 py-0.5 rounded-full">New</span>}
                      {p.coming_soon && (
                        <span className="absolute top-2 left-2 bg-amber-400 text-black text-xs font-semibold px-2 py-0.5 rounded-full">Coming Soon</span>
                      )}
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
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">{audienceLabel(p)}</span>
                        {p.gsm && <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">{p.gsm} GSM</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <StarRating rating={p.rating} size={11} />
                        <span className="text-xs text-zinc-400">({p.review_count})</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-zinc-900 text-sm">
                          {p.coming_soon ? 'Coming Soon' : <>{CURRENCY}{p.base_price}<span className="text-xs font-normal text-zinc-400"> onwards</span></>}
                        </span>
                        <div className="flex gap-1">
                          {(p.colours || []).slice(0, 5).map(c => <span key={c.name} title={c.name} className="w-3.5 h-3.5 rounded-full border border-zinc-200" style={{ background: c.hex }} />)}
                          {(p.colours || []).length > 5 && <span className="text-xs text-zinc-400">+{p.colours.length - 5}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Link to={`/product/${p.id}`} className="flex-1 text-center py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">View Details</Link>
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
