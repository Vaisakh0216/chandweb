import { getStatusColor } from '../utils/helpers'

export default function StatusBadge({ status, size = 'sm' }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>
  const color = getStatusColor(status)
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  return (
    <span className={`badge ${color} ${textSize}`}>
      {status}
    </span>
  )
}
