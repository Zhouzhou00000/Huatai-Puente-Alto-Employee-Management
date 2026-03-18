import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees, getAnnouncements, getSchedules, clockIn, clockOut, getClockRecords } from '../api';
import { useLang } from '../i18n';

const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (ts) => ts ? new Date(ts).toTimeString().slice(0, 5) : null;

export default function StaffHome({ user }) {
  const [now, setNow] = useState(new Date());
  const [employee, setEmployee] = useState(null);
  const [clockRec, setClockRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [weekSchedule, setWeekSchedule] = useState([]);
  const navigate = useNavigate();
  const { t } = useLang();

  const today = new Date().toISOString().split('T')[0];
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
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
    try {
      if (type === 'in') await clockIn(employee.id);
      else await clockOut(employee.id);
      loadClock();
    } catch (err) {
      alert('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const hasIn = !!clockRec?.clock_in;
  const hasOut = !!clockRec?.clock_out;
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

            <div className="staff-clock-actions">
              {/* Clock In */}
              <div className="staff-clock-col">
                <button
                  className={`staff-clock-btn ${hasIn ? 'done' : 'active-in'}`}
                  onClick={() => !hasIn && !loading && handleClock('in')}
                  disabled={hasIn || loading}
                >
                  <span className="staff-clock-btn-label">{hasIn ? '已上班' : '上班打卡'}</span>
                  <span className="staff-clock-btn-time">{hasIn ? fmtTime(clockRec.clock_in) : '—'}</span>
                </button>
              </div>

              {/* Clock Out */}
              <div className="staff-clock-col">
                <button
                  className={`staff-clock-btn ${hasOut ? 'done' : hasIn ? 'active-out' : 'disabled'}`}
                  onClick={() => hasIn && !hasOut && !loading && handleClock('out')}
                  disabled={!hasIn || hasOut || loading}
                >
                  <span className="staff-clock-btn-label">{hasOut ? '已下班' : '下班打卡'}</span>
                  <span className="staff-clock-btn-time">{hasOut ? fmtTime(clockRec.clock_out) : '—'}</span>
                </button>
              </div>
            </div>

            <div className="staff-clock-schedule">上班 09:00 — 下班 17:00</div>
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
                    <div className="staff-announce-title">{item.title}</div>
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
