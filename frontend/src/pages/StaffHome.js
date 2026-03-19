import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees, getAnnouncements, getSchedules, clockIn, clockOut, clockLunchOut, clockLunchIn, getClockRecords, getSettings } from '../api';
import { useLang } from '../i18n';

const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (ts) => ts ? new Date(ts).toTimeString().slice(0, 5) : null;

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkGeoFence(geoSettings) {
  return new Promise((resolve, reject) => {
    if (!geoSettings.enabled) return resolve({ ok: true });
    if (!navigator.geolocation) return reject(new Error('Geolocalización no soportada'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistance(pos.coords.latitude, pos.coords.longitude, parseFloat(geoSettings.lat), parseFloat(geoSettings.lng));
        resolve(dist <= parseFloat(geoSettings.radius) ? { ok: true, distance: Math.round(dist) } : { ok: false, distance: Math.round(dist), radius: geoSettings.radius });
      },
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function StaffHome({ user }) {
  const [now, setNow] = useState(new Date());
  const [employee, setEmployee] = useState(null);
  const [clockRec, setClockRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [weekSchedule, setWeekSchedule] = useState([]);
  const [geoSettings, setGeoSettings] = useState({ enabled: false });
  const [geoStatus, setGeoStatus] = useState(null);
  const navigate = useNavigate();
  const { t } = useLang();

  const today = new Date().toISOString().split('T')[0];
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load geo settings
  useEffect(() => {
    getSettings().then(({ data }) => {
      if (data.clock_geo_enabled === 'true' && data.clock_lat && data.clock_lng) {
        setGeoSettings({ enabled: true, lat: data.clock_lat, lng: data.clock_lng, radius: data.clock_radius || '200' });
      }
    }).catch(console.error);
  }, []);

  // Find current employee by matching user name
  useEffect(() => {
    getEmployees().then(({ data }) => {
      const me = data.find(e => e.name === user.name);
      setEmployee(me || null);
    }).catch(console.error);

    getAnnouncements().then(({ data }) => {
      setAnnouncements(data.slice(0, 5));
    }).catch(console.error);
  }, [user.name]);

  // Load this week's schedule
  useEffect(() => {
    if (!employee) return;
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    getSchedules(y, m).then(r => {
      const mine = r.data.filter(s => s.employee_id === employee.id);
      // Get this week's dates
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      const week = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const sched = mine.find(s => s.work_date?.split('T')[0] === dateStr);
        week.push({
          date: dateStr,
          day: d.toLocaleDateString('zh-CN', { weekday: 'short' }),
          dayNum: d.getDate(),
          shift: sched?.shift_value || null,
          isToday: dateStr === today,
        });
      }
      setWeekSchedule(week);
    }).catch(console.error);
  }, [employee, now, today]);

  // Load today's clock record
  const loadClock = useCallback(() => {
    if (!employee) return;
    getClockRecords(today).then(({ data }) => {
      const my = data.find(r => r.employee_id === employee.id);
      setClockRec(my || null);
    }).catch(console.error);
  }, [employee, today]);

  useEffect(() => { loadClock(); }, [loadClock]);

  const handleClock = async (type) => {
    if (!employee) return;
    setLoading(true);

    if (geoSettings.enabled) {
      try {
        setGeoStatus('checking');
        const result = await checkGeoFence(geoSettings);
        setGeoStatus(result);
        if (!result.ok) { setLoading(false); return; }
      } catch (err) {
        setGeoStatus({ ok: false, error: err.message });
        setLoading(false);
        return;
      }
    }

    try {
      if (type === 'in') await clockIn(employee.id);
      else if (type === 'lunch-out') await clockLunchOut(employee.id);
      else if (type === 'lunch-in') await clockLunchIn(employee.id);
      else await clockOut(employee.id);
      loadClock();
    } catch (err) {
      alert('操作失败 / Error');
    } finally {
      setLoading(false);
    }
  };

  const hasIn = !!clockRec?.clock_in;
  const hasLunchOut = !!clockRec?.lunch_out;
  const hasLunchIn = !!clockRec?.lunch_in;
  const hasOut = !!clockRec?.clock_out;
  const step = !hasIn ? 0 : !hasLunchOut ? 1 : !hasLunchIn ? 2 : !hasOut ? 3 : 4;

  const punches = [
    { key: 'in', label: '上班', doneLabel: '已上班', icon: '☀️', color: '#52c41a', time: clockRec?.clock_in, done: hasIn, active: step === 0 },
    { key: 'lunch-out', label: '午休开始', doneLabel: '已午休', icon: '🍽️', color: '#faad14', time: clockRec?.lunch_out, done: hasLunchOut, active: step === 1 },
    { key: 'lunch-in', label: '午休结束', doneLabel: '已返回', icon: '☕', color: '#1890ff', time: clockRec?.lunch_in, done: hasLunchIn, active: step === 2 },
    { key: 'out', label: '下班', doneLabel: '已下班', icon: '🌙', color: '#6c5ce7', time: clockRec?.clock_out, done: hasOut, active: step === 3 },
  ];

  // Calculate work hours (minus lunch)
  const calcWorkHours = () => {
    if (!hasIn || !hasOut) return null;
    const totalMs = new Date(clockRec.clock_out) - new Date(clockRec.clock_in);
    let lunchMs = 0;
    if (hasLunchOut && hasLunchIn) lunchMs = new Date(clockRec.lunch_in) - new Date(clockRec.lunch_out);
    return ((totalMs - lunchMs) / 3600000).toFixed(1);
  };

  const hour = now.getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  const shiftLabel = (v) => {
    if (!v) return '—';
    if (v === '9') return '全天';
    if (v === '7') return '半天';
    if (v === 'R') return '休息';
    return v;
  };
  const shiftColor = (v) => {
    if (v === '9') return '#6c5ce7';
    if (v === '7') return '#faad14';
    if (v === 'R') return '#bbb';
    return '#ddd';
  };

  return (
    <div className="staff-home">
      {/* Greeting + Clock */}
      <div className="staff-header">
        <div className="staff-greeting">
          <h1>{greeting}，{user.name}</h1>
          <p>{now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
      </div>

      <div className="staff-layout">
        {/* Left column: clock + schedule */}
        <div className="staff-main">
          {/* Clock-in card */}
          <div className="staff-clock-card">
            <div className="staff-clock-time">{timeStr}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {punches.map(p => (
                <button
                  key={p.key}
                  className={`staff-clock-btn ${p.done ? 'done' : p.active ? 'active-in' : 'disabled'}`}
                  onClick={() => p.active && !loading && handleClock(p.key)}
                  disabled={!p.active || loading}
                >
                  <span style={{ fontSize: 18 }}>{p.icon}</span>
                  <span className="staff-clock-btn-label" style={{ fontSize: 13 }}>
                    {p.done ? p.doneLabel : p.label}
                  </span>
                  <span className="staff-clock-btn-time" style={{ fontSize: 14 }}>
                    {p.done ? fmtTime(p.time) : '—'}
                  </span>
                </button>
              ))}
            </div>

            {/* Work hours summary */}
            {hasIn && hasOut && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  工时: <b style={{ color: '#fff' }}>{calcWorkHours()}h</b>
                </span>
                {hasLunchOut && hasLunchIn && (
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    午休: <b style={{ color: '#faad14' }}>{((new Date(clockRec.lunch_in) - new Date(clockRec.lunch_out)) / 60000).toFixed(0)}min</b>
                  </span>
                )}
              </div>
            )}

            {/* Progress dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
              {punches.map((p, i) => (
                <React.Fragment key={p.key}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, background: p.done ? p.color : p.active ? 'transparent' : 'rgba(255,255,255,0.1)',
                    color: p.done ? '#fff' : p.active ? p.color : 'rgba(255,255,255,0.3)',
                    border: p.active ? `2px solid ${p.color}` : 'none', fontWeight: 700,
                  }}>
                    {p.done ? '✓' : i + 1}
                  </div>
                  {i < 3 && <div style={{ flex: 1, maxWidth: 40, height: 2, background: punches[i + 1]?.done ? punches[i + 1].color : 'rgba(255,255,255,0.1)', borderRadius: 1 }} />}
                </React.Fragment>
              ))}
            </div>

            <div className="staff-clock-schedule">上班 10:00 — 下班 18:00</div>

            {geoStatus === 'checking' && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                📍 获取位置中...
              </div>
            )}
            {geoStatus && geoStatus !== 'checking' && !geoStatus.ok && (
              <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,77,79,0.2)', fontSize: 12, color: '#ff6b6b' }}>
                {geoStatus.error
                  ? `❌ ${geoStatus.error}`
                  : `❌ 不在范围内 (${geoStatus.distance}m / ${geoStatus.radius}m)`
                }
              </div>
            )}
            {geoStatus && geoStatus !== 'checking' && geoStatus.ok && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#73d13d' }}>
                ✓ 位置已验证 {geoStatus.distance ? `(${geoStatus.distance}m)` : ''}
              </div>
            )}
          </div>

          {/* Week schedule */}
          <div className="staff-section-card">
            <h3>本周排班</h3>
            <div className="staff-week">
              {weekSchedule.map(d => (
                <div key={d.date} className={`staff-week-day ${d.isToday ? 'today' : ''}`}>
                  <div className="staff-week-label">{d.day}</div>
                  <div className="staff-week-num">{d.dayNum}</div>
                  <div
                    className="staff-week-shift"
                    style={{ background: shiftColor(d.shift), color: d.shift && d.shift !== 'R' ? '#fff' : undefined }}
                  >
                    {shiftLabel(d.shift)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: announcements */}
        <div className="staff-sidebar">
          <div className="staff-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>公告通知</h3>
              <button className="btn btn-small btn-primary" onClick={() => navigate('/announcements')}>{t('homeViewAll')}</button>
            </div>
            {announcements.length === 0 ? (
              <div style={{ color: '#bbb', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>暂无公告</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {announcements.map(item => (
                  <div key={item.id} className="staff-announce-item" onClick={() => navigate('/announcements')}>
                    {item.pinned && <span className="staff-announce-pin">置顶</span>}
                    <div className="staff-announce-title">{item.title_es || item.title}</div>
                    <div className="staff-announce-date">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employee info card */}
          {employee && (
            <div className="staff-section-card staff-info-card">
              <h3>我的信息</h3>
              <div className="staff-info-row"><span>职位</span><span>{employee.position}</span></div>
              <div className="staff-info-row"><span>班组</span><span>{employee.shift_group || '未分配'}</span></div>
              <div className="staff-info-row"><span>区域</span><span>{employee.area || '未分配'}</span></div>
              <div className="staff-info-row"><span>状态</span><span>{employee.contract_status}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
