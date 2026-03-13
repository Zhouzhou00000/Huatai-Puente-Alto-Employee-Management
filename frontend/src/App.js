import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, Link } from 'react-router-dom';
import Home from './pages/Home';
import EmployeeList from './pages/EmployeeList';
import EmployeeEdit from './pages/EmployeeEdit';
import Schedule from './pages/Schedule';
import Announcements from './pages/Announcements';
import InternalManagement from './pages/InternalManagement';
import Login from './pages/Login';
import { LanguageProvider, useLang } from './i18n';
import './App.css';

function AppInner() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('huatai_user');
    return saved ? JSON.parse(saved) : null;
  });
  const { t, toggleLang, lang } = useLang();

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('huatai_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('huatai_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <header className="topbar">
          <Link to="/" className="topbar-left" style={{ textDecoration: 'none' }}>
            <img src="/Logo.jpg" alt="Huatai" className="topbar-logo" />
            <div className="topbar-brand">
              <span className="topbar-brand-name">Centro Comercial Huatai</span>
              <span className="topbar-brand-sub">{t('brandSub')}</span>
            </div>
          </Link>

          <nav className="topbar-nav">
            <NavLink to="/" end className="topbar-link">{t('navHome')}</NavLink>
            <NavLink to="/employees" className="topbar-link">{t('navEmployees')}</NavLink>
            <NavLink to="/schedule" className="topbar-link">{t('navSchedule')}</NavLink>
            <NavLink to="/announcements" className="topbar-link">{t('navAnnouncements')}</NavLink>
            <NavLink to="/internal" className="topbar-link">{t('navInternal')}</NavLink>
          </nav>

          <div className="topbar-right">
            <button className="topbar-lang" onClick={toggleLang}>
              <span className="topbar-lang-icon">{lang === 'zh' ? '🇨🇱' : '🇨🇳'}</span>
              <span>{lang === 'zh' ? 'Español' : '中文'}</span>
            </button>
            <div className="topbar-user-pill">
              <span className="topbar-avatar">👤</span>
              <span className="topbar-user-name">{user.name}</span>
            </div>
            <button className="topbar-logout-btn" onClick={handleLogout}>
              <span className="topbar-logout-icon">↗</span>
              {t('logout')}
            </button>
          </div>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/employees/new" element={<EmployeeEdit />} />
            <Route path="/employees/:id/edit" element={<EmployeeEdit />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/internal" element={<InternalManagement />} />
            <Route path="*" element={<Navigate to="/" replace />} />
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
