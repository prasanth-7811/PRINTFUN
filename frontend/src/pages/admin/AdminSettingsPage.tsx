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
    store_name: 'Teezo',
    store_email: 'hello@teezo.com',
    store_phone: '6369794482',
    store_address: 'Chennai, Tamil Nadu, India',
    whatsapp_number: '6369794482',
    instagram_url: 'https://instagram.com/teezo',
    facebook_url: 'https://facebook.com/teezo',
    youtube_url: 'https://youtube.com/@teezo',
    // Pricing
    base_tshirt_price: 599,
    front_print_price: 149,
    back_print_price: 149,
    delivery_base: 79,
    delivery_per_extra: 20,
    free_delivery_above: 999,
    // Delivery
    delivery_zones: [
      { name: 'Local (Chennai)', min_days: 1, max_days: 2, charge: 50 },
      { name: 'Tamil Nadu', min_days: 2, max_days: 3, charge: 79 },
      { name: 'South India', min_days: 3, max_days: 4, charge: 99 },
      { name: 'Rest of India', min_days: 4, max_days: 6, charge: 129 },
    ],
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

  const addDeliveryZone = () => {
    setSettings(prev => ({
      ...prev,
      delivery_zones: [...prev.delivery_zones, { name: '', min_days: 1, max_days: 2, charge: 0 }]
    }))
  }

  const removeDeliveryZone = (index: number) => {
    setSettings(prev => ({
      ...prev,
      delivery_zones: prev.delivery_zones.filter((_, i) => i !== index)
    }))
  }

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
                  <input type="url" value={settings[f.key]} onChange={e => updateSetting(f.key, e.target.value)} placeholder={`https://${f.label.toLowerCase()}.com/teezo`}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-zinc-900">Pricing Configuration</h3>
            <p className="text-sm text-zinc-500">All prices in INR (₹)</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Base T-Shirt Price', key: 'base_tshirt_price' },
                { label: 'Front Print Price', key: 'front_print_price' },
                { label: 'Back Print Price', key: 'back_print_price' },
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
            <h3 className="font-semibold text-zinc-900">Delivery Rules</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Base Delivery Charge', key: 'delivery_base' },
                { label: 'Extra Item Charge', key: 'delivery_per_extra' },
                { label: 'Free Delivery Above', key: 'free_delivery_above' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{f.label} (₹)</label>
                  <input type="number" value={settings[f.key]} onChange={e => updateSetting(f.key, Number(e.target.value))} min={0}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-zinc-900">Delivery Zones</h3>
            <div className="space-y-3">
              {settings.delivery_zones.map((zone: any, idx: number) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 border border-zinc-100 rounded-xl">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Zone Name</label>
                    <input value={zone.name} onChange={e => {
                      const newZones = [...settings.delivery_zones]
                      newZones[idx] = { ...newZones[idx], name: e.target.value }
                      updateSetting('delivery_zones', newZones)
                    }} placeholder="Zone name"
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Min Days</label>
                    <input type="number" value={zone.min_days} onChange={e => {
                      const newZones = [...settings.delivery_zones]
                      newZones[idx] = { ...newZones[idx], min_days: Number(e.target.value) }
                      updateSetting('delivery_zones', newZones)
                    }} min={1} max={30}
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Max Days</label>
                    <input type="number" value={zone.max_days} onChange={e => {
                      const newZones = [...settings.delivery_zones]
                      newZones[idx] = { ...newZones[idx], max_days: Number(e.target.value) }
                      updateSetting('delivery_zones', newZones)
                    }} min={1} max={30}
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div className="flex items-end">
                    <label className="text-sm font-medium text-zinc-700 mb-1.5 block w-full">Charge (₹)</label>
                    <input type="number" value={zone.charge} onChange={e => {
                      const newZones = [...settings.delivery_zones]
                      newZones[idx] = { ...newZones[idx], charge: Number(e.target.value) }
                      updateSetting('delivery_zones', newZones)
                    }} min={0}
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
                  </div>
                  <div className="sm:col-span-5 flex justify-end">
                    <button onClick={() => removeDeliveryZone(idx)} className="text-sm text-red-500 hover:text-red-700 font-medium">Remove</button>
                  </div>
                </div>
              ))}
              <button onClick={addDeliveryZone} className="w-full py-2 border-2 border-dashed border-zinc-200 rounded-xl text-sm font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                + Add Delivery Zone
              </button>
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