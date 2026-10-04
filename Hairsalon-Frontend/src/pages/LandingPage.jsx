import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import logoImg from '../assets/logo.jpeg';
import {
  Scissors,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  CalendarCheck,
  Star,
  ChevronRight,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  Users,
  Store,
  ExternalLink
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSalons()
      .then((data) => {
        setSalons(data || []);
      })
      .catch((err) => {
        console.error('Failed to load salons for landing page', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCta = () => {
    if (user) {
      navigate(user.role === 'hairdresser' ? '/dashboard' : '/');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="landing-container">
      {/* Top Public Header */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => navigate('/')}>
            <div className="sidebar-logo">
              <img src={logoImg} alt="LuxeSalon" className="sidebar-logo-img" />
            </div>
            <div className="sidebar-brand-text">
              <span className="brand-name">LuxeSalon</span>
              <span className="brand-sub">Connect</span>
            </div>
          </div>

          <div className="landing-nav-links">
            <button type="button" className="landing-nav-link-btn" onClick={() => scrollToSection('salons')}>Salons</button>
            <button type="button" className="landing-nav-link-btn" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" className="landing-nav-link-btn" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" className="landing-nav-link-btn" onClick={() => scrollToSection('hairdressers')}>For Stylists</button>
          </div>

          <div className="landing-nav-actions">
            {user ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate(user.role === 'hairdresser' ? '/dashboard' : '/')}
              >
                Go to Dashboard <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-content animate-fade-in">
          <div className="landing-hero-badge">
            <Sparkles size={14} />
            <span>Cameroon's #1 Salon & Beauty Network</span>
          </div>

          <h1 className="landing-hero-title">
            Discover, Book & Experience <br />
            <span className="text-gradient">Cameroon's Finest Salons</span>
          </h1>

          <p className="landing-hero-desc">
            Connect with premium hairstylists and beauty salons in Douala, Yaoundé, Buea and beyond.
            Smart non-overlapping booking, verified CamPay subscriptions, and interactive styling.
          </p>

          <div className="landing-hero-btns">
            <button className="btn btn-primary btn-lg" onClick={handleCta}>
              Explore & Book Now <ArrowRight size={18} />
            </button>
            {user ? (
              <Link to="/try-on" className="btn btn-secondary btn-lg">
                <Sparkles size={18} /> Virtual Try-On
              </Link>
            ) : (
              <Link to="/register" className="btn btn-secondary btn-lg">
                Join as Stylist / Salon
              </Link>
            )}
          </div>

          {/* Quick Stats Bar */}
          <div className="landing-stats-grid">
            <div className="landing-stat-card">
              <span className="landing-stat-num">4+</span>
              <span className="landing-stat-label">Major Cities (Douala, Yaoundé, Buea, Limbe)</span>
            </div>
            <div className="landing-stat-card">
              <span className="landing-stat-num">100%</span>
              <span className="landing-stat-label">Anti-Double-Booking Protection</span>
            </div>
            <div className="landing-stat-card">
              <span className="landing-stat-num">MTN & OM</span>
              <span className="landing-stat-label">Instant CamPay Verification</span>
            </div>
            <div className="landing-stat-card">
              <span className="landing-stat-num">24/7</span>
              <span className="landing-stat-label">Live In-App Chat & Bookings</span>
            </div>
          </div>
        </div>
      </header>

      {/* Salons Showcase Section */}
      <section id="salons" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">Explore Salons</span>
          <h2>Featured Salons in Cameroon</h2>
          <p>Discover top-tier hairdressing studios and beauty spaces verified on our network</p>
        </div>

        {loading ? (
          <div className="page-loading">Loading top salons...</div>
        ) : (
          <div className="landing-salons-grid">
            {salons.map((salon) => (
              <div
                key={salon.id}
                className="landing-salon-card card-interactive"
                onClick={() => {
                  if (user) {
                    navigate(`/salon/${salon.id}`);
                  } else {
                    navigate('/login');
                  }
                }}
              >
                <div className="landing-salon-img-wrap">
                  {salon.image_url ? (
                    <img src={salon.image_url} alt={salon.name} />
                  ) : (
                    <div className="landing-salon-img-fallback">
                      <Store size={36} />
                    </div>
                  )}
                  <span className="landing-salon-city-pill">
                    <MapPin size={12} /> {salon.address?.split(',').pop()?.trim() || 'Cameroon'}
                  </span>
                </div>
                <div className="landing-salon-body">
                  <h3>{salon.name}</h3>
                  <p className="landing-salon-address">{salon.address || 'Address provided upon booking'}</p>
                  <div className="landing-salon-meta">
                    <span className="landing-salon-stylists">
                      <Users size={14} /> {salon.hairdressers?.length || 1} Stylists
                    </span>
                    <span className="landing-salon-services">
                      <Scissors size={14} /> {salon.services?.length || 0} Services
                    </span>
                  </div>
                  <button className="btn btn-primary btn-sm landing-salon-btn">
                    View & Book <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Platform Features Section */}
      <section id="features" className="landing-section landing-features-bg">
        <div className="landing-section-header">
          <span className="landing-section-tag">Why LuxeSalon Connect</span>
          <h2>Everything You Need for Effortless Beauty Care</h2>
          <p>Built exclusively for Cameroon's modern beauty salons, barbershops, and clients</p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <CalendarCheck size={28} />
            </div>
            <h3>Smart Conflict-Free Booking</h3>
            <p>
              Two clients can never double-book the same stylist for overlapping hours.
              Non-overlapping slots are instantly approved and scheduled.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: '#fce7f3', color: '#ec4899' }}>
              <Sparkles size={28} />
            </div>
            <h3>AI Virtual Hairstyle Try-On</h3>
            <p>
              Preview dreadlocks, cornrows, twists, and trendy cuts on your own photo
              before booking your chair.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CreditCard size={28} />
            </div>
            <h3>Instant CamPay Verification</h3>
            <p>
              Active Cameroonian salons authenticate their verified listings seamlessly
              using MTN Mobile Money and Orange Money.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <MapPin size={28} />
            </div>
            <h3>Interactive Cameroon Map</h3>
            <p>
              Explore all registered salons across Yaoundé (Bastos, Dragage), Douala (Akwa, Bonapriso),
              Buea (Molyko), and navigate via Google Maps.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <MessageCircle size={28} />
            </div>
            <h3>Direct Stylist Messaging</h3>
            <p>
              Chat in real-time with your hairdresser. Send reference style photos, request
              clarifications, and receive instant updates.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
              <ShieldCheck size={28} />
            </div>
            <h3>Dedicated Stylist Dashboard</h3>
            <p>
              Salon owners and stylists manage appointments, access full calendar views, track
              revenues, and showcase portfolio photos.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">Simple Process</span>
          <h2>How It Works</h2>
          <p>Book your transformation in 3 simple steps</p>
        </div>

        <div className="landing-steps-grid">
          <div className="landing-step-card">
            <div className="landing-step-number">01</div>
            <h3>Find Your Salon</h3>
            <p>Browse Cameroon's top salons by city, services, pricing, and client ratings.</p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">02</div>
            <h3>Select Stylist & Slot</h3>
            <p>Pick your preferred hairdresser and choose an available, conflict-free time slot.</p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">03</div>
            <h3>Show Up & Glow</h3>
            <p>Get instant booking confirmations and reminders. Experience world-class beauty service.</p>
          </div>
        </div>
      </section>

      {/* Call to Action for Stylists & Salon Owners */}
      <section id="hairdressers" className="landing-cta-banner">
        <div className="landing-cta-content">
          <span className="landing-section-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            For Salon Owners & Independent Stylists
          </span>
          <h2>Grow Your Salon Business With LuxeSalon Connect</h2>
          <p>
            Get discovered by thousands of clients in Cameroon, automate your appointments,
            and say goodbye to double-bookings forever.
          </p>
          <div className="landing-cta-actions">
            <Link to="/register" className="btn btn-secondary btn-lg">
              Register Your Salon Today
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg" style={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
              Stylist Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="sidebar-brand">
              <div className="sidebar-logo">
                <img src={logoImg} alt="LuxeSalon" className="sidebar-logo-img" />
              </div>
              <div className="sidebar-brand-text">
                <span className="brand-name">LuxeSalon</span>
                <span className="brand-sub">Connect Cameroon</span>
              </div>
            </div>
            <p className="landing-footer-tagline">
              Empowering Cameroonian beauty artists, stylists, and clients with seamless technology.
            </p>
          </div>

          <div className="landing-footer-links">
            <div className="footer-col">
              <h4>Cities</h4>
              <span>Douala</span>
              <span>Yaoundé</span>
              <span>Buea</span>
              <span>Limbe</span>
              <span>Bafoussam</span>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Create Account</Link>
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('salons')}>Salons Network</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('features')}>Features</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            </div>
            <div className="footer-col">
              <h4>Payments</h4>
              <span>CamPay Integration</span>
              <span>MTN Mobile Money</span>
              <span>Orange Money</span>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p>© {new Date().getFullYear()} LuxeSalon Connect Cameroon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
