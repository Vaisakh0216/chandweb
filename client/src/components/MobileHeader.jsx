import { Menu, Leaf } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/indents': 'Procurement Indents',
  '/procurement': 'Purchase Orders',
  '/goods-receipts': 'Goods Received',
  '/vendors': 'Vendor Management',
  '/influencers': 'Influencers',
  '/reports': 'Reports & Analytics',
}

export default function MobileHeader({ onMenuClick }) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'ChandWeb'

  return (
    <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-forest-900 text-white shadow-sm">
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-lg hover:bg-forest-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-forest-500 rounded flex items-center justify-center">
          <Leaf size={13} />
        </div>
        <span className="font-semibold text-sm">{title}</span>
      </div>
    </header>
  )
}
