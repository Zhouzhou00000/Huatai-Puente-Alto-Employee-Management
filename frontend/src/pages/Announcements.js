import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, translateText } from '../api';
import { useLang } from '../i18n';
import ConfirmDialog from '../components/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';

function Announcements({ user }) {
  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', title_es: '', content_es: '', priority: 'normal', pinned: false });
  const [zhTitle, setZhTitle] = useState('');
  const [zhContent, setZhContent] = useState('');
  const [esTitle, setEsTitle] = useState('');
  const [esContent, setEsContent] = useState('');
  const [translating, setTranslating] = useState(false);
  const [transForm, setTransForm] = useState({ priority: 'normal', pinned: false });
  const [filterPriority, setFilterPriority] = useState('all');
  const [search, setSearch] = useState('');
  const { t } = useLang();
  const { confirmMessage, confirm, handleConfirm, handleCancel } = useConfirm();
  const titleTimer = useRef(null);
  const contentTimer = useRef(null);

  const PRIORITY_MAP = {
    urgent: { label: t('priorityUrgent'), className: 'badge-departed' },
    normal: { label: t('priorityNormal'), className: 'badge-active' },
    low:    { label: t('priorityLow'), className: 'badge-daily' },
  };

  const load = async () => {
    try {
      const { data } = await getAnnouncements();
      setList(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const doTranslate = useCallback(async (text, setter) => {
    if (!text.trim()) { setter(''); return; }
    try {
      const { data } = await translateText(text);
      setter(data.translated);
    } catch (err) {
      console.error('Translation error:', err);
    }
  }, []);

  // Auto-translate title with debounce
  useEffect(() => {
    if (!showTranslateModal) return;
    clearTimeout(titleTimer.current);
    if (!zhTitle.trim()) { setEsTitle(''); return; }
    titleTimer.current = setTimeout(() => doTranslate(zhTitle, setEsTitle), 600);
    return () => clearTimeout(titleTimer.current);
  }, [zhTitle, showTranslateModal, doTranslate]);

  // Auto-translate content with debounce
  useEffect(() => {
    if (!showTranslateModal) return;
    clearTimeout(contentTimer.current);
    if (!zhContent.trim()) { setEsContent(''); return; }
    contentTimer.current = setTimeout(() => doTranslate(zhContent, setEsContent), 600);
    return () => clearTimeout(contentTimer.current);
  }, [zhContent, showTranslateModal, doTranslate]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', content: '', title_es: '', content_es: '', priority: 'normal', pinned: false });
    setShowModal(true);
  };

  const openTranslate = () => {
    setZhTitle('');
    setZhContent('');
    setEsTitle('');
    setEsContent('');
    setTransForm({ priority: 'normal', pinned: false });
    setShowTranslateModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ title: item.title, content: item.content, title_es: item.title_es || '', content_es: item.content_es || '', priority: item.priority, pinned: item.pinned });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      if (editing) {
        await updateAnnouncement(editing.id, form);
      } else {
        await createAnnouncement(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTranslatePublish = async () => {
    if (!zhTitle.trim() && !esTitle.trim()) return;
    try {
      await createAnnouncement({
        title: zhTitle,
        content: zhContent,
        title_es: esTitle,
        content_es: esContent,
        priority: transForm.priority,
        pinned: transForm.pinned,
      });
      setShowTranslateModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualTranslate = async () => {
    setTranslating(true);
    try {
      const [titleRes, contentRes] = await Promise.all([
        zhTitle.trim() ? translateText(zhTitle) : { data: { translated: '' } },
        zhContent.trim() ? translateText(zhContent) : { data: { translated: '' } },
      ]);
      setEsTitle(titleRes.data.translated);
      setEsContent(contentRes.data.translated);
    } catch (err) {
      alert('翻译失败: ' + err.message);
    } finally {
      setTranslating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await confirm(t('confirmDeleteAnnouncement'))) return;
    try {
      await deleteAnnouncement(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div>
      <div className="toolbar">
        <h2 className="section-title" style={{ margin: 0 }}>{t('announcementsTitle')}</h2>
        {user?.role === 'admin' && (
          <div className="btn-group">
            <button className="btn btn-primary" onClick={openNew}>{t('publishAnnouncement')}</button>
            <button className="btn btn-success" onClick={openTranslate}>翻译发布</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="ann-filter-bar">
        <div className="ann-filter-tabs">
          {[
            { key: 'all', label: t('all') },
            { key: 'urgent', label: t('priorityUrgent') },
            { key: 'normal', label: t('priorityNormal') },
            { key: 'low', label: t('priorityLow') },
            { key: 'pinned', label: t('pinned') },
          ].map(f => (
            <button
              key={f.key}
              className={`ann-filter-tab ${filterPriority === f.key ? 'active' : ''}`}
              onClick={() => setFilterPriority(f.key)}
            >
              {f.label}
              <span className="ann-filter-count">
                {f.key === 'all' ? list.length
                  : f.key === 'pinned' ? list.filter(i => i.pinned).length
                  : list.filter(i => i.priority === f.key).length}
              </span>
            </button>
          ))}
        </div>
        <input
          className="ann-filter-search"
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {(() => {
        const isAdmin = user?.role === 'admin';
        const filtered = list.filter(item => {
          if (filterPriority === 'pinned' && !item.pinned) return false;
          if (filterPriority !== 'all' && filterPriority !== 'pinned' && item.priority !== filterPriority) return false;
          if (search) {
            const q = search.toLowerCase();
            const title = (isAdmin ? item.title : (item.title_es || item.title)) || '';
            const content = (isAdmin ? item.content : (item.content_es || item.content)) || '';
            if (!title.toLowerCase().includes(q) && !content.toLowerCase().includes(q)) return false;
          }
          return true;
        });

        if (filtered.length === 0) return <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>{t('noAnnouncements')}</p>;

        return (
      <div className="announcement-list">
        {filtered.map(item => {
          // Staff sees Spanish if available, otherwise Chinese
          const displayTitle = (!isAdmin && item.title_es) ? item.title_es : item.title;
          const displayContent = (!isAdmin && item.content_es) ? item.content_es : item.content;

          return (
            <div key={item.id} className={`announcement-card ${item.pinned ? 'pinned' : ''}`}>
              <div className="announcement-header">
                <div className="announcement-title-row">
                  {item.pinned && <span className="pin-badge">{t('pinned')}</span>}
                  <span className={`badge ${PRIORITY_MAP[item.priority]?.className || 'badge-active'}`}>
                    {PRIORITY_MAP[item.priority]?.label || item.priority}
                  </span>
                  <h3 className="announcement-title">{displayTitle}</h3>
                </div>
                {isAdmin && (
                  <div className="btn-group">
                    <button className="btn btn-small btn-primary" onClick={() => openEdit(item)}>{t('edit')}</button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(item.id)}>{t('delete')}</button>
                  </div>
                )}
              </div>
              <p className="announcement-content">{displayContent}</p>
              {isAdmin && item.title_es && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#16a34a' }}>
                  <strong>ES:</strong> {item.title_es} — {item.content_es}
                </div>
              )}
              <div className="announcement-meta">
                {formatDate(item.created_at)}
                {item.updated_at !== item.created_at && ` (${t('edited')})`}
              </div>
            </div>
          );
        })}
      </div>
        );
      })()}

      <ConfirmDialog message={confirmMessage} onConfirm={handleConfirm} onCancel={handleCancel} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? t('editAnnouncement') : t('newAnnouncement')}</h2>
            <div className="form-group">
              <label>{t('formTitle')} (中文)</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label>{t('formContent')} (中文)</label>
              <textarea rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Título (Español)</label>
              <input value={form.title_es} onChange={e => setForm({...form, title_es: e.target.value})} placeholder="Título en español..." />
            </div>
            <div className="form-group">
              <label>Contenido (Español)</label>
              <textarea rows={4} value={form.content_es} onChange={e => setForm({...form, content_es: e.target.value})} placeholder="Contenido en español..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('formPriority')}</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="urgent">{t('priorityUrgent')}</option>
                  <option value="normal">{t('priorityNormal')}</option>
                  <option value="low">{t('priorityLow')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('formPinned')}</label>
                <select value={form.pinned ? 'yes' : 'no'} onChange={e => setForm({...form, pinned: e.target.value === 'yes'})}>
                  <option value="no">{t('no')}</option>
                  <option value="yes">{t('yes')}</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowModal(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleSave}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {showTranslateModal && (
        <div className="modal-overlay" onClick={() => setShowTranslateModal(false)}>
          <div className="modal gt-modal" onClick={e => e.stopPropagation()}>
            <div className="gt-container">
              {/* Left: Chinese */}
              <div className="gt-panel gt-panel-source">
                <div className="gt-lang-bar">
                  <span className="gt-lang-tab active">中文</span>
                </div>
                <div className="gt-input-area">
                  <input
                    className="gt-title-input"
                    value={zhTitle}
                    onChange={e => setZhTitle(e.target.value)}
                    placeholder="输入中文标题..."
                  />
                  <textarea
                    className="gt-textarea"
                    value={zhContent}
                    onChange={e => setZhContent(e.target.value)}
                    placeholder="输入中文内容..."
                  />
                </div>
              </div>

              {/* Center: translate button */}
              <div className="gt-divider">
                <button
                  className="gt-swap-btn"
                  onClick={handleManualTranslate}
                  disabled={translating || (!zhTitle.trim() && !zhContent.trim())}
                  title="翻译"
                >
                  {translating ? (
                    <span className="gt-spinner" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Right: Spanish */}
              <div className="gt-panel gt-panel-target">
                <div className="gt-lang-bar">
                  <span className="gt-lang-tab active">Español</span>
                </div>
                <div className="gt-input-area">
                  <input
                    className="gt-title-input"
                    value={esTitle}
                    onChange={e => setEsTitle(e.target.value)}
                    placeholder="Traducción del título..."
                  />
                  <textarea
                    className="gt-textarea"
                    value={esContent}
                    onChange={e => setEsContent(e.target.value)}
                    placeholder="Traducción del contenido..."
                  />
                </div>
              </div>
            </div>

            {/* Options row */}
            <div className="gt-options">
              <div className="gt-option-group">
                <label>{t('formPriority')}</label>
                <select value={transForm.priority} onChange={e => setTransForm({...transForm, priority: e.target.value})}>
                  <option value="urgent">{t('priorityUrgent')}</option>
                  <option value="normal">{t('priorityNormal')}</option>
                  <option value="low">{t('priorityLow')}</option>
                </select>
              </div>
              <div className="gt-option-group">
                <label>{t('formPinned')}</label>
                <select value={transForm.pinned ? 'yes' : 'no'} onChange={e => setTransForm({...transForm, pinned: e.target.value === 'yes'})}>
                  <option value="no">{t('no')}</option>
                  <option value="yes">{t('yes')}</option>
                </select>
              </div>
            </div>

            <div className="gt-actions">
              <button className="btn" onClick={() => setShowTranslateModal(false)}>{t('cancel')}</button>
              <button
                className="btn btn-success"
                onClick={handleTranslatePublish}
                disabled={!zhTitle.trim() && !esTitle.trim()}
              >
                发布 / Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Announcements;
