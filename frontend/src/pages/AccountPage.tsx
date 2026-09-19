import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Package, Heart, Bookmark, MapPin, Bell, Lock, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'saved', label: 'Saved Designs', icon: Bookmark },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'password', label: 'Change Password', icon: Lock },
]

export default function AccountPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [saved, setSaved] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-black text-zinc-900 mb-8">My Account</h1>
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <div className="flex items-center gap-3 p-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 truncate">{user?.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${activeTab === id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700'}`}>
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
                <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={15} /> Logout
                </button>
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="font-bold text-lg text-zinc-900 mb-6">Profile Information</h2>
                <div className="space-y-4 max-w-md">
                  {[
                    { label: 'Full Name', key: 'name', type: 'text' },
                    { label: 'Email', key: 'email', type: 'email' },
                    { label: 'Phone', key: 'phone', type: 'tel' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label}</label>
                      <input type={f.type} value={form[f.key as keyof typeof form]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                    </div>
                  ))}
                  <button onClick={() => setSaved(true)} className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors">
                    Save Changes
                  </button>
                  {saved && <p className="text-sm text-green-600 font-medium">✓ Profile updated</p>}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="font-bold text-lg text-zinc-900 mb-4">My Orders</h2>
                <Link to="/orders" className="text-sm text-black font-semibold underline">View all orders →</Link>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="font-bold text-lg text-zinc-900 mb-4">Wishlist</h2>
                <p className="text-zinc-400 text-sm">Your wishlist is empty. <Link to="/shop" className="text-black underline">Browse products</Link></p>
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="font-bold text-lg text-zinc-900 mb-4">Saved Designs</h2>
                <p className="text-zinc-400 text-sm">No saved designs yet. <Link to="/design-studio" className="text-black underline">Open Design Studio</Link></p>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="font-bold text-lg text-zinc-900 mb-4">Saved Addresses</h2>
                <p className="text-zinc-400 text-sm">No saved addresses. Addresses are saved during checkout.</p>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="font-bold text-lg text-zinc-900 mb-4">Notifications</h2>
                <div className="space-y-3">
                  {[
                    { title: 'Order #TZ-2024-001 is being printed', time: '2 hours ago', read: false },
                    { title: 'Your design has been approved!', time: '1 day ago', read: true },
                    { title: 'Order #TZ-2024-001 confirmed', time: '2 days ago', read: true },
                  ].map((n, i) => (
                    <div key={i} className={`flex gap-3 p-3 rounded-xl ${n.read ? '' : 'bg-blue-50'}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-zinc-200' : 'bg-blue-500'}`} />
                      <div>
                        <p className={`text-sm ${n.read ? 'text-zinc-600' : 'text-zinc-900 font-medium'}`}>{n.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                <h2 className="font-bold text-lg text-zinc-900 mb-6">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                    <div key={label}>
                      <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{label}</label>
                      <input type="password" className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="••••••••" />
                    </div>
                  ))}
                  <button className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors">Update Password</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
