import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Edit2, Trash2, UserCheck, UserX, X } from 'lucide-react'
import { CURRENCY } from '../../config/brand'
import { Modal } from '../../components/ui/index'
import { userService } from '../../services/users'
import type { CreateUserPayload, UpdateUserPayload } from '../../services/users'

const ROLES = ['customer', 'admin', 'manager', 'production', 'shipping']

type UserRow = {
  id: number; name: string; email: string; phone?: string
  role: string; is_active: boolean; email_verified: boolean
  orders?: number; total_spent?: number; last_order?: string
}

const EMPTY_CREATE: CreateUserPayload = { name: '', email: '', phone: '', password: '', role: 'customer' }

export default function AdminCustomersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [createForm, setCreateForm] = useState<CreateUserPayload>(EMPTY_CREATE)
  const [editForm, setEditForm] = useState<UpdateUserPayload>({})
  const [error, setError] = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => userService.getUsers(roleFilter ? { role: roleFilter } : undefined),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => { invalidate(); setShowCreate(false); setCreateForm(EMPTY_CREATE); setError('') },
    onError: (e: any) => setError(e?.response?.data?.message || 'Failed to create user.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserPayload }) => userService.updateUser(id, data),
    onSuccess: () => { invalidate(); setEditing(null); setError('') },
    onError: (e: any) => setError(e?.response?.data?.message || 'Failed to update user.'),
  })

  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: invalidate,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      userService.updateUser(id, { is_active }),
    onSuccess: invalidate,
  })

  // ── Helpers ────────────────────────────────────────────────────────────────
  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').includes(search)
  )

  const openEdit = (u: UserRow) => {
    setEditing(u)
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, is_active: u.is_active, email_verified: u.email_verified })
    setError('')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Users</h1>
          <p className="text-xs text-zinc-400 mt-1">Live CRUD — create, edit, activate/deactivate, delete</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError('') }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
        >
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone..."
            className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <span className="text-sm text-zinc-400 ml-auto">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-sm">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr className="text-xs text-zinc-500">
                <th className="text-left px-5 py-3 font-semibold">User</th>
                <th className="text-left px-5 py-3 font-semibold">Phone</th>
                <th className="text-left px-5 py-3 font-semibold">Role</th>
                <th className="text-left px-5 py-3 font-semibold">Orders</th>
                <th className="text-left px-5 py-3 font-semibold">Spent</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-zinc-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">{u.name}</p>
                        <p className="text-xs text-zinc-400">{u.email}</p>
                        {!u.email_verified && (
                          <span className="text-xs text-amber-600 font-medium">Unverified</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-zinc-500">{u.phone || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-zinc-900">{u.orders ?? '—'}</td>
                  <td className="px-5 py-4 font-semibold text-zinc-900">
                    {u.total_spent != null ? `${CURRENCY}${u.total_spent.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <button onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors" title="Edit">
                        <Edit2 size={13} />
                      </button>
                      {/* Toggle active */}
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: u.id, is_active: !u.is_active })}
                        className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'hover:bg-red-50 text-zinc-400 hover:text-red-500' : 'hover:bg-green-50 text-zinc-400 hover:text-green-600'}`}
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u.id) }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── CREATE Modal ───────────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setError('') }} title="Add New User">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Full Name *</label>
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Rahul Sharma"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Email *</label>
              <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                placeholder="rahul@example.com"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Phone</label>
              <input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Role</label>
              <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black">
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Password *</label>
              <input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setShowCreate(false); setError('') }}
              className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50">Cancel</button>
            <button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending}
              className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40">
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── EDIT Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!editing} onClose={() => { setEditing(null); setError('') }} title="Edit User">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Full Name</label>
              <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Email</label>
              <input type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Phone</label>
              <input value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1 block">Role</label>
              <select value={editForm.role || 'customer'} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black">
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!editForm.is_active}
                onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-zinc-300 text-black" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!editForm.email_verified}
                onChange={e => setEditForm(f => ({ ...f, email_verified: e.target.checked }))}
                className="rounded border-zinc-300 text-black" />
              Email Verified
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setEditing(null); setError('') }}
              className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50">Cancel</button>
            <button onClick={() => editing && updateMutation.mutate({ id: editing.id, data: editForm })}
              disabled={updateMutation.isPending}
              className="flex-1 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-40">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
