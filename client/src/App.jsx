import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import IndentList from './pages/IndentList'
import IndentForm from './pages/IndentForm'
import IndentDetail from './pages/IndentDetail'
import ProcurementList from './pages/ProcurementList'
import ProcurementForm from './pages/ProcurementForm'
import ProcurementDetail from './pages/ProcurementDetail'
import GoodsReceiptList from './pages/GoodsReceiptList'
import GoodsReceiptForm from './pages/GoodsReceiptForm'
import GoodsReceiptDetail from './pages/GoodsReceiptDetail'
import VendorList from './pages/VendorList'
import VendorDetail from './pages/VendorDetail'
import VendorForm from './pages/VendorForm'
import InfluencerList from './pages/InfluencerList'
import InfluencerForm from './pages/InfluencerForm'
import InfluencerDetail from './pages/InfluencerDetail'
import PackingBatchList from './pages/PackingBatchList'
import PackingBatchDetail from './pages/PackingBatchDetail'
import EmployeeList from './pages/EmployeeList'
import EmployeeDetail from './pages/EmployeeDetail'
import PackingStockList from './pages/PackingStockList'
import PackingStockDetail from './pages/PackingStockDetail'
import Reports from './pages/Reports'
import UserList from './pages/UserList'

function AdminRoute({ children }) {
  const { user } = useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/" replace />
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-forest-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        {/* Indents */}
        <Route path="indents" element={<IndentList />} />
        <Route path="indents/new" element={<IndentForm />} />
        <Route path="indents/:id" element={<IndentDetail />} />
        <Route path="indents/:id/edit" element={<IndentForm />} />
        {/* Procurement Orders */}
        <Route path="procurement" element={<ProcurementList />} />
        <Route path="procurement/new" element={<ProcurementForm />} />
        <Route path="procurement/:id" element={<ProcurementDetail />} />
        <Route path="procurement/:id/edit" element={<ProcurementForm />} />
        {/* Goods Receipts */}
        <Route path="goods-receipts" element={<GoodsReceiptList />} />
        <Route path="goods-receipts/new" element={<GoodsReceiptForm />} />
        <Route path="goods-receipts/:id" element={<GoodsReceiptDetail />} />
        <Route path="goods-receipts/:id/edit" element={<GoodsReceiptForm />} />
        {/* Vendors */}
        <Route path="vendors" element={<VendorList />} />
        <Route path="vendors/new" element={<VendorForm />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="vendors/:id/edit" element={<VendorForm />} />
        {/* Influencers */}
        <Route path="influencers" element={<InfluencerList />} />
        <Route path="influencers/new" element={<InfluencerForm />} />
        <Route path="influencers/:id" element={<InfluencerDetail />} />
        <Route path="influencers/:id/edit" element={<InfluencerForm />} />
        {/* Production → packing → warehouse */}
        <Route path="packing-batches" element={<PackingBatchList />} />
        <Route path="packing-batches/:id" element={<PackingBatchDetail />} />
        <Route path="employees" element={<EmployeeList />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        {/* Packing material stock */}
        <Route path="packing-stock" element={<PackingStockList />} />
        <Route path="packing-stock/:id" element={<PackingStockDetail />} />
        {/* Reports */}
        <Route path="reports" element={<Reports />} />
        {/* Users (admin only) */}
        <Route path="users" element={<AdminRoute><UserList /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
