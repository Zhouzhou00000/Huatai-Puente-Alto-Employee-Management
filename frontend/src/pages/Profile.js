import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { updateProfile, uploadAvatar } from '../api';

export default function Profile({ user, onUserUpdate }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const isEmployee = user.isEmployee;
  const avatarUrl = user.avatar ? `/api/avatars/${user.avatar}` : null;

  const handleAvatarClick = () => {
    if (isEmployee) return;
    fileRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user.id) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await uploadAvatar(user.id, formData);
      onUserUpdate({ ...user, avatar: data.avatar });
      showMsg(t('profileAvatarSuccess'), 'success');
    } catch (err) {
      showMsg(t('profileAvatarFail') + (err.response?.data?.error || err.message), 'error');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!user.id) {
      showMsg('无法保存：用户ID缺失，请重新登录', 'error');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      showMsg(t('profilePasswordMismatch'), 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { name };
      if (newPassword) payload.password = newPassword;
      if (isEmployee) payload.isEmployee = true;
      const { data } = await updateProfile(user.id, payload);
      onUserUpdate({ ...user, name: data.name });
      setNewPassword('');
      setConfirmPassword('');
      showMsg(t('profileSaveSuccess'), 'success');
    } catch (err) {
      showMsg(t('profileSaveFail') + (err.response?.data?.error || err.message), 'error');
    }
    setSaving(false);
  };

  const showMsg = (text, type) => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const roleLabel = user.role === 'admin' ? t('roleAdmin') : t('roleStaff');

  return (
    <div className="profile-page">
      <div className="profile-header-row">
        <button className="btn btn-outline btn-small" onClick={() => navigate(-1)}>
          ← {t('back') || '返回'}
        </button>
        <h2 className="profile-title" style={{ margin: 0 }}>{t('profileTitle')}</h2>
      </div>

      {msg && <div className={`profile-msg profile-msg-${msgType}`}>{msg}</div>}

      <div className="profile-card">
        {/* Avatar Section */}
        <div className="profile-avatar-section">
          <div
            className={`profile-avatar-wrap ${isEmployee ? 'no-upload' : ''}`}
            onClick={handleAvatarClick}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-placeholder">
                {(user.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            {!isEmployee && (
              <div className="profile-avatar-overlay">
                {uploading ? '...' : t('profileChangeAvatar')}
              </div>
            )}
          </div>
          {!isEmployee && (
            <input
              type="file"
              ref={fileRef}
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          )}
          <div className="profile-avatar-name">{user.name}</div>
          <div className="profile-avatar-role">{roleLabel}</div>
        </div>

        {/* Info Section */}
        <div className="profile-info-section">
          <div className="profile-field">
            <label>{t('profileUsername')}</label>
            <input type="text" value={user.username || user.name || ''} disabled className="profile-input disabled" />
          </div>

          <div className="profile-field">
            <label>{t('profileName')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="profile-input"
            />
          </div>

          <div className="profile-field">
            <label>{t('profileRole')}</label>
            <input type="text" value={roleLabel} disabled className="profile-input disabled" />
          </div>

          <div className="profile-divider" />
          <h3 className="profile-section-title">{t('profilePassword')}</h3>

          <div className="profile-field">
            <label>{t('profileNewPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="profile-input"
              placeholder="••••••"
            />
          </div>

          <div className="profile-field">
            <label>{t('profileConfirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="profile-input"
              placeholder="••••••"
            />
          </div>

          <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '...' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
