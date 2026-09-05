import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-container animate-fade-in">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
