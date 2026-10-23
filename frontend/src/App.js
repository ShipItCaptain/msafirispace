import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';

// Layout Components
import Layout from './components/layout/Layout';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ErrorBoundary from './components/layout/ErrorBoundary';
import CookieConsentBanner from './components/common/CookieConsentBanner';

// Page Components (public, loaded eagerly)
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ListingDetailPage from './pages/ListingDetailPage';
import HotelPage from './pages/HotelPage';
import HotelsPage from './pages/HotelsPage';
import BnBsPage from './pages/BnBsPage';
import BnBDetailPage from './pages/BnBDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyAccountPage from './pages/VerifyAccountPage';
import BookingDetailPage from './pages/BookingDetailPage';
import BecomeHostPage from './pages/BecomeHostPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import CookiePolicyPage from './pages/CookiePolicyPage';

// Protected Route Component
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleGuard from './components/auth/RoleGuard';

// Context and Hooks
import { useAuth } from './hooks/useAuth';
import AuthInitializer from './components/auth/AuthInitializer';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import NotificationContainer from './components/notifications/NotificationContainer';

// Dashboard & host-tool pages (lazy-loaded — guests never need this code)
const ListHotelPage = React.lazy(() => import('./pages/ListHotelPage'));
const HotelHostManagementPage = React.lazy(() => import('./pages/HotelHostManagementPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const BnBCreatePage = React.lazy(() => import('./pages/BnBCreatePage'));
const HotelHostDashboard = React.lazy(() => import('./pages/HotelHostDashboardPlaceholder'));
const BnBHostManagementPage = React.lazy(() => import('./pages/BnBHostManagementPage'));
const BnBListingDetailPage = React.lazy(() => import('./pages/BnBListingDetailPage'));
const HostHomePage = React.lazy(() => import('./pages/HostHomePage'));
const RoomTypeEditPage = React.lazy(() => import('./pages/RoomTypeEditPage'));

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
      <CookieConsentBanner />
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          <React.Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <Layout title="Hotels & BnBs in Kenya" description="Discover extraordinary places to stay, unique experiences, and unforgettable adventures across Kenya and beyond.">
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
            <Layout title="Search" description="Search hotels and BnBs across Kenya on Msafiri Space.">
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
            <Layout title="Hotels" description="Browse hotels across Kenya on Msafiri Space.">
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
            <Layout title="BnBs" description="Browse BnBs and short-term stays across Kenya on Msafiri Space.">
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
            <Layout title="Log In" description="Log in to your Msafiri Space account to manage bookings and listings.">
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
            <Layout title="Create Account" description="Sign up for Msafiri Space to book hotels and BnBs across Kenya.">
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

          <Route path="/verify-account" element={
            <Layout>
              <Header />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <VerifyAccountPage />
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
            <Layout title="Become a Host" description="List your hotel, BnB, or restaurant on Msafiri Space and start earning.">
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
          
          
          <Route path="/privacy" element={
            <Layout title="Privacy Policy" description="How Msafiri Space collects, uses, and protects your personal data.">
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PrivacyPolicyPage />
              </motion.div>
              <Footer />
            </Layout>
          } />

          <Route path="/terms" element={
            <Layout title="Terms & Conditions" description="The terms that govern your use of Msafiri Space.">
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TermsPage />
              </motion.div>
              <Footer />
            </Layout>
          } />

          <Route path="/cookies" element={
            <Layout title="Cookie Policy" description="How Msafiri Space uses cookies and how to control them.">
              <Header />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CookiePolicyPage />
              </motion.div>
              <Footer />
            </Layout>
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
          </React.Suspense>
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <AuthInitializer>
        <NotificationProvider>
          <FavoritesProvider>
            <AppContent />
          </FavoritesProvider>
        </NotificationProvider>
      </AuthInitializer>
    </HelmetProvider>
  );
}

export default App;
