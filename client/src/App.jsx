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
import ProductList from './pages/ProductList'
import Reports from './pages/Reports'

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
        {/* Products */}
        <Route path="products" element={<ProductList />} />
        {/* Reports */}
        <Route path="reports" element={<Reports />} />
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
