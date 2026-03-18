import React, { useState } from 'react';
import { loginUser } from '../api';
import { useLang } from '../i18n';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, toggleLang, lang } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await loginUser(username, password);
      onLogin({ name: data.name, role: data.role, username: data.username });
    } catch (err) {
      setError(t('loginError'));
    } finally {
      setLoading(false);
    }
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
          <div className="lang-toggle-pill">
            <button
              className={`lang-pill-btn${lang === 'zh' ? ' active' : ''}`}
              onClick={() => lang !== 'zh' && toggleLang()}
            >
              中文
            </button>
            <button
              className={`lang-pill-btn${lang === 'es' ? ' active' : ''}`}
              onClick={() => lang !== 'es' && toggleLang()}
            >
              Español
            </button>
          </div>
          <div>{t('loginFooter')}</div>
        </div>
      </div>
    </div>
  );
}
