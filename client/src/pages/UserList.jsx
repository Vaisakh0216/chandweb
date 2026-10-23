import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, X, Pencil, Trash2 } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Modal, ConfirmDialog } from '../components/UI'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const ROLES = ['admin', 'manager', 'viewer']
const EMPTY_FORM = { name: '', email: '', password: '', role: 'manager', isActive: true }

const ROLE_BADGE = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-700',
}

export default function UserList() {
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?._id || currentUser?.id

  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25 }
      if (search) params.search = search
      if (role) params.role = role
      if (isActive !== '') params.isActive = isActive
      const res = await api.get('/users', { params })
      setUsers(res.data.data)
      setPagination(res.data.pagination)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users')
    } finally { setLoading(false) }
  }, [page, search, role, isActive])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive })
    setModalOpen(true)
  }
  const closeModal = () => { if (!saving) setModalOpen(false) }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editing && form.password.length < 6) return toast.error('Password must be at least 6 characters')
    if (editing && form.password && form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      if (editing) {
        await api.put(`/users/${editing._id}`, payload)
        toast.success('User updated')
      } else {
        await api.post('/users', payload)
        toast.success('User created')
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${toDelete._id}`)
      toast.success('User deleted')
      setToDelete(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user')
      setToDelete(null)
    }
  }

  const isSelf = (u) => u._id === currentUserId
  const hasFilters = search || role || isActive

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage application users and their roles"
        actions={<button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add User</button>}
      />

      <div className="card p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name or email..." className="input pl-9" />
          </div>
          <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
          <select value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setRole(''); setIsActive(''); setPage(1) }} className="btn-ghost text-red-500">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : users.length === 0 ? (
          <EmptyState title="No users found" description={hasFilters ? 'Try adjusting your filters' : 'Add your first user'}
            action={<button onClick={openCreate} className="btn-primary">Add User</button>} />
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Role</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Last Login</th>
                    <th className="table-th">Created</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-forest-100 text-forest-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900">{u.name}</span>
                          {isSelf(u) && <span className="text-xs text-gray-400">(you)</span>}
                        </div>
                      </td>
                      <td className="table-td text-gray-600">{u.email}</td>
                      <td className="table-td">
                        <span className={`badge capitalize ${ROLE_BADGE[u.role] || ''}`}>{u.role}</span>
                      </td>
                      <td className="table-td">
                        <span className={`badge ${u.isActive ? 'status-received' : 'status-cancelled'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td text-gray-500">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                      <td className="table-td text-gray-500">{formatDate(u.createdAt)}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(u)} title="Edit"
                            className="p-1.5 rounded text-forest-600 hover:bg-forest-50"><Pencil size={14} /></button>
                          {!isSelf(u) && (
                            <button onClick={() => setToDelete(u)} title="Delete"
                              className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal open={modalOpen} title={editing ? 'Edit User' : 'Add User'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className="input" required maxLength={100} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="label">{editing ? 'New Password' : 'Password *'}</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="input"
              autoComplete="new-password" required={!editing} minLength={6}
              placeholder={editing ? 'Leave blank to keep current password' : 'Minimum 6 characters'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="input capitalize"
                disabled={editing && isSelf(editing)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange}
                  disabled={editing && isSelf(editing)} className="rounded" />
                Active
              </label>
            </div>
          </div>
          {editing && isSelf(editing) && (
            <p className="text-xs text-gray-500">You cannot change your own role or status.</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${toDelete?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

