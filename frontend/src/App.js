import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Layout Components
import Layout from './components/layout/Layout';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Page Components
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ListingDetailPage from './pages/ListingDetailPage';
import HotelPage from './pages/HotelPage';
import HotelsPage from './pages/HotelsPage';
import BnBsPage from './pages/BnBsPage';
import BnBDetailPage from './pages/BnBDetailPage';
import ListHotelPage from './pages/ListHotelPage';
import HotelHostManagementPage from './pages/HotelHostManagementPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import BookingDetailPage from './pages/BookingDetailPage';
import BecomeHostPage from './pages/BecomeHostPage';
// Removed HotelRestaurantHostPage form route usage
import BnBCreatePage from './pages/BnBCreatePage';
import HotelHostDashboard from './pages/HotelHostDashboardPlaceholder';
import BnBHostManagementPage from './pages/BnBHostManagementPage';
import BnBListingDetailPage from './pages/BnBListingDetailPage';
// Concierge pages removed
import HostHomePage from './pages/HostHomePage';
import RoomTypeEditPage from './pages/RoomTypeEditPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Component
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleGuard from './components/auth/RoleGuard';

// Context and Hooks
import { useAuth } from './hooks/useAuth';
import AuthInitializer from './components/auth/AuthInitializer';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import NotificationContainer from './components/notifications/NotificationContainer';

// App Content Component
function AppContent() {
  const { isAuthenticated } = useAuth();
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="App min-h-screen bg-white">
      <NotificationContainer 
        notifications={notifications} 
        onClose={removeNotification} 
      />
        <AnimatePresence mode="wait">
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <HomePage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          <Route path="/search" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SearchPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          <Route path="/hotels" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <HotelsPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          <Route path="/bnbs" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BnBsPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          {/* Concierge routes removed */}
          
          
          <Route path="/listing/:id" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ListingDetailPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          <Route path="/hotel/:id" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <HotelPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          <Route path="/bnb/:id" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BnBDetailPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          <Route path="/list-hotel" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout>
                <Header />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListHotelPage />
                </motion.div>
                <Footer />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Authentication Routes */}
          <Route path="/login" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <LoginPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          <Route path="/register" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <RegisterPage />
              </motion.div>
              <Footer />
            </Layout>
          } />

          <Route path="/forgot-password" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <ForgotPasswordPage />
              </motion.div>
              <Footer />
            </Layout>
          } />

          <Route path="/reset-password/:token" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <ResetPasswordPage />
              </motion.div>
              <Footer />
            </Layout>
          } />

          <Route path="/verify-email/:token" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <VerifyEmailPage />
              </motion.div>
              <Footer />
            </Layout>
          } />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout>
                <Header />
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <DashboardPage />
                </motion.div>
                <Footer />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout>
                <Header />
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProfilePage />
                </motion.div>
                <Footer />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/booking/:id" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout>
                <Header />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <BookingDetailPage />
                </motion.div>
                <Footer />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Host Onboarding Routes */}
          <Route path="/become-host" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BecomeHostPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
          
          <Route path="/become-host/hotel-restaurant" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout>
                <Header />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Render ListHotelPage instead of the deprecated form */}
                  <ListHotelPage />
                </motion.div>
                <Footer />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/become-host/bnb" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout>
                <Header />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <BnBCreatePage />
                </motion.div>
                <Footer />
              </Layout>
            </ProtectedRoute>
          } />
          
          
          <Route path="/host-dashboard" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RoleGuard allowedRoles={['bnb_host','hotel_host']} fallbackPath="/" showAccessDenied={false}>
                <Layout>
                  <Header />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <HotelHostDashboard />
                  </motion.div>
                  <Footer />
                </Layout>
              </RoleGuard>
            </ProtectedRoute>
          } />
          
          {/* Host Management Routes */}
          <Route path="/host/bnb" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RoleGuard allowedRoles={['bnb_host','hotel_host']} fallbackPath="/" showAccessDenied={false}>
                <Layout>
                  <Header />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BnBHostManagementPage />
                  </motion.div>
                  <Footer />
                </Layout>
              </RoleGuard>
            </ProtectedRoute>
          } />
          
          <Route path="/host/bnb/:id" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RoleGuard allowedRoles={['bnb_host','hotel_host']} fallbackPath="/" showAccessDenied={false}>
                <Layout>
                  <Header />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BnBListingDetailPage />
                  </motion.div>
                  <Footer />
                </Layout>
              </RoleGuard>
            </ProtectedRoute>
          } />
          
          <Route path="/host/hotels" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RoleGuard allowedRoles={['bnb_host','hotel_host']} fallbackPath="/" showAccessDenied={false}>
                <Layout>
                  <Header />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <HotelHostDashboard />
                  </motion.div>
                  <Footer />
                </Layout>
              </RoleGuard>
            </ProtectedRoute>
          } />

          <Route path="/host/hotel/manage" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RoleGuard allowedRoles={['hotel_host']} fallbackPath="/" showAccessDenied={false}>
                <Layout>
                  <Header />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <HotelHostManagementPage />
                  </motion.div>
                  <Footer />
                </Layout>
              </RoleGuard>
            </ProtectedRoute>
          } />

          <Route path="/host/home" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RoleGuard allowedRoles={['bnb_host','hotel_host']} fallbackPath="/" showAccessDenied={false}>
                <Layout>
                  <Header />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <HostHomePage />
                  </motion.div>
                  <Footer />
                </Layout>
              </RoleGuard>
            </ProtectedRoute>
          } />

          {/* Room Type Edit Page */}
          <Route path="/host/rooms/:id/edit" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RoleGuard allowedRoles={['bnb_host','hotel_host']} fallbackPath="/" showAccessDenied={false}>
                <Layout>
                  <Header />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RoomTypeEditPage />
                  </motion.div>
                  <Footer />
                </Layout>
              </RoleGuard>
            </ProtectedRoute>
          } />
          
          
          {/* 404 Route */}
          <Route path="*" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <NotFoundPage />
              </motion.div>
              <Footer />
            </Layout>
          } />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <AuthInitializer>
      <NotificationProvider>
        <FavoritesProvider>
          <AppContent />
        </FavoritesProvider>
      </NotificationProvider>
    </AuthInitializer>
  );
}

export default App;
