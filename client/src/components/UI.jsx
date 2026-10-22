import { Loader2 } from 'lucide-react'

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 size={32} className="animate-spin text-forest-500" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {Icon && <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><Icon size={24} className="text-gray-400" /></div>}
      <div>
        <p className="font-semibold text-gray-700">{title}</p>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
        <span className="text-red-500 text-xl">!</span>
      </div>
      <p className="font-semibold text-gray-700">Error</p>
      <p className="text-sm text-gray-500">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-secondary">Try Again</button>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function SummaryCard({ title, value, subtitle, icon: Icon, color = 'forest', trend }) {
  const colors = {
    forest: { bg: 'bg-forest-50', icon: 'bg-forest-500', text: 'text-forest-700' },
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-500',   text: 'text-blue-700' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-500',  text: 'text-amber-700' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-500',    text: 'text-red-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-700' },
  }
  const c = colors[color] || colors.forest

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${c.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value} vs last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center ml-3`}>
            <Icon size={20} className="text-white" />
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Delete', dangerous = true }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <p className="text-gray-600 text-sm mt-2">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={dangerous ? 'btn-danger' : 'btn-primary'}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

export function Modal({ open, title, onClose, children, size = 'md' }) {
  if (!open) return null
  const maxW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size] || 'max-w-lg'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null
  const { page, pages, total, limit } = pagination
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
      <span>{from}–{to} of {total}</span>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="btn-secondary py-1.5 px-3 disabled:opacity-40">← Prev</button>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pages} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Next →</button>
      </div>
    </div>
  )
}
