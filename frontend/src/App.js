import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import StaffHome from './pages/StaffHome';
import EmployeeList from './pages/EmployeeList';
import EmployeeEdit from './pages/EmployeeEdit';
import Schedule from './pages/Schedule';
import Announcements from './pages/Announcements';
import InternalManagement from './pages/InternalManagement';
import Attendance from './pages/Attendance';
import WhatsAppPage from './pages/WhatsApp';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { LanguageProvider, useLang } from './i18n';
import { getSettings } from './api';
import './App.css';

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(
    navigator.userAgent
  );
}

function DeviceBlockedScreen({ onLogout }) {
  return (
    <div className="device-blocked">
      <div className="device-blocked-card">
        <div className="device-blocked-icon">📱</div>
        <h2>仅限移动设备访问</h2>
        <p>Solo acceso desde dispositivos móviles</p>
        <div className="device-blocked-hint">
          请使用手机或平板电脑打开此页面<br/>
          Por favor use un teléfono o tablet para acceder
        </div>
        <button className="device-blocked-btn" onClick={onLogout}>
          返回登录 / Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}

// All nav items with permission keys
const NAV_ITEMS = [
  { key: 'home', path: '/home', labelKey: 'navHome', adminOnly: false },
  { key: 'employees', path: '/employees', labelKey: 'navEmployees', adminOnly: true },
  { key: 'schedule', path: '/schedule', labelKey: 'navSchedule', adminOnly: false },
  { key: 'announcements', path: '/announcements', labelKey: 'navAnnouncements', adminOnly: false },
  { key: 'attendance', path: '/attendance', labelKey: 'navAttendance', adminOnly: false },
  { key: 'whatsapp', path: '/whatsapp', labelKey: 'navWhatsApp', adminOnly: true },
  { key: 'internal', path: '/internal', labelKey: 'navInternal', adminOnly: true },
];

// Check if user has permission for a nav item
function hasNavPerm(user, navKey) {
  if (user.role === 'admin') return true;
  const item = NAV_ITEMS.find(n => n.key === navKey);
  // If user has permissions set, use them
  if (user.permissions) {
    const perms = user.permissions.split(',').map(s => s.trim()).filter(Boolean);
    return perms.includes(navKey);
  }
  // Default: show non-admin-only items
  return item && !item.adminOnly;
}

function getVisibleNavItems(user) {
  return NAV_ITEMS.filter(item => hasNavPerm(user, item.key));
}

function MobileNav({ t, toggleLang, lang, user, onLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const visibleItems = getVisibleNavItems(user);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
        <span className={`hamburger-line ${open ? 'open' : ''}`} />
        <span className={`hamburger-line ${open ? 'open' : ''}`} />
        <span className={`hamburger-line ${open ? 'open' : ''}`} />
      </button>
      {open && <div className="mobile-overlay" onClick={() => setOpen(false)} />}
      <div className={`mobile-drawer ${open ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <NavLink to="/profile" className="mobile-drawer-user" onClick={() => setOpen(false)} style={{ textDecoration: 'none', color: 'inherit' }}>
            {user.avatar ? (
              <img src={`/api/avatars/${user.avatar}`} alt="" className="topbar-avatar-img" />
            ) : (
              <span className="topbar-avatar">👤</span>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{user.role === 'admin' ? '管理员' : '员工'}</div>
            </div>
          </NavLink>
        </div>
        <nav className="mobile-drawer-nav">
          {visibleItems.map(item => (
            <NavLink key={item.key} to={item.path} className="mobile-nav-link" onClick={() => setOpen(false)}>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="mobile-drawer-footer">
          <button className="topbar-lang" onClick={toggleLang} style={{ width: '100%', justifyContent: 'center' }}>
            <span>{lang === 'zh' ? '🇨🇱' : '🇨🇳'}</span>
            <span>{lang === 'zh' ? 'Español' : '中文'}</span>
          </button>
          <button className="topbar-logout-btn" onClick={onLogout} style={{ width: '100%', justifyContent: 'center' }}>
            ↗ {t('logout')}
          </button>
        </div>
      </div>
    </>
  );
}

function AppInner() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('huatai_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [mobileOnly, setMobileOnly] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { t, toggleLang, lang } = useLang();

  useEffect(() => {
    getSettings()
      .then(({ data }) => {
        setMobileOnly(data.mobile_only === 'true');
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('huatai_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('huatai_user');
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem('huatai_user', JSON.stringify(updatedUser));
  };

  if (!settingsLoaded) return null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = user.role === 'admin';
  if (mobileOnly && !isMobileDevice() && !isAdmin) {
    return <DeviceBlockedScreen onLogout={handleLogout} />;
  }

  const can = (key) => hasNavPerm(user, key);
  const visibleItems = getVisibleNavItems(user);
  const defaultPath = isAdmin ? '/internal' : '/home';

  return (
    <Router>
      <div className="app">
        <header className="topbar">
          <Link to={defaultPath} className="topbar-left" style={{ textDecoration: 'none' }}>
            <img src="/Logo.jpg" alt="Huatai" className="topbar-logo" />
            <div className="topbar-brand">
              <span className="topbar-brand-name">Centro Comercial Huatai</span>
              <span className="topbar-brand-sub">{t('brandSub')}</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="topbar-nav desktop-only">
            {visibleItems.map(item => (
              <NavLink key={item.key} to={item.path} className="topbar-link">{t(item.labelKey)}</NavLink>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="topbar-right desktop-only">
            <button className="topbar-lang" onClick={toggleLang}>
              <span className="topbar-lang-icon">{lang === 'zh' ? '🇨🇱' : '🇨🇳'}</span>
              <span>{lang === 'zh' ? 'Español' : '中文'}</span>
            </button>
            <Link to="/profile" className="topbar-user-pill" style={{ textDecoration: 'none' }}>
              {user.avatar ? (
                <img src={`/api/avatars/${user.avatar}`} alt="" className="topbar-avatar-img" />
              ) : (
                <span className="topbar-avatar">👤</span>
              )}
              <span className="topbar-user-name">{user.name}</span>
            </Link>
            <button className="topbar-logout-btn" onClick={handleLogout}>
              <span className="topbar-logout-icon">↗</span>
              {t('logout')}
            </button>
          </div>

          {/* Mobile hamburger */}
          <MobileNav
            t={t}
            toggleLang={toggleLang}
            lang={lang}
            user={user}
            onLogout={handleLogout}
          />
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            {can('home') && <Route path="/home" element={isAdmin ? <Home /> : <StaffHome user={user} />} />}
            {can('schedule') && <Route path="/schedule" element={<Schedule user={user} />} />}
            {can('announcements') && <Route path="/announcements" element={<Announcements user={user} />} />}
            {can('attendance') && <Route path="/attendance" element={<Attendance user={user} />} />}
            <Route path="/profile" element={<Profile user={user} onUserUpdate={handleUserUpdate} />} />
            {can('employees') && (
              <>
                <Route path="/employees" element={<EmployeeList />} />
                <Route path="/employees/new" element={<EmployeeEdit />} />
                <Route path="/employees/:id/edit" element={<EmployeeEdit />} />
              </>
            )}
            {can('internal') && <Route path="/internal" element={<InternalManagement />} />}
            {can('whatsapp') && <Route path="/whatsapp" element={<WhatsAppPage />} />}
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

export default App;
