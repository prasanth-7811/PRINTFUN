import { useState, useEffect } from 'react'
import { Save, Loader2, CreditCard, Mail, MessageCircle, Truck, Shield, Palette, Bell, Tag } from 'lucide-react'
import api from '../../services/api'

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: Shield },
  { id: 'pricing', label: 'Pricing', icon: Tag },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'branding', label: 'Branding', icon: Palette },
]

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    store_name: 'PRINTHEAVEN',
    store_email: 'printheavenstudio@gmail.com',
    store_phone: '9600650612',
    store_address: 'Chennai, Tamil Nadu, India',
    whatsapp_number: '9600650612',
    instagram_url: 'https://instagram.com/printheaven',
    facebook_url: 'https://facebook.com/printheaven',
    youtube_url: 'https://youtube.com/@printheaven',
    // Pricing — product base prices
    price_round_neck_kids: 299,
    price_round_neck_mens: 399,
    price_polo_mens: 499,
    price_polo_poly_cotton: 399,
    price_hoodie: 599,
    // Printing charges
    print_logo_only: 70,
    print_front: 100,
    print_back: 100,
    print_front_logo_back: 150,
    print_full_front_back: 200,
    // Courier
    courier_kids_round_neck: 80,
    delivery_base: 80,
    // Delivery
    delivery_base: 80,
    // Payment
    upi_enabled: true,
    card_enabled: true,
    netbanking_enabled: true,
    cod_enabled: false,
    // Notifications
    email_enabled: true,
    whatsapp_enabled: true,
    sms_enabled: false,
    // Branding
    primary_color: '#18181b',
    secondary_color: '#6366f1',
    logo_url: '',
  })

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings')
      setSettings(prev => ({ ...prev, ...res.data }))
    } catch {
      // Use defaults
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await api.put('/admin/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save settings', err)
    } finally {
      setSaving(false)
    }
  }

  const addDeliveryZone = () => {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Configure your store settings</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-zinc-50 rounded-2xl p-1">
        {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        {/* General */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-zinc-900">Store Information</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Store Name', key: 'store_name', type: 'text' },
                { label: 'Email', key: 'store_email', type: 'email' },
                { label: 'Phone', key: 'store_phone', type: 'tel' },
                { label: 'WhatsApp Number', key: 'whatsapp_number', type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label}</label>
                  <input type={f.type} value={settings[f.key]} onChange={e => updateSetting(f.key, e.target.value)}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Address</label>
                <textarea value={settings.store_address} onChange={e => updateSetting('store_address', e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
              </div>
            </div>

            <h3 className="font-semibold text-zinc-900 mt-8">Social Links</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Instagram', key: 'instagram_url' },
                { label: 'Facebook', key: 'facebook_url' },
                { label: 'YouTube', key: 'youtube_url' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label} URL</label>
                  <input type="url" value={settings[f.key]} onChange={e => updateSetting(f.key, e.target.value)} placeholder={`https://${f.label.toLowerCase()}.com/printheaven`}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-zinc-900">Product Base Prices (₹)</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Round Neck — Kids', key: 'price_round_neck_kids' },
                { label: "Round Neck — Men's", key: 'price_round_neck_mens' },
                { label: "Polo — Men's", key: 'price_polo_mens' },
                { label: 'Polo — Poly Cotton', key: 'price_polo_poly_cotton' },
                { label: 'Hoodie', key: 'price_hoodie' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label}</label>
                  <input type="number" value={settings[f.key]} onChange={e => updateSetting(f.key, Number(e.target.value))} min={0}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-zinc-900 mt-6">Printing Charges (₹)</h3>
            <p className="text-xs text-zinc-400">Charged per order (not per piece)</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Logo Only', key: 'print_logo_only' },
                { label: 'Front Print', key: 'print_front' },
                { label: 'Back Print', key: 'print_back' },
                { label: 'Front Logo + Back Print', key: 'print_front_logo_back' },
                { label: 'Full Front + Full Back', key: 'print_full_front_back' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label}</label>
                  <input type="number" value={settings[f.key]} onChange={e => updateSetting(f.key, Number(e.target.value))} min={0}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-zinc-900">Courier Charges (₹)</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              Kids Round Neck courier is fixed at ₹80 and cannot be changed here.
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Kids Round Neck Courier (fixed)</label>
                <input type="number" value={80} disabled
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm bg-zinc-50 text-zinc-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">All Other Products — Courier Charge</label>
                <input type="number" value={settings['delivery_base']} onChange={e => updateSetting('delivery_base', Number(e.target.value))} min={0}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
            </div>
          </div>
        )}

        {/* Payment */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-zinc-900">Payment Methods</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'upi_enabled', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm', icon: 'upi' },
                { key: 'card_enabled', label: 'Credit/Debit Card', desc: 'Visa, Mastercard, RuPay', icon: 'card' },
                { key: 'netbanking_enabled', label: 'Net Banking', desc: 'All major banks', icon: 'netbanking' },
                { key: 'cod_enabled', label: 'Cash on Delivery', desc: 'Pay on delivery', icon: 'cod' },
              ].map(m => (
                <label key={m.key} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${settings[m.key] ? 'border-black bg-zinc-50' : 'border-zinc-100 hover:border-zinc-300'}`}>
                  <input type="checkbox" checked={settings[m.key]} onChange={e => updateSetting(m.key, e.target.checked)} className="text-black" />
                  <div>
                    <p className="font-semibold text-sm text-zinc-900">{m.label}</p>
                    <p className="text-xs text-zinc-400">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-zinc-900">Notification Channels</h3>
            <div className="space-y-4">
              {[
                { key: 'email_enabled', label: 'Email', desc: 'Order confirmations, shipping updates', icon: Mail },
                { key: 'whatsapp_enabled', label: 'WhatsApp', desc: 'Real-time order notifications', icon: MessageCircle },
                { key: 'sms_enabled', label: 'SMS', desc: 'Critical alerts only', icon: Bell },
              ].map(n => (
                <label key={n.key} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${settings[n.key] ? 'border-black bg-zinc-50' : 'border-zinc-100 hover:border-zinc-300'}`}>
                  <input type="checkbox" checked={settings[n.key]} onChange={e => updateSetting(n.key, e.target.checked)} className="text-black" />
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                    <n.icon size={20} className="text-zinc-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-900">{n.label}</p>
                    <p className="text-xs text-zinc-400">{n.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Branding */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-zinc-900">Brand Colors</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.primary_color} onChange={e => updateSetting('primary_color', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-zinc-200 cursor-pointer" />
                  <input type="text" value={settings.primary_color} onChange={e => updateSetting('primary_color', e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.secondary_color} onChange={e => updateSetting('secondary_color', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-zinc-200 cursor-pointer" />
                  <input type="text" value={settings.secondary_color} onChange={e => updateSetting('secondary_color', e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono" />
                </div>
              </div>
            </div>

            <h3 className="font-semibold text-zinc-900">Logo</h3>
            <div className="flex items-center gap-4">
              <label className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer hover:border-zinc-400 transition-colors">
                <input type="file" accept="image/*" className="hidden" />
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-zinc-400">Upload Logo</span>
                )}
              </label>
              <span className="text-sm text-zinc-500">Recommended: 200x200px, PNG with transparency</span>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-zinc-100">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="ml-4 text-sm text-green-600 font-medium">✓ Settings saved!</span>}
        </div>
      </div>
    </div>
  )
}