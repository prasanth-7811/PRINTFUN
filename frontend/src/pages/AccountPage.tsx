import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Package, Heart, Bookmark, MapPin, Bell, Lock, LogOut, BadgeCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/auth'
import { PasswordField } from '../components/auth/AuthFields'

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
  const { user, logout, isVerified, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [saved, setSaved] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const handleSave = async () => {
    setSaved(false)
    try {
      await updateProfile({ name: form.name, phone: form.phone })
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwOk(false)
    if (pw.next.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pw.next !== pw.confirm) { setPwError('New passwords do not match.'); return }

    setPwLoading(true)
    try {
      await authService.changePassword(pw.current, pw.next)
      setPwOk(true)
      setPw({ current: '', next: '', confirm: '' })
    } catch (err: any) {
      setPwError(err?.response?.data?.message || 'Could not update password.')
    } finally {
      setPwLoading(false)
    }
  }

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
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm text-zinc-900 truncate">{user?.name}</p>
                    {isVerified ? (
                      <BadgeCheck size={13} className="text-blue-500 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        Unverified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                </div>
              </div>
              {!isVerified && (
                <Link
                  to="/verify-email"
                  className="block mb-2 mx-1 text-center text-xs font-medium text-blue-600 bg-blue-50 py-2 rounded-lg hover:bg-blue-100"
                >
                  Verify your email →
                </Link>
              )}
              {isVerified && !user?.phone_verified && (
                <Link
                  to="/verify-phone"
                  className="block mb-2 mx-1 text-center text-xs font-medium text-blue-600 bg-blue-50 py-2 rounded-lg hover:bg-blue-100"
                >
                  Verify your mobile number →
                </Link>
              )}
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
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Full Name</label>
                    <input type="text" value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Email</label>
                    <input type="email" value={form.email} disabled
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-zinc-50 text-zinc-500 cursor-not-allowed" />
                    <p className="text-xs text-zinc-400 mt-1">Email address cannot be changed.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Phone</label>
                    <input type="tel" value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <button onClick={handleSave} className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors">
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
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  {pwError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                      {pwError}
                    </div>
                  )}
                  {pwOk && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                      ✓ Password updated. All other sessions were signed out.
                    </div>
                  )}
                  <PasswordField
                    label="Current Password"
                    value={pw.current}
                    onChange={(v) => setPw(p => ({ ...p, current: v }))}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <PasswordField
                    label="New Password"
                    value={pw.next}
                    onChange={(v) => setPw(p => ({ ...p, next: v }))}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <PasswordField
                    label="Confirm New Password"
                    value={pw.confirm}
                    onChange={(v) => setPw(p => ({ ...p, confirm: v }))}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="submit"
                    disabled={pwLoading || !pw.current || !pw.next || !pw.confirm}
                    className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
