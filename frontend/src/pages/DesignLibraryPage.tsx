import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Star, Search, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react'

export interface LibraryDesign {
  id: number
  name: string
  category: string
  image: string
  trending?: boolean
  featured?: boolean
  tags?: string[]
}

const CATEGORIES = [
  'All',
  'Trending',
  'Anime',
  'Gaming',
  'Streetwear',
  'Typography',
  'Aesthetic',
  'Sports',
  'Music',
  'Minimal',
  'Art',
  'Funny',
  'Couple',
  'Nature',
  'Automotive',
] as const

const DESIGNS: LibraryDesign[] = [
  // --- Anime & Manga ---
  {
    id: 1,
    name: 'Tokyo Neon Samurai',
    category: 'Anime',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    trending: true,
    featured: true,
    tags: ['samurai', 'cyberpunk', 'tokyo', 'katana', 'japanese'],
  },
  {
    id: 2,
    name: 'Cyberpunk Oni Mask',
    category: 'Anime',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['oni', 'mask', 'demon', 'cyberpunk', 'japanese'],
  },
  {
    id: 3,
    name: 'Sakura Blossom Spirit',
    category: 'Anime',
    image: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&auto=format&fit=crop&q=80',
    featured: false,
    tags: ['sakura', 'cherry blossom', 'zen', 'aesthetic'],
  },
  {
    id: 4,
    name: 'Manga Dragon Ink',
    category: 'Anime',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['dragon', 'manga', 'ink', 'japan'],
  },

  // --- Gaming & Esports ---
  {
    id: 5,
    name: 'Pixel Warrior',
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    trending: true,
    featured: true,
    tags: ['arcade', 'retro', 'pixel', '8bit', 'esports'],
  },
  {
    id: 6,
    name: 'Retro Arcade 84',
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    trending: false,
    featured: false,
    tags: ['arcade', 'joystick', '80s', 'gamer'],
  },
  {
    id: 7,
    name: 'Level Up Joystick',
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['level up', 'controller', 'playstation', 'xbox'],
  },
  {
    id: 8,
    name: 'Game Over Glitch',
    category: 'Gaming',
    image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
    featured: false,
    tags: ['glitch', 'game over', 'cyber', 'neon'],
  },

  // --- Typography & Quotes ---
  {
    id: 9,
    name: 'Stay Hungry Hustle',
    category: 'Typography',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format&fit=crop&q=80',
    trending: true,
    featured: false,
    tags: ['hustle', 'motivation', 'bold text', 'quote'],
  },
  {
    id: 10,
    name: 'Vintage Never Give Up',
    category: 'Typography',
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['vintage', 'quote', 'retro', 'inspiration'],
  },
  {
    id: 11,
    name: 'Good Vibes Only',
    category: 'Typography',
    image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=80',
    trending: false,
    tags: ['good vibes', 'peace', 'positivity'],
  },
  {
    id: 12,
    name: 'Bold Statement',
    category: 'Typography',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['statement', 'clean', 'modern'],
  },

  // --- Streetwear & Urban ---
  {
    id: 13,
    name: 'Street Code Urban',
    category: 'Streetwear',
    image: 'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=600&auto=format&fit=crop&q=80',
    trending: true,
    featured: true,
    tags: ['streetwear', 'graffiti', 'urban', 'grunge'],
  },
  {
    id: 14,
    name: 'Tokyo Shibuya Drift',
    category: 'Streetwear',
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
    trending: false,
    tags: ['shibuya', 'drift', 'night city', 'japanese street'],
  },
  {
    id: 15,
    name: 'Skate Or Die Vibe',
    category: 'Streetwear',
    image: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['skater', 'skateboard', 'rebel', 'street'],
  },
  {
    id: 16,
    name: 'Underground Culture',
    category: 'Streetwear',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['underground', 'hip hop', 'urban art'],
  },

  // --- Sports & Gym ---
  {
    id: 17,
    name: 'Court Vision Dunk',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['basketball', 'nba', 'dunk', 'baller'],
  },
  {
    id: 18,
    name: 'Iron Gym Discipline',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['fitness', 'workout', 'iron', 'bodybuilding', 'gym'],
  },
  {
    id: 19,
    name: 'Boxing Heavyweight',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&auto=format&fit=crop&q=80',
    trending: false,
    tags: ['boxing', 'fighter', 'gloves', 'knockout'],
  },
  {
    id: 20,
    name: 'Speed Runner 42K',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['marathon', 'running', 'sprint', 'athletics'],
  },

  // --- Music & Rock ---
  {
    id: 21,
    name: 'Vintage Vinyl Groove',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['vinyl', 'record', 'retro music', 'analog'],
  },
  {
    id: 22,
    name: 'Electric Fender Soul',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['guitar', 'rock', 'metal', 'electric'],
  },
  {
    id: 23,
    name: 'Retro Cassette Wave',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    tags: ['cassette', 'mixtape', '90s', 'lofi'],
  },
  {
    id: 24,
    name: 'Acoustic Sunset Beat',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&auto=format&fit=crop&q=80',
    tags: ['acoustic', 'sound', 'melody'],
  },

  // --- Aesthetic & Synthwave ---
  {
    id: 25,
    name: 'Neon Palm Synthwave',
    category: 'Aesthetic',
    image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    trending: true,
    featured: true,
    tags: ['synthwave', 'vaporwave', 'neon', '80s', 'sunset'],
  },
  {
    id: 26,
    name: 'Cyberpunk Horizon 2099',
    category: 'Aesthetic',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    tags: ['future', 'neon city', 'cyberpunk', 'matrix'],
  },
  {
    id: 27,
    name: 'Vaporwave Sunset Grid',
    category: 'Aesthetic',
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['retro future', 'grid', 'purple neon'],
  },
  {
    id: 28,
    name: 'Pastel Cosmic Dream',
    category: 'Aesthetic',
    image: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['pastel', 'dreamy', 'clouds', 'ethereal'],
  },

  // --- Minimal ---
  {
    id: 29,
    name: 'Botanical Monstera Leaf',
    category: 'Minimal',
    image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['plants', 'botanical', 'monstera', 'clean'],
  },
  {
    id: 30,
    name: 'Geometric Mountain Sun',
    category: 'Minimal',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['mountains', 'geometric', 'sun', 'nature'],
  },
  {
    id: 31,
    name: 'Minimal Palm Line',
    category: 'Minimal',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    tags: ['palm', 'minimal', 'line art'],
  },
  {
    id: 32,
    name: 'Minimal Monoline Arch',
    category: 'Minimal',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
    tags: ['arch', 'boho', 'modern line'],
  },

  // --- Art & Abstract ---
  {
    id: 33,
    name: 'Fluid Ink Splash',
    category: 'Art',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['ink', 'watercolor', 'abstract', 'splash'],
  },
  {
    id: 34,
    name: 'Golden Marble Flow',
    category: 'Art',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['marble', 'luxury', 'gold', 'texture'],
  },
  {
    id: 35,
    name: 'Oil Paint Expression',
    category: 'Art',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    tags: ['canvas', 'oil painting', 'colorful'],
  },
  {
    id: 36,
    name: 'Cosmic Nebula Swirl',
    category: 'Art',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['space', 'galaxy', 'astronomy', 'stars'],
  },

  // --- Funny & Memes ---
  {
    id: 37,
    name: 'Pug Vibe Sunglasses',
    category: 'Funny',
    image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600&auto=format&fit=crop&q=80',
    trending: true,
    featured: true,
    tags: ['pug', 'dog', 'sunglasses', 'meme', 'cute'],
  },
  {
    id: 38,
    name: 'Cat Logic Matrix',
    category: 'Funny',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['cat', 'feline', 'humor', 'pets'],
  },
  {
    id: 39,
    name: 'Donut Worry Be Happy',
    category: 'Funny',
    image: 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=600&auto=format&fit=crop&q=80',
    tags: ['donut', 'pun', 'cute', 'food'],
  },
  {
    id: 40,
    name: 'Sarcasm Loading 99%',
    category: 'Funny',
    image: 'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?w=600&auto=format&fit=crop&q=80',
    tags: ['sarcasm', 'loading', 'meme'],
  },

  // --- Couple & Romance ---
  {
    id: 41,
    name: 'Twin Hearts Affinity',
    category: 'Couple',
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['hearts', 'love', 'couple', 'matching'],
  },
  {
    id: 42,
    name: 'Pinky Promise Forever',
    category: 'Couple',
    image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['pinky promise', 'romance', 'together'],
  },
  {
    id: 43,
    name: 'Sunset Silhouette Love',
    category: 'Couple',
    image: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&auto=format&fit=crop&q=80',
    tags: ['silhouette', 'sunset', 'walk'],
  },
  {
    id: 44,
    name: 'King & Queen Duo',
    category: 'Couple',
    image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['crown', 'king', 'queen', 'duo'],
  },

  // --- Nature & Wildlife ---
  {
    id: 45,
    name: 'Geometric Mountain Peak',
    category: 'Nature',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
    featured: true,
    tags: ['mountains', 'alps', 'snow', 'adventure'],
  },
  {
    id: 46,
    name: 'Spirit Wolf Howl',
    category: 'Nature',
    image: 'https://images.unsplash.com/photo-1564865878688-9a244444042a?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['wolf', 'wildlife', 'forest', 'howl'],
  },
  {
    id: 47,
    name: 'Misty Pine Forest',
    category: 'Nature',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
    tags: ['pines', 'fog', 'evergreen', 'woods'],
  },
  {
    id: 48,
    name: 'Roaring Tiger Crest',
    category: 'Nature',
    image: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['tiger', 'predator', 'beast', 'wild'],
  },

  // --- Automotive & JDM ---
  {
    id: 49,
    name: 'JDM Midnight Racer',
    category: 'Automotive',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&auto=format&fit=crop&q=80',
    trending: true,
    featured: true,
    tags: ['jdm', 'turbo', 'racing', 'supercar', 'drift'],
  },
  {
    id: 50,
    name: 'Neon Drift Skyline',
    category: 'Automotive',
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80',
    trending: true,
    tags: ['skyline', 'drift', 'neon lights', 'night car'],
  },
  {
    id: 51,
    name: 'Cyber Samurai Armor',
    category: 'Automotive',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    tags: ['cyber', 'speed', 'futuristic'],
  },
]

