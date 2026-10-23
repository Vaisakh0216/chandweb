import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, ShoppingCart, PackageCheck,
  Users, Package, BarChart2, LogOut, X, Leaf, UserCog
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/indents', label: 'Indent / Planning', icon: ClipboardList },
  { to: '/procurement', label: 'Purchase Orders', icon: ShoppingCart },
  { to: '/goods-receipts', label: 'Goods Received', icon: PackageCheck },
  { to: '/vendors', label: 'Vendors', icon: Users },
  { to: '/products', label: 'Product Master', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/users', label: 'Users', icon: UserCog, adminOnly: true },
]

export default function Sidebar({ onClose, mobile = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-forest-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-forest-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-forest-500 rounded-lg flex items-center justify-center">
            <Leaf size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">ChandWeb</p>
            <p className="text-forest-400 text-xs">Procurement</p>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-forest-400 hover:text-white p-1">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin').map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-forest-600 text-white'
                  : 'text-forest-300 hover:bg-forest-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-forest-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-7 h-7 bg-forest-600 rounded-full flex items-center justify-center text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-forest-400 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-forest-300 hover:bg-forest-800 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
