import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees, getAnnouncements, getAttendance, setAttendance, getSchedules, getClockRecords } from '../api';
import { useLang } from '../i18n';

function getWorkHours(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  if (dow === 0) return { start: '11:00', end: '18:00' };
  if (dow === 6) return { start: '10:00', end: '20:00' };
  return { start: '10:00', end: '18:00' };
}

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function Home() {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, daily: 0, departed: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [soonExpiring, setSoonExpiring] = useState([]);
  const [attendance, setAttendanceMap] = useState({}); // { employee_id: status }
  const [attendanceNote, setAttendanceNote] = useState({}); // { employee_id: note }
  const [scheduleMap, setScheduleMap] = useState({}); // { employee_id: shift_value }
  const [clockMap, setClockMap] = useState({}); // { employee_id: { clock_in, clock_out } }
  const navigate = useNavigate();
  const { t, tStatus, tArea } = useLang();

  const today = new Date().toISOString().split('T')[0];

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

    getAttendance(today).then(({ data }) => {
      const map = {}, noteMap = {};
      data.forEach(r => { map[r.employee_id] = r.status; noteMap[r.employee_id] = r.note || ''; });
      setAttendanceMap(map);
      setAttendanceNote(noteMap);
    }).catch(console.error);

    // Load schedule for today
    const [y, m] = today.split('-').map(Number);
    getSchedules(y, m).then(({ data }) => {
      const map = {};
      data.forEach(s => {
        const d = s.work_date?.split('T')[0];
        if (d === today) map[s.employee_id] = s.shift_value;
      });
      setScheduleMap(map);
    }).catch(console.error);

    // Load clock records for today
    getClockRecords(today).then(({ data }) => {
      const map = {};
      data.forEach(r => { map[r.employee_id] = r; });
      setClockMap(map);
    }).catch(console.error);
  }, [today]);

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

  const handleAttendance = async (empId, status) => {
    setAttendanceMap(prev => ({ ...prev, [empId]: status }));
    try {
      await setAttendance(empId, today, status, attendanceNote[empId] || '');
    } catch (err) {
      console.error(err);
    }
  };

  const ATTENDANCE_STATUSES = ['在场', '请假', '缺勤', '休息'];
  const attendanceStyle = {
    '在场':  { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
    '请假':  { bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
    '缺勤':  { bg: '#fce4ec', color: '#c62828', border: '#f48fb1' },
    '休息':  { bg: '#f5f5f5', color: '#757575', border: '#e0e0e0' },
  };

  const attendanceSummary = activeEmployees.reduce((acc, e) => {
    const s = attendance[e.id] || '未记录';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>

      {/* Main content */}
      <div style={{ minWidth: 0 }}>

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
        <ReportCard title={t('reportByStatus')} data={statusReport} unit={t('reportPeople')} />
        <ReportCard title={t('reportByArea')} data={areaReport} unit={t('reportPeople')} />
        <ReportCard title={t('reportByGroup')} data={groupReport} unit={t('reportPeople')} />
      </div>

      {/* Today Attendance */}
      <div style={{ background: 'white', borderRadius: 14, padding: '24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a5c', margin: 0 }}>
            今日考勤 — {today}
          </h3>
          <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
            {[['在场', '#2e7d32'], ['请假', '#f57f17'], ['缺勤', '#c62828'], ['休息', '#757575'], ['未记录', '#aaa']].map(([label, color]) => (
              attendanceSummary[label] > 0 && (
                <span key={label} style={{ color, fontWeight: 600 }}>
                  {label} {attendanceSummary[label]}
                </span>
              )
            ))}
          </div>
        </div>
        <div className="attendance-grid">
          {activeEmployees.map(emp => {
            const status = attendance[emp.id];
            const shift = scheduleMap[emp.id];
            const clock = clockMap[emp.id];
            const isRest = shift === 'R';
            const hasClockIn = !!clock?.clock_in;
            const hasClockOut = !!clock?.clock_out;
            const fmtT = (ts) => ts ? new Date(ts).toTimeString().slice(0, 5) : null;

            // Card color based on clock status
            let cardColor;
            if (isRest) {
              cardColor = { bg: '#f5f5f5', border: '#e0e0e0', badgeBg: '#e17055', badgeText: '休息日' };
            } else if (hasClockIn) {
              const todayHours = getWorkHours(today);
              const clockInTime = new Date(clock.clock_in);
              const clockMin = clockInTime.getHours() * 60 + clockInTime.getMinutes();
              const startMin = timeToMin(todayHours.start) + 15;
              if (clockMin > startMin) {
                cardColor = { bg: '#ffebee', border: '#ef9a9a', badgeBg: '#f44336', badgeText: '迟到' };
              } else {
                cardColor = { bg: '#e8f5e9', border: '#81c784', badgeBg: '#52c41a', badgeText: '已到' };
              }
            } else {
              cardColor = { bg: '#e3f2fd', border: '#90caf9', badgeBg: '#3498db', badgeText: '上班' };
            }

            return (
              <div key={emp.id} className="attendance-card" style={{ borderColor: cardColor.border, background: cardColor.bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="attendance-name">{emp.name}</div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: cardColor.badgeBg, color: '#fff', fontWeight: 600 }}>{cardColor.badgeText}</span>
                </div>
                <div className="attendance-sub">{emp.position}{emp.shift_group ? ` · 组${emp.shift_group}` : ''}</div>

                {/* Clock info */}
                {(hasClockIn || hasClockOut) && (
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, margin: '4px 0 2px', color: '#555' }}>
                    {hasClockIn && <span style={{ color: '#52c41a', fontWeight: 600 }}>上班 {fmtT(clock.clock_in)}</span>}
                    {hasClockOut && <span style={{ color: '#faad14', fontWeight: 600 }}>下班 {fmtT(clock.clock_out)}</span>}
                    {hasClockIn && hasClockOut && (
                      <span style={{ color: '#6c5ce7', fontWeight: 600 }}>
                        {((new Date(clock.clock_out) - new Date(clock.clock_in)) / 3600000).toFixed(1)}h
                      </span>
                    )}
                  </div>
                )}

                <div className="attendance-btns">
                  {ATTENDANCE_STATUSES.map(s => {
                    const st = attendanceStyle[s];
                    return (
                      <button
                        key={s}
                        className={`attendance-btn ${status === s ? 'active' : ''}`}
                        style={status === s ? { background: st.color, color: '#fff', borderColor: st.color } : {}}
                        onClick={() => handleAttendance(emp.id, s)}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      </div>{/* end main content */}

      {/* Sidebar - Announcements */}
      <div style={{ position: 'sticky', top: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c', margin: 0 }}>{t('homeRecentAnnouncements')}</h3>
            <button className="btn btn-small btn-primary" onClick={() => navigate('/announcements')}>{t('homeViewAll')}</button>
          </div>
          {announcements.length === 0 ? (
            <div style={{ color: '#bbb', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>暂无公告</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {announcements.map(item => (
                <div key={item.id} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: item.pinned ? '#fffdf5' : '#f8f9fa',
                  borderLeft: `3px solid ${item.pinned ? '#e53935' : '#6c5ce7'}`,
                  cursor: 'pointer',
                }} onClick={() => navigate('/announcements')}>
                  {item.pinned && (
                    <span style={{ background: '#e53935', color: 'white', padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 600, display: 'inline-block', marginBottom: 4 }}>
                      {t('pinned')}
                    </span>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
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