export default function DesignLibraryPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    return DESIGNS.filter((d) => {
      // Category filter
      if (activeCategory === 'Trending') {
        if (!d.trending) return false
      } else if (activeCategory !== 'All') {
        if (d.category !== activeCategory) return false
      }

      // Search filter across name, category, and tags
      if (search.trim()) {
        const query = search.trim().toLowerCase()
        const matchesName = d.name.toLowerCase().includes(query)
        const matchesCat = d.category.toLowerCase().includes(query)
        const matchesTags = d.tags?.some((t) => t.toLowerCase().includes(query))
        if (!matchesName && !matchesCat && !matchesTags) return false
      }

      return true
    })
  }, [activeCategory, search])

  const useDesign = (design: LibraryDesign) => {
    navigate(
      `/design-studio?design=${design.id}&designImage=${encodeURIComponent(
        design.image
      )}&designName=${encodeURIComponent(design.name)}`
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50/60 pb-16">
      {/* Hero Header */}
      <div className="bg-zinc-950 text-white py-14 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-semibold text-zinc-400 mb-3">
            <Sparkles size={12} className="text-yellow-400" />
            <span>PRINTHEAVEN Curated Graphics</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3">
            Design Library
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Explore ready-made artwork curated across anime, gaming, typography, streetwear,
            and aesthetic topics. Click any graphic to project it directly onto your custom garment.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* Search & Topic Quick Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic, style, or anime..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 hover:text-black"
              >
                Clear
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-zinc-500 self-start md:self-center flex items-center gap-1.5">
            <SlidersHorizontal size={14} />
            <span>
              Showing <strong className="text-zinc-900">{filtered.length}</strong> designs in{' '}
              <strong className="text-zinc-900">{activeCategory}</strong>
            </span>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                activeCategory === cat
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200/80'
              }`}
            >
              {cat === 'Trending' && <TrendingUp size={12} className="text-orange-400" />}
              {cat}
            </button>
          ))}
        </div>

        {/* Designs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((design) => (
            <div
              key={design.id}
              className="group bg-white rounded-3xl border border-zinc-200/80 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-square bg-zinc-100 overflow-hidden cursor-pointer" onClick={() => useDesign(design)}>
                <img
                  src={design.image}
                  alt={design.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                  {design.trending && (
                    <span className="flex items-center gap-1 bg-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      <TrendingUp size={11} /> Trending
                    </span>
                  )}
                  {design.featured && (
                    <span className="flex items-center gap-1 bg-purple-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      <Star size={11} /> Featured
                    </span>
                  )}
                </div>

                {/* Hover overlay CTA */}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                  <span className="bg-white text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5">
                    Customize <ArrowRight size={13} />
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      {design.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-zinc-900 text-sm truncate">
                    {design.name}
                  </h3>
                </div>

                <button
                  onClick={() => useDesign(design)}
                  className="w-full py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                >
                  Use on T-Shirt
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty Search State */}
        {filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200 p-8 max-w-md mx-auto">
            <Search size={36} className="mx-auto text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-zinc-900 mb-1">No designs found</h3>
            <p className="text-xs text-zinc-500 mb-4">
              We couldn't find any designs matching "{search}". Try searching for another topic like
              "anime", "gaming", or "gym".
            </p>
            <button
              onClick={() => {
                setSearch('')
                setActiveCategory('All')
              }}
              className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
