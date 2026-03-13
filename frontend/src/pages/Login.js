import React, { useState } from 'react';
import { useLang } from '../i18n';

const USERS = [
  { username: 'admin', password: 'huatai2026', name: '管理员', role: 'admin' },
  { username: 'xingting', password: '123456', name: '李兴婷', role: 'admin' },
  { username: 'zhengmiao', password: '123456', name: '郑淼', role: 'admin' },
  { username: 'juancarlos', password: '1234', name: 'Juan Carlos', role: 'staff' },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, toggleLang, lang } = useLang();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const user = USERS.find(u => u.username === username && u.password === password);
      if (user) {
        onLogin({ name: user.name, role: user.role, username: user.username });
      } else {
        setError(t('loginError'));
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/Logo.jpg" alt="Huatai" className="login-logo-img" />
          <h1>Centro Comercial Huatai</h1>
          <p>{t('loginTitle')}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label>{t('loginUsername')}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t('loginPlaceholderUser')}
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label>{t('loginPassword')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('loginPlaceholderPass')}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? t('loginLoading') : t('loginBtn')}
          </button>
        </form>

        <div className="login-footer">
          <button className="lang-toggle" onClick={toggleLang} style={{ marginBottom: 8 }}>
            {lang === 'zh' ? 'Español' : '中文'}
          </button>
          <div>{t('loginFooter')}</div>
        </div>
      </div>
    </div>
  );
}
