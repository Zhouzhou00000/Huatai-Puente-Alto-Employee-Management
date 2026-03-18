import React, { useState, useEffect } from 'react';
import { getEmployees, updateEmployee, getSchedules, getAnnouncements, sendWhatsApp, sendWhatsAppBatch, testWhatsApp, getSettings, updateSetting } from '../api';
import { useLang } from '../i18n';

// Turno hours (same logic as Schedule.js)
function getWorkHours(dow, turno) {
  if (turno === 2) {
    if (dow === 0) return '11:00–18:00';
    if (dow === 6) return '11:00–20:00';
    return '11:30–20:00';
  }
  if (dow === 0) return 'Libre';
  if (dow === 6) return '10:00–20:00';
  return '10:00–18:00';
}

const LUNCH_SLOTS = { A: '12:30–13:30', B: '13:30–14:30', C: '14:30–15:30' };

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_NAMES_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function WhatsApp() {
  const [employees, setEmployees] = useState([]);
  const [msgType, setMsgType] = useState('schedule');
  const [customMsg, setCustomMsg] = useState('');
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState(new Set());
  const [editingPhone, setEditingPhone] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState({}); // { empId: 'sent' | 'failed' | 'sending' }
  const [waStatus, setWaStatus] = useState(null); // null=loading, object=result
  const [showConfig, setShowConfig] = useState(false);
  const [waToken, setWaToken] = useState('');
  const [waPhoneId, setWaPhoneId] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const { t, lang } = useLang();

  const dayNames = lang === 'zh' ? DAY_NAMES_ZH : DAY_NAMES_ES;

  const load = async () => {
    try {
      const [empRes, settingsRes] = await Promise.all([
        getEmployees(),
        getSettings(),
      ]);
      const active = empRes.data.filter(e => e.contract_status !== '已离职');
      setEmployees(active);
      setSelectedEmps(new Set(active.filter(e => e.phone).map(e => e.id)));

      // Load settings
      setWaToken(settingsRes.data.wa_token || '');
      setWaPhoneId(settingsRes.data.wa_phone_id || '');

      // Load current week schedule
      const now = new Date();
      const { data: sched } = await getSchedules(now.getFullYear(), now.getMonth() + 1);
      setScheduleData(sched);

      const { data: anns } = await getAnnouncements();
      setAnnouncements(anns);
      if (anns.length > 0) setSelectedAnn(anns[0]);

      // Test WhatsApp connection
      const { data: status } = await testWhatsApp();
      setWaStatus(status);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSelect = (id) => {
    setSelectedEmps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedEmps(new Set(employees.filter(e => e.phone).map(e => e.id)));
  };
  const selectNone = () => setSelectedEmps(new Set());

  const savePhone = async (emp) => {
    try {
      await updateEmployee(emp.id, { ...emp, phone: phoneInput });
      setEditingPhone(null);
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await Promise.all([
        updateSetting('wa_token', waToken),
        updateSetting('wa_phone_id', waPhoneId),
      ]);
      const { data: status } = await testWhatsApp();
      setWaStatus(status);
      if (status.connected) setShowConfig(false);
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSavingConfig(false);
  };

  // Generate schedule message for an employee
  const generateScheduleMsg = (emp) => {
    const now = new Date();
    const monday = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + diff);

    const turno = emp.turno || 1;
    const group = emp.shift_group || '-';
    const lunch = LUNCH_SLOTS[group] || '-';

    let msg = `📋 *Horario Semanal / 本周排班*\n`;
    msg += `👤 ${emp.name}\n`;
    msg += `📅 Semana: ${monday.getDate()}/${monday.getMonth() + 1}/${monday.getFullYear()}\n`;
    msg += `🔄 Turno ${turno} | Grupo ${group}\n`;
    msg += `🍽️ Almuerzo: ${lunch}\n\n`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dow = d.getDay();
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      const hours = getWorkHours(dow, turno);

      const schedKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const sched = scheduleData.find(s => s.employee_id === emp.id && s.work_date?.split('T')[0] === schedKey);
      const isRest = sched?.shift_value === 'R';

      const dayLabel = dayNames[dow];
      if (isRest || hours === 'Libre') {
        msg += `${dayLabel} ${dateStr}: 🟢 Libre / 休息\n`;
      } else {
        msg += `${dayLabel} ${dateStr}: ${hours}\n`;
      }
    }

    msg += `\n_Centro Comercial Huatai_`;
    return msg;
  };

  const generateAnnouncementMsg = (ann) => {
    if (!ann) return '';
    const priority = ann.priority === 'urgent' ? '🔴 URGENTE' : ann.priority === 'low' ? '🔵' : '🟡';
    let msg = `${priority} *${ann.title}*\n\n`;
    msg += `${ann.content}\n\n`;
    msg += `_Centro Comercial Huatai_`;
    return msg;
  };

  const getMessage = (emp) => {
    if (msgType === 'schedule') return generateScheduleMsg(emp);
    if (msgType === 'announcement') return generateAnnouncementMsg(selectedAnn);
    return customMsg;
  };

  // Send single message via API
  const handleSendOne = async (emp) => {
    setSendResults(prev => ({ ...prev, [emp.id]: 'sending' }));
    try {
      await sendWhatsApp(emp.phone, getMessage(emp));
      setSendResults(prev => ({ ...prev, [emp.id]: 'sent' }));
    } catch (err) {
      setSendResults(prev => ({ ...prev, [emp.id]: 'failed' }));
      const errMsg = err.response?.data?.error || err.message;
      alert(`${emp.name}: ${errMsg}`);
    }
  };

  // Send batch via API
  const handleSendAll = async () => {
    const toSend = employees.filter(e => selectedEmps.has(e.id) && e.phone);
    if (toSend.length === 0) return;

    setSending(true);
    // Mark all as sending
    const newResults = {};
    toSend.forEach(e => { newResults[e.id] = 'sending'; });
    setSendResults(prev => ({ ...prev, ...newResults }));

    try {
      const recipients = toSend.map(emp => ({
        phone: emp.phone,
        message: getMessage(emp),
        employeeId: emp.id,
        employeeName: emp.name,
      }));

      const { data } = await sendWhatsAppBatch(recipients);

      // Update results
      const updatedResults = {};
      data.results.forEach(r => {
        updatedResults[r.employeeId] = r.success ? 'sent' : 'failed';
      });
      setSendResults(prev => ({ ...prev, ...updatedResults }));

      // Show summary
      if (data.failed > 0) {
        const failedNames = data.results.filter(r => !r.success).map(r => `${r.name}: ${r.error}`).join('\n');
        alert(`${t('waSentCount')}: ${data.sent}/${data.total}\n\n${t('waFailedList')}:\n${failedNames}`);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      alert(errMsg);
      // Mark all as failed
      toSend.forEach(e => {
        setSendResults(prev => ({ ...prev, [e.id]: 'failed' }));
      });
    }
    setSending(false);
  };

  const withPhone = employees.filter(e => e.phone);
  const withoutPhone = employees.filter(e => !e.phone);
  const selectedCount = employees.filter(e => selectedEmps.has(e.id) && e.phone).length;
  const sentCount = Object.values(sendResults).filter(v => v === 'sent').length;

  const previewEmp = employees.find(e => selectedEmps.has(e.id) && e.phone) || employees[0];
  const previewMsg = previewEmp ? getMessage(previewEmp) : '';

  const isConfigured = waStatus?.configured && waStatus?.connected;

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{t('waTitle')}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Connection status */}
          <span className={`wa-status-badge ${isConfigured ? 'connected' : 'disconnected'}`}>
            {isConfigured ? `✓ ${t('waConnected')}` : `✕ ${t('waNotConfigured')}`}
          </span>
          <button className="btn btn-small" onClick={() => setShowConfig(!showConfig)}>
            {t('waConfig')}
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="wa-config-panel">
          <h3>{t('waConfigTitle')}</h3>
          <p className="wa-config-help">{t('waConfigHelp')}</p>
          <div className="form-group">
            <label>WhatsApp Phone Number ID</label>
            <input
              value={waPhoneId}
              onChange={e => setWaPhoneId(e.target.value)}
              placeholder="123456789012345"
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div className="form-group">
            <label>Access Token</label>
            <input
              type="password"
              value={waToken}
              onChange={e => setWaToken(e.target.value)}
              placeholder="EAAxxxxxxxxx..."
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          {waStatus && !waStatus.connected && waStatus.error && (
            <div className="wa-config-error">{waStatus.error}</div>
          )}
          {waStatus?.connected && (
            <div className="wa-config-success">
              ✓ {t('waConnected')}: {waStatus.name} ({waStatus.phoneNumber})
            </div>
          )}
          <div className="form-actions">
            <button className="btn" onClick={() => setShowConfig(false)}>{t('cancel')}</button>
            <button className="btn btn-success" onClick={saveConfig} disabled={savingConfig}>
              {savingConfig ? '...' : t('save')}
            </button>
          </div>
        </div>
      )}

      {/* Message type selector */}
      <div className="wa-type-cards">
        <button className={`wa-type-card ${msgType === 'schedule' ? 'active' : ''}`} onClick={() => setMsgType('schedule')}>
          <span className="wa-type-icon">📋</span>
          <span className="wa-type-label">{t('waSchedule')}</span>
          <span className="wa-type-desc">{t('waScheduleDesc')}</span>
        </button>
        <button className={`wa-type-card ${msgType === 'announcement' ? 'active' : ''}`} onClick={() => setMsgType('announcement')}>
          <span className="wa-type-icon">📢</span>
          <span className="wa-type-label">{t('waAnnouncement')}</span>
          <span className="wa-type-desc">{t('waAnnouncementDesc')}</span>
        </button>
        <button className={`wa-type-card ${msgType === 'custom' ? 'active' : ''}`} onClick={() => setMsgType('custom')}>
          <span className="wa-type-icon">✏️</span>
          <span className="wa-type-label">{t('waCustom')}</span>
          <span className="wa-type-desc">{t('waCustomDesc')}</span>
        </button>
      </div>

      <div className="wa-layout">
        {/* Left: message config + preview */}
        <div className="wa-left">
          {msgType === 'announcement' && (
            <div className="wa-config-section">
              <label>{t('waSelectAnnouncement')}</label>
              <select
                value={selectedAnn?.id || ''}
                onChange={e => setSelectedAnn(announcements.find(a => a.id === Number(e.target.value)))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0' }}
              >
                {announcements.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          )}

          {msgType === 'custom' && (
            <div className="wa-config-section">
              <label>{t('waCustomMessage')}</label>
              <textarea
                rows={6}
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                placeholder={t('waCustomPlaceholder')}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #e0e0e0', resize: 'vertical', fontSize: 14 }}
              />
            </div>
          )}

          {/* Preview */}
          <div className="wa-preview">
            <div className="wa-preview-header">
              <span>{t('waPreview')}</span>
              {sentCount > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.9 }}>
                  {t('waSentCount')}: {sentCount}
                </span>
              )}
            </div>
            <div className="wa-preview-body">
              <div className="wa-bubble">
                {previewMsg.split('\n').map((line, i) => (
                  <span key={i}>
                    {line.replace(/\*(.*?)\*/g, '⟨$1⟩').replace(/_(.*?)_/g, '$1')}
                    {i < previewMsg.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: employee list */}
        <div className="wa-right">
          <div className="wa-list-header">
            <div className="wa-list-title">
              <span>{t('waRecipients')} ({selectedCount}/{withPhone.length})</span>
              {withoutPhone.length > 0 && (
                <span className="wa-no-phone-hint">
                  {t('waNoPhone')}: {withoutPhone.length}
                </span>
              )}
            </div>
            <div className="btn-group">
              <button className="btn btn-small" onClick={selectAll}>{t('waSelectAll')}</button>
              <button className="btn btn-small" onClick={selectNone}>{t('waSelectNone')}</button>
            </div>
          </div>

          <div className="wa-emp-list">
            {employees.map(emp => {
              const hasPhone = !!emp.phone;
              const isSelected = selectedEmps.has(emp.id);
              const status = sendResults[emp.id]; // 'sent' | 'failed' | 'sending' | undefined
              const isEditing = editingPhone === emp.id;

              return (
                <div key={emp.id} className={`wa-emp-row ${!hasPhone ? 'no-phone' : ''} ${status === 'sent' ? 'sent' : ''} ${status === 'failed' ? 'failed' : ''}`}>
                  <div className="wa-emp-check">
                    <input
                      type="checkbox"
                      checked={isSelected && hasPhone}
                      disabled={!hasPhone}
                      onChange={() => toggleSelect(emp.id)}
                    />
                  </div>
                  <div className="wa-emp-info">
                    <div className="wa-emp-name">
                      {emp.name}
                      {status === 'sent' && <span className="wa-sent-badge">✓ {t('waSent')}</span>}
                      {status === 'failed' && <span className="wa-failed-badge">✕ {t('waFailed')}</span>}
                      {status === 'sending' && <span className="wa-sending-badge">⏳</span>}
                    </div>
                    <div className="wa-emp-meta">
                      {emp.shift_group && <span>Grupo {emp.shift_group}</span>}
                      {emp.turno && <span>T{emp.turno}</span>}
                    </div>
                  </div>
                  <div className="wa-emp-phone">
                    {isEditing ? (
                      <div className="wa-phone-edit">
                        <input
                          value={phoneInput}
                          onChange={e => setPhoneInput(e.target.value)}
                          placeholder="+56 9 1234 5678"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') savePhone(emp);
                            if (e.key === 'Escape') setEditingPhone(null);
                          }}
                        />
                        <button className="btn btn-success btn-small" onClick={() => savePhone(emp)}>✓</button>
                        <button className="btn btn-small" onClick={() => setEditingPhone(null)}>✕</button>
                      </div>
                    ) : (
                      <div className="wa-phone-display">
                        <span className={hasPhone ? 'wa-phone-num' : 'wa-phone-empty'}
                          onClick={() => { setEditingPhone(emp.id); setPhoneInput(emp.phone || ''); }}
                        >
                          {hasPhone ? emp.phone : t('waAddPhone')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="wa-emp-actions">
                    {hasPhone && (
                      <button
                        className="btn btn-success btn-small wa-send-btn"
                        onClick={() => handleSendOne(emp)}
                        disabled={status === 'sending' || !isConfigured}
                        title="WhatsApp"
                      >
                        {status === 'sending' ? '...' : t('waSend')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Send all button */}
          <div className="wa-send-all-bar">
            <button
              className="btn btn-success wa-send-all-btn"
              disabled={selectedCount === 0 || sending || !isConfigured}
              onClick={handleSendAll}
            >
              {sending
                ? t('waSending')
                : `${t('waSendAll')} (${selectedCount})`
              }
            </button>
            {!isConfigured && (
              <div className="wa-send-all-hint">{t('waConfigRequired')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
