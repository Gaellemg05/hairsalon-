import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import SalonDetailPage from './pages/SalonDetailPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ChatsPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import MapPage from './pages/MapPage';
import HairdresserDashboard from './pages/HairdresserDashboard';
import SalonManagerPage from './pages/SalonManagerPage';
import VirtualTryOnPage from './pages/VirtualTryOnPage';
import LandingPage from './pages/LandingPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={user.role === 'hairdresser' ? '/dashboard' : '/'} replace />;
  }
  return children;
}

function AuthHandler() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSuccess = (userData) => {
    login(userData);
    navigate(userData.role === 'hairdresser' ? '/dashboard' : '/', { replace: true });
  };

  const handleRegisterSuccess = (userData) => {
    login(userData);
    navigate(userData.role === 'hairdresser' ? '/dashboard' : '/', { replace: true });
  };

  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={
        <GuestRoute>
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </GuestRoute>
      } />
      <Route path="/register" element={
        <GuestRoute>
          <RegisterPage onLoginSuccess={handleRegisterSuccess} />
        </GuestRoute>
      } />

      {/* Root Route: If guest, renders LandingPage; if logged-in, renders Layout */}
      <Route
        path="/"
        element={
          !user ? (
            <LandingPage />
          ) : (
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          )
        }
      >
        <Route
          index
          element={
            !user ? null : user.role === 'hairdresser' ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <HomePage />
            )
          }
        />
        <Route path="try-on" element={<ProtectedRoute><VirtualTryOnPage /></ProtectedRoute>} />
        <Route path="booking" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
        <Route path="salon/:id" element={<ProtectedRoute><SalonDetailPage /></ProtectedRoute>} />
        <Route path="appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
        <Route
          path="my-salon"
          element={
            <ProtectedRoute allowedRoles={['hairdresser']}>
              <SalonManagerPage />
            </ProtectedRoute>
          }
        />
        <Route path="chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['hairdresser']}>
              <HairdresserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <HashRouter>
          <AuthHandler />
        </HashRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
