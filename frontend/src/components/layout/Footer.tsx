import { Link } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import { BRAND } from '../../config/brand'
import { useState } from 'react'

export default function Footer() {
  const [email, setEmail] = useState('')

  return (
    <footer className="bg-zinc-950 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="font-black text-2xl text-white tracking-tighter">{BRAND.name}</Link>
            <p className="mt-3 text-sm leading-relaxed max-w-xs">{BRAND.tagline}</p>
            <div className="flex gap-3 mt-5">
              <a href={BRAND.instagram} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors" aria-label="Instagram">
                <span className="text-xs font-bold">IG</span>
              </a>
              <a href={BRAND.facebook} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors" aria-label="Facebook">
                <span className="text-xs font-bold">FB</span>
              </a>
              <a href={BRAND.youtube} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors" aria-label="YouTube">
                <span className="text-xs font-bold">YT</span>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm">
              {['All Products', 'T-Shirts', 'Design Library', 'New Arrivals', 'Best Sellers'].map((item) => (
                <li key={item}>
                  <Link to="/shop" className="hover:text-white transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customize */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Customize</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/design-studio" className="hover:text-white transition-colors">Design Studio</Link></li>
              <li><Link to="/design-studio" className="hover:text-white transition-colors">Upload Design</Link></li>
              <li><Link to="/design-library" className="hover:text-white transition-colors">Design Library</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Help</h4>
            <ul className="space-y-2.5 text-sm">
              {['Contact', 'FAQ', 'Shipping', 'Returns', 'Refunds', 'Track Order'].map((item) => (
                <li key={item}>
                  <Link to={`/${item.toLowerCase().replace(' ', '-')}`} className="hover:text-white transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              {['About', 'Privacy Policy', 'Terms', 'Cancellation Policy'].map((item) => (
                <li key={item}>
                  <Link to={`/${item.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-white transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-zinc-800 pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h4 className="text-white font-semibold mb-1">Stay in the loop</h4>
            <p className="text-sm">Get design inspiration and new drops.</p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setEmail('') }}
            className="flex gap-2 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-72">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-zinc-100 transition-colors flex items-center gap-1.5">
              Subscribe <ArrowRight size={14} />
            </button>
          </form>
        </div>

        <div className="border-t border-zinc-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <p>Made with ♥ in India</p>
        </div>
      </div>
    </footer>
  )
}
