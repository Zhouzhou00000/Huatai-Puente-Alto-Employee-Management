import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees, getAnnouncements } from '../api';
import { useLang } from '../i18n';

export default function Home() {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, daily: 0, departed: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [soonExpiring, setSoonExpiring] = useState([]);
  const navigate = useNavigate();
  const { t, tStatus, tArea } = useLang();

  useEffect(() => {
    getEmployees().then(({ data }) => {
      setEmployees(data);
      setStats({
        total: data.length,
        active: data.filter(e => e.contract_status === '有合同-在职').length,
        trial: data.filter(e => e.contract_status === '试用期').length,
        daily: data.filter(e => e.contract_status === '日结/临时').length,
        departed: data.filter(e => e.contract_status === '已离职').length,
      });
      const today = new Date();
      setSoonExpiring(data.filter(e => {
        if (!e.contract_end_date || e.contract_status === '已离职') return false;
        const diff = (new Date(e.contract_end_date) - today) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
      }));
    }).catch(console.error);

    getAnnouncements().then(({ data }) => {
      setAnnouncements(data.slice(0, 3));
    }).catch(console.error);
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t('greetingMorning') : hour < 18 ? t('greetingAfternoon') : t('greetingEvening');

  const statCards = [
    { key: 'total', value: stats.total, label: t('homeTotal'), color: '#6c5ce7' },
    { key: 'active', value: stats.active, label: t('statActive'), color: '#28a745' },
    { key: 'trial', value: stats.trial, label: t('statTrial'), color: '#ffc107' },
    { key: 'daily', value: stats.daily, label: t('statDaily'), color: '#17a2b8' },
    { key: 'departed', value: stats.departed, label: t('statDeparted'), color: '#dc3545' },
  ];

  const activeEmployees = employees.filter(e => e.contract_status !== '已离职');

  // Report data
  const statusReport = useMemo(() => {
    const items = [
      { label: tStatus('有合同-在职'), count: stats.active, color: '#28a745' },
      { label: tStatus('试用期'), count: stats.trial, color: '#ff9800' },
      { label: tStatus('日结/临时'), count: stats.daily, color: '#17a2b8' },
      { label: tStatus('已离职'), count: stats.departed, color: '#dc3545' },
    ];
    const max = Math.max(...items.map(i => i.count), 1);
    return { items, max };
  }, [stats, tStatus]);

  const areaReport = useMemo(() => {
    const areaCount = {};
    activeEmployees.forEach(e => {
      const area = e.work_area || '未分配';
      areaCount[area] = (areaCount[area] || 0) + 1;
    });
    const areaColors = {
      '游乐园': '#e74c3c', '零售': '#3498db', '化妆品': '#e91e9a',
      '保安': '#2c3e50', '柜台': '#f39c12', '未分配': '#95a5a6',
    };
    const items = Object.entries(areaCount)
      .sort((a, b) => b[1] - a[1])
      .map(([area, count]) => ({ label: tArea(area), count, color: areaColors[area] || '#8e44ad' }));
    const max = Math.max(...items.map(i => i.count), 1);
    return { items, max };
  }, [activeEmployees, tArea]);

  const groupReport = useMemo(() => {
    const groupCount = {};
    activeEmployees.forEach(e => {
      const g = e.shift_group || t('reportNoGroup');
      groupCount[g] = (groupCount[g] || 0) + 1;
    });
    const groupColors = { A: '#6c5ce7', B: '#00b894', C: '#fdcb6e' };
    const items = Object.entries(groupCount)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([g, count]) => ({ label: `${t('group')} ${g}`, count, color: groupColors[g] || '#b2bec3' }));
    const max = Math.max(...items.map(i => i.count), 1);
    return { items, max };
  }, [activeEmployees, t]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: 16, padding: '36px 40px', marginBottom: 24,
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(108,92,231,0.15)' }} />
        <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 6, position: 'relative' }}>{greeting}</h1>
        <p style={{ fontSize: 15, opacity: 0.7, position: 'relative' }}>
          {now.toLocaleDateString(t('locale'), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {statCards.map(card => (
          <div key={card.key} style={{
            background: 'white', borderRadius: 14, padding: '22px 16px',
            textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderTop: `4px solid ${card.color}`,
          }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 8, fontWeight: 500 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Contract Expiring Soon */}
      {soonExpiring.length > 0 && (
        <div style={{
          background: '#fff8e1', borderRadius: 14, padding: '20px 24px',
          marginBottom: 24, borderLeft: '4px solid #ffc107',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#856404', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span> {t('contractExpiringSoon')}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {soonExpiring.map(e => (
              <span key={e.id} onClick={() => navigate(`/employees/${e.id}/edit`)} style={{
                padding: '6px 14px', background: 'white', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#5d4e37',
                border: '1px solid #ffc107',
              }}>
                {e.name} — {e.contract_end_date?.split('T')[0]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reports - 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Status Distribution */}
        <ReportCard title={t('reportByStatus')} data={statusReport} unit={t('reportPeople')} />
        {/* Area Distribution */}
        <ReportCard title={t('reportByArea')} data={areaReport} unit={t('reportPeople')} />
        {/* Group Distribution */}
        <ReportCard title={t('reportByGroup')} data={groupReport} unit={t('reportPeople')} />
      </div>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <div style={{
          background: 'white', borderRadius: 14, padding: '20px 24px',
          marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a5c', margin: 0 }}>{t('homeRecentAnnouncements')}</h3>
            <button className="btn btn-small btn-primary" onClick={() => navigate('/announcements')}>{t('homeViewAll')}</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {announcements.map(item => (
              <div key={item.id} style={{
                padding: '12px 16px', borderRadius: 8,
                background: item.pinned ? '#fffdf5' : '#f8f9fa',
                borderLeft: `3px solid ${item.pinned ? '#e53935' : '#6c5ce7'}`,
                cursor: 'pointer',
              }} onClick={() => navigate('/announcements')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.pinned && <span style={{ background: '#e53935', color: 'white', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{t('pinned')}</span>}
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{item.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee Data Table */}
      <div style={{
        background: 'white', borderRadius: 14, padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a5c', margin: 0 }}>
            {t('navEmployees')} ({activeEmployees.length})
          </h3>
          <button className="btn btn-small btn-primary" onClick={() => navigate('/employees')}>{t('homeViewAll')}</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                <th style={thStyle}>{t('colName')}</th>
                <th style={thStyle}>{t('colRut')}</th>
                <th style={thStyle}>{t('colPosition')}</th>
                <th style={thStyle}>{t('colStatus')}</th>
                <th style={thStyle}>{t('colGroup')}</th>
                <th style={thStyle}>{t('colArea')}</th>
                <th style={thStyle}>{t('colExpiry')}</th>
              </tr>
            </thead>
            <tbody>
              {activeEmployees.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#bbb' }}>{t('noData')}</td></tr>
              ) : (
                activeEmployees.map(emp => (
                  <tr key={emp.id} onClick={() => navigate(`/employees/${emp.id}/edit`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={tdStyle}><strong>{emp.name}</strong></td>
                    <td style={tdStyle}>{emp.rut || '—'}</td>
                    <td style={tdStyle}>{emp.position || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        background: statusBg(emp.contract_status), color: statusColor(emp.contract_status),
                      }}>{tStatus(emp.contract_status)}</span>
                    </td>
                    <td style={tdStyle}>{emp.shift_group || '—'}</td>
                    <td style={tdStyle}>{emp.work_area ? tArea(emp.work_area) : '—'}</td>
                    <td style={tdStyle}>{emp.contract_end_date ? emp.contract_end_date.split('T')[0] : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Reusable bar chart report card */
function ReportCard({ title, data, unit }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a5c', margin: '0 0 18px' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {data.items.map((item, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.count} {unit}</span>
            </div>
            <div style={{ height: 10, background: '#f0f2f5', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(item.count / data.max) * 100}%`,
                background: item.color,
                borderRadius: 5,
                transition: 'width 0.6s ease',
                minWidth: item.count > 0 ? 8 : 0,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const thStyle = { padding: '10px 12px', fontWeight: 600, color: '#555', fontSize: 12, borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 12px', whiteSpace: 'nowrap' };

function statusBg(s) {
  if (s === '有合同-在职') return '#e8f5e9';
  if (s === '试用期') return '#fff3e0';
  if (s === '日结/临时') return '#e3f2fd';
  if (s === '已离职') return '#fce4ec';
  return '#f5f5f5';
}

function statusColor(s) {
  if (s === '有合同-在职') return '#2e7d32';
  if (s === '试用期') return '#e65100';
  if (s === '日结/临时') return '#1565c0';
  if (s === '已离职') return '#c62828';
  return '#666';
}
