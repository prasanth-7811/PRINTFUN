import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Heart, User, ShoppingBag, Menu, X, ChevronDown } from 'lucide-react'
import { BRAND } from '../../config/brand'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Design Studio', to: '/design-studio' },
  { label: 'Design Library', to: '/design-library' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, logout, isAuthenticated, isAdmin } = useAuth()
  const { count } = useCart()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="font-black text-2xl tracking-tighter text-black">
              {BRAND.name}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium transition-colors hover:text-black ${
                    location.pathname === link.to ? 'text-black' : 'text-zinc-500'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              <Link to="/wishlist" className="p-2 rounded-lg hover:bg-zinc-100 transition-colors hidden sm:flex" aria-label="Wishlist">
                <Heart size={20} />
              </Link>

              {/* Account dropdown */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="p-2 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1"
                  aria-label="Account"
                >
                  <User size={20} />
                  {isAuthenticated && <ChevronDown size={14} className="text-zinc-400" />}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-zinc-100 py-2 z-50">
                    {isAuthenticated ? (
                      <>
                        <div className="px-4 py-2 border-b border-zinc-100">
                          <p className="text-sm font-semibold text-zinc-900">{user?.name}</p>
                          <p className="text-xs text-zinc-400">{user?.email}</p>
                        </div>
                        <Link to="/account" className="block px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => setAccountOpen(false)}>My Account</Link>
                        <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => setAccountOpen(false)}>My Orders</Link>
                        <Link to="/wishlist" className="block px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => setAccountOpen(false)}>Wishlist</Link>
                        {isAdmin && (
                          <Link to="/admin" className="block px-4 py-2 text-sm text-purple-600 font-medium hover:bg-purple-50" onClick={() => setAccountOpen(false)}>Admin Dashboard</Link>
                        )}
                        <hr className="my-1 border-zinc-100" />
                        <button onClick={() => { logout(); setAccountOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" className="block px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => setAccountOpen(false)}>Login</Link>
                        <Link to="/register" className="block px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => setAccountOpen(false)}>Create Account</Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Link to="/cart" className="relative p-2 rounded-lg hover:bg-zinc-100 transition-colors" aria-label="Cart">
                <ShoppingBag size={20} />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-black text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {searchOpen && (
            <div className="pb-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, designs..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button type="submit" className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-zinc-800">
                  Search
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-16 left-0 right-0 bg-white shadow-xl border-t border-zinc-100">
            <nav className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === link.to ? 'bg-zinc-100 text-black' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-zinc-100" />
              {isAuthenticated ? (
                <>
                  <Link to="/orders" className="px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50">My Orders</Link>
                  <Link to="/account" className="px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50">Account</Link>
                  {isAdmin && <Link to="/admin" className="px-4 py-3 rounded-xl text-sm font-medium text-purple-600 hover:bg-purple-50">Admin Dashboard</Link>}
                  <button onClick={logout} className="px-4 py-3 rounded-xl text-sm font-medium text-red-500 text-left hover:bg-red-50">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50">Login</Link>
                  <Link to="/register" className="px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50">Create Account</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Overlay for account dropdown */}
      {accountOpen && <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />}
    </>
  )
}
