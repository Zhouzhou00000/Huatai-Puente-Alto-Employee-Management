import React, { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../api';
import { useLang } from '../i18n';

function Announcements() {
  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', pinned: false });
  const { t } = useLang();

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

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', content: '', priority: 'normal', pinned: false });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ title: item.title, content: item.content, priority: item.priority, pinned: item.pinned });
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

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDeleteAnnouncement'))) return;
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
        <button className="btn btn-primary" onClick={openNew}>{t('publishAnnouncement')}</button>
      </div>

      {list.length === 0 && <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>{t('noAnnouncements')}</p>}

      <div className="announcement-list">
        {list.map(item => (
          <div key={item.id} className={`announcement-card ${item.pinned ? 'pinned' : ''}`}>
            <div className="announcement-header">
              <div className="announcement-title-row">
                {item.pinned && <span className="pin-badge">{t('pinned')}</span>}
                <span className={`badge ${PRIORITY_MAP[item.priority]?.className || 'badge-active'}`}>
                  {PRIORITY_MAP[item.priority]?.label || item.priority}
                </span>
                <h3 className="announcement-title">{item.title}</h3>
              </div>
              <div className="btn-group">
                <button className="btn btn-small btn-primary" onClick={() => openEdit(item)}>{t('edit')}</button>
                <button className="btn btn-small btn-danger" onClick={() => handleDelete(item.id)}>{t('delete')}</button>
              </div>
            </div>
            <p className="announcement-content">{item.content}</p>
            <div className="announcement-meta">
              {formatDate(item.created_at)}
              {item.updated_at !== item.created_at && ` (${t('edited')})`}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? t('editAnnouncement') : t('newAnnouncement')}</h2>
            <div className="form-group">
              <label>{t('formTitle')}</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label>{t('formContent')}</label>
              <textarea rows={5} value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
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
    </div>
  );
}

export default Announcements;
