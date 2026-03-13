import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import EmployeeList from './pages/EmployeeList';
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
          <div className="topbar-left">
            <img src="/Logo.jpg" alt="Huatai" className="topbar-logo" />
            <div className="topbar-brand">
              <span className="topbar-brand-name">Centro Comercial Huatai</span>
              <span className="topbar-brand-sub">{t('brandSub')}</span>
            </div>
          </div>

          <nav className="topbar-nav">
            <NavLink to="/employees" className="topbar-link">{t('navEmployees')}</NavLink>
            <NavLink to="/schedule" className="topbar-link">{t('navSchedule')}</NavLink>
            <NavLink to="/announcements" className="topbar-link">{t('navAnnouncements')}</NavLink>
            <NavLink to="/internal" className="topbar-link">{t('navInternal')}</NavLink>
          </nav>

          <div className="topbar-right">
            <button className="lang-toggle" onClick={toggleLang}>
              {lang === 'zh' ? 'ES' : '中文'}
            </button>
            <span className="topbar-user">{user.name}</span>
            <button className="topbar-logout" onClick={handleLogout}>{t('logout')}</button>
          </div>
        </header>

        <main className="main">
          <Routes>
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/internal" element={<InternalManagement />} />
            <Route path="*" element={<Navigate to="/employees" replace />} />
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
