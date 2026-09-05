import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
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
  const { login } = useAuth();
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
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<HomePage />} />
        <Route path="try-on" element={<VirtualTryOnPage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="salon/:id" element={<SalonDetailPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="my-salon" element={
          <ProtectedRoute allowedRoles={['hairdresser']}>
            <SalonManagerPage />
          </ProtectedRoute>
        } />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="dashboard" element={
          <ProtectedRoute allowedRoles={['hairdresser']}>
            <HairdresserDashboard />
          </ProtectedRoute>
        } />
        <Route path="admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPage />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AuthHandler />
      </HashRouter>
    </AuthProvider>
  );
}
