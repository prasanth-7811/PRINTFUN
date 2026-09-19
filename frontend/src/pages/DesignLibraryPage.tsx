import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Star } from 'lucide-react'

const CATEGORIES = ['All', 'Trending', 'Typography', 'Gaming', 'Sports', 'Couple', 'Funny', 'Aesthetic', 'Art', 'Minimal', 'Streetwear']

const DESIGNS = [
  { id: 1, name: 'Neon Pulse', category: 'Aesthetic', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', trending: true, featured: false },
  { id: 2, name: 'Street Code', category: 'Streetwear', image: 'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&q=80', trending: true, featured: true },
  { id: 3, name: 'Pixel Warrior', category: 'Gaming', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', trending: false, featured: true },
  { id: 4, name: 'Bold Statement', category: 'Typography', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80', trending: true, featured: false },
  { id: 5, name: 'Court Vision', category: 'Sports', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80', trending: false, featured: false },
  { id: 6, name: 'Couple Goals', category: 'Couple', image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80', trending: true, featured: true },
  { id: 7, name: 'Laugh Track', category: 'Funny', image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&q=80', trending: false, featured: false },
  { id: 8, name: 'Ink Splash', category: 'Art', image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80', trending: true, featured: false },
  { id: 9, name: 'Clean Lines', category: 'Minimal', image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=80', trending: false, featured: true },
  { id: 10, name: 'Urban Jungle', category: 'Streetwear', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80', trending: true, featured: false },
  { id: 11, name: 'Retro Wave', category: 'Aesthetic', image: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=400&q=80', trending: false, featured: true },
  { id: 12, name: 'Level Up', category: 'Gaming', image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80', trending: true, featured: false },
]

export default function DesignLibraryPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = DESIGNS.filter(d => {
    if (activeCategory !== 'All' && d.category !== activeCategory) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const useDesign = (design: typeof DESIGNS[0]) => {
    navigate(`/design-studio?design=${design.id}&designImage=${encodeURIComponent(design.image)}&designName=${encodeURIComponent(design.name)}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-zinc-950 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Inspiration</p>
          <h1 className="text-4xl font-black text-white mb-3">Design Library</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">Browse hundreds of ready-made designs. Pick one and customize it on your T-shirt instantly.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search designs..." className="flex-1 max-w-sm px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map(design => (
            <div key={design.id} className="group bg-white rounded-2xl border border-zinc-100 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="relative aspect-square bg-zinc-50 overflow-hidden">
                <img src={design.image} alt={design.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {design.trending && (
                    <span className="flex items-center gap-1 bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      <TrendingUp size={10} /> Trending
                    </span>
                  )}
                  {design.featured && (
                    <span className="flex items-center gap-1 bg-purple-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      <Star size={10} /> Featured
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                  <button onClick={() => useDesign(design)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    Use Design
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-zinc-400 mb-0.5">{design.category}</p>
                <h3 className="font-semibold text-zinc-900 text-sm mb-2">{design.name}</h3>
                <button onClick={() => useDesign(design)} className="w-full py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors">
                  Use This Design
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg">No designs found</p>
          </div>
        )}
      </div>
    </div>
  )
}
