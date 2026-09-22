import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import DesignLibraryPage from './pages/DesignLibraryPage'
import DesignStudioPage from './pages/DesignStudioPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import VerifyPhonePage from './pages/VerifyPhonePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AccountPage from './pages/AccountPage'

import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminCustomersPage from './pages/admin/AdminCustomersPage'
import AdminInventoryPage from './pages/admin/AdminInventoryPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminReviewsPage from './pages/admin/AdminReviewsPage'
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } })

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  return token ? <>{children}</> : <Navigate to="/login?redirect=/account" replace />
}

/** Requires a real, verified session — not just a token in storage. */
function VerifiedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isVerified, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login?redirect=/checkout" replace />
  if (!isVerified) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/verify-phone" element={<VerifyPhonePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/design-library" element={<DesignLibraryPage />} />
                <Route path="/design-studio" element={<DesignStudioPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<VerifiedRoute><CheckoutPage /></VerifiedRoute>} />
                <Route path="/order-success/:id" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="orders/:id" element={<AdminOrderDetailPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="customers" element={<AdminCustomersPage />} />
                <Route path="inventory" element={<AdminInventoryPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="designs" element={<AdminProductsPage />} />
                <Route path="coupons" element={<AdminSettingsPage />} />
                <Route path="reviews" element={<AdminReviewsPage />} />
                <Route path="shipping" element={<AdminOrdersPage />} />
                <Route path="returns" element={<AdminOrdersPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
