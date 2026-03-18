import React, { useState, useEffect, useCallback } from 'react';
import { getEmployees, getClockRecords, clockIn, clockOut } from '../api';

const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (ts) => ts ? new Date(ts).toTimeString().slice(0, 5) : null;
const fmtDateStr = (d) => {
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
};
const shiftDate = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ========== Staff: personal clock-in view ==========
function StaffClock({ user }) {
  const [now, setNow] = useState(new Date());
  const [employee, setEmployee] = useState(null);
  const [clockRec, setClockRec] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getEmployees().then(({ data }) => {
      const me = data.find(e => e.name === user.name);
      setEmployee(me || null);
    }).catch(console.error);
  }, [user.name]);

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

  return (
    <div className="clock-page" style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="clock-header" style={{ borderRadius: 20, padding: '40px 32px' }}>
        <div className="clock-date" style={{ marginBottom: 8, opacity: 0.6 }}>{dateStr}</div>
        <div className="clock-time" style={{ fontSize: 64, marginBottom: 32 }}>{timeStr}</div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
          <button
            className={`staff-clock-btn ${hasIn ? 'done' : 'active-in'}`}
            onClick={() => !hasIn && !loading && handleClock('in')}
            disabled={hasIn || loading}
            style={{ flex: 1, maxWidth: 180 }}
          >
            <span className="staff-clock-btn-label">{hasIn ? '已上班' : '上班打卡'}</span>
            <span className="staff-clock-btn-time">{hasIn ? fmtTime(clockRec.clock_in) : '—'}</span>
          </button>

          <button
            className={`staff-clock-btn ${hasOut ? 'done' : hasIn ? 'active-out' : 'disabled'}`}
            onClick={() => hasIn && !hasOut && !loading && handleClock('out')}
            disabled={!hasIn || hasOut || loading}
            style={{ flex: 1, maxWidth: 180 }}
          >
            <span className="staff-clock-btn-label">{hasOut ? '已下班' : '下班打卡'}</span>
            <span className="staff-clock-btn-time">{hasOut ? fmtTime(clockRec.clock_out) : '—'}</span>
          </button>
        </div>

        <div style={{ fontSize: 13, opacity: 0.45 }}>上班 09:00 — 下班 17:00</div>
      </div>

      <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', marginTop: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a5c', margin: '0 0 12px' }}>今日记录</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>上班时间</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: hasIn ? '#52c41a' : '#ddd' }}>
              {hasIn ? fmtTime(clockRec.clock_in) : '--:--'}
            </div>
          </div>
          <div style={{ width: 1, background: '#f0f0f0' }} />
          <div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>下班时间</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: hasOut ? '#faad14' : '#ddd' }}>
              {hasOut ? fmtTime(clockRec.clock_out) : '--:--'}
            </div>
          </div>
          <div style={{ width: 1, background: '#f0f0f0' }} />
          <div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>工时</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#6c5ce7' }}>
              {hasIn && hasOut ? (() => {
                const diff = (new Date(clockRec.clock_out) - new Date(clockRec.clock_in)) / 3600000;
                return diff.toFixed(1) + 'h';
              })() : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== Admin: attendance management dashboard ==========
function AdminAttendance() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [now, setNow] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getEmployees().then(({ data }) => {
      setEmployees(data.filter(e => e.contract_status !== '已离职'));
    }).catch(console.error);
  }, []);

  const loadRecords = useCallback(() => {
    getClockRecords(date).then(({ data }) => {
      const map = {};
      data.forEach(r => { map[r.employee_id] = r; });
      setRecords(map);
    }).catch(console.error);
  }, [date]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleClock = async (empId, type) => {
    setLoading(empId);
    try {
      if (type === 'in') await clockIn(empId);
      else await clockOut(empId);
      loadRecords();
    } catch (err) {
      alert('操作失败: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  // Stats
  const inCount = Object.values(records).filter(r => r.clock_in).length;
  const outCount = Object.values(records).filter(r => r.clock_out).length;
  const notClocked = employees.length - inCount;
  const lateCount = Object.values(records).filter(r => {
    if (!r.clock_in) return false;
    const t = new Date(r.clock_in);
    return t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 15);
  }).length;

  // Compute hours
  const getHours = (rec) => {
    if (!rec?.clock_in || !rec?.clock_out) return null;
    return ((new Date(rec.clock_out) - new Date(rec.clock_in)) / 3600000).toFixed(1);
  };

  const getStatus = (rec) => {
    if (!rec?.clock_in) return 'none';
    if (rec.clock_in && rec.clock_out) return 'done';
    return 'working';
  };

  const isLate = (rec) => {
    if (!rec?.clock_in) return false;
    const t = new Date(rec.clock_in);
    return t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 15);
  };

  // Filter
  const filtered = employees.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    const rec = records[e.id];
    if (filter === 'in') return !!rec?.clock_in && !rec?.clock_out;
    if (filter === 'done') return !!rec?.clock_in && !!rec?.clock_out;
    if (filter === 'none') return !rec?.clock_in;
    if (filter === 'late') return isLate(rec);
    return true;
  });

  // Total hours
  const totalHours = Object.values(records).reduce((sum, r) => {
    const h = getHours(r);
    return sum + (h ? parseFloat(h) : 0);
  }, 0);

  return (
    <div className="admin-att">
      {/* Header bar */}
      <div className="admin-att-header">
        <div className="admin-att-header-left">
          <h2 className="admin-att-title">打卡管理</h2>
          {isToday && <span className="admin-att-live">{timeStr}</span>}
        </div>
        <div className="admin-att-date-nav">
          <button className="admin-att-nav-btn" onClick={() => setDate(d => shiftDate(d, -1))}>‹</button>
          <input
            type="date"
            className="admin-att-date-input"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
          />
          {!isToday && (
            <button className="admin-att-today-btn" onClick={() => setDate(today)}>今天</button>
          )}
          <button
            className="admin-att-nav-btn"
            onClick={() => setDate(d => shiftDate(d, 1))}
            disabled={isToday}
          >›</button>
        </div>
      </div>

      {/* Date display */}
      <div className="admin-att-date-label">{fmtDateStr(date)}</div>

      {/* Stats cards */}
      <div className="admin-att-stats">
        <div className="admin-att-stat-card" onClick={() => setFilter('all')}>
          <div className="admin-att-stat-num" style={{ color: '#1a3a5c' }}>{employees.length}</div>
          <div className="admin-att-stat-label">总员工</div>
        </div>
        <div className="admin-att-stat-card" onClick={() => setFilter('in')}>
          <div className="admin-att-stat-num" style={{ color: '#52c41a' }}>{inCount - outCount}</div>
          <div className="admin-att-stat-label">上班中</div>
        </div>
        <div className="admin-att-stat-card" onClick={() => setFilter('done')}>
          <div className="admin-att-stat-num" style={{ color: '#faad14' }}>{outCount}</div>
          <div className="admin-att-stat-label">已下班</div>
        </div>
        <div className="admin-att-stat-card" onClick={() => setFilter('none')}>
          <div className="admin-att-stat-num" style={{ color: '#bbb' }}>{notClocked}</div>
          <div className="admin-att-stat-label">未打卡</div>
        </div>
        <div className="admin-att-stat-card" onClick={() => setFilter('late')}>
          <div className="admin-att-stat-num" style={{ color: '#ff4d4f' }}>{lateCount}</div>
          <div className="admin-att-stat-label">迟到</div>
        </div>
        <div className="admin-att-stat-card">
          <div className="admin-att-stat-num" style={{ color: '#6c5ce7' }}>{totalHours.toFixed(1)}h</div>
          <div className="admin-att-stat-label">总工时</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-att-toolbar">
        <div className="admin-att-filters">
          {[
            { key: 'all', label: '全部' },
            { key: 'in', label: '上班中' },
            { key: 'done', label: '已下班' },
            { key: 'none', label: '未打卡' },
            { key: 'late', label: '迟到' },
          ].map(f => (
            <button
              key={f.key}
              className={`admin-att-filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="admin-att-search"
          placeholder="搜索员工..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="admin-att-table-wrap">
        <table className="admin-att-table">
          <thead>
            <tr>
              <th>员工</th>
              <th>职位</th>
              <th>组</th>
              <th>上班时间</th>
              <th>下班时间</th>
              <th>工时</th>
              <th>状态</th>
              {isToday && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const rec = records[emp.id];
              const status = getStatus(rec);
              const hours = getHours(rec);
              const late = isLate(rec);
              const isLoading = loading === emp.id;

              return (
                <tr key={emp.id} className={late ? 'admin-att-row-late' : ''}>
                  <td>
                    <div className="admin-att-emp">
                      <div className="admin-att-emp-avatar" style={{
                        background: status === 'done' ? '#52c41a' : status === 'working' ? '#1890ff' : '#ddd'
                      }}>
                        {emp.name.slice(-1)}
                      </div>
                      <span className="admin-att-emp-name">{emp.name}</span>
                    </div>
                  </td>
                  <td className="admin-att-td-secondary">{emp.position || '—'}</td>
                  <td className="admin-att-td-secondary">{emp.shift_group || '—'}</td>
                  <td>
                    {rec?.clock_in ? (
                      <span className={`admin-att-time ${late ? 'late' : ''}`}>
                        {fmtTime(rec.clock_in)}
                        {late && <span className="admin-att-late-tag">迟到</span>}
                      </span>
                    ) : (
                      <span className="admin-att-empty">—</span>
                    )}
                  </td>
                  <td>
                    {rec?.clock_out ? (
                      <span className="admin-att-time">{fmtTime(rec.clock_out)}</span>
                    ) : (
                      <span className="admin-att-empty">—</span>
                    )}
                  </td>
                  <td>
                    {hours ? (
                      <span className="admin-att-hours">{hours}h</span>
                    ) : (
                      <span className="admin-att-empty">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`admin-att-status admin-att-status-${status}`}>
                      {status === 'done' ? '已完成' : status === 'working' ? '上班中' : '未打卡'}
                    </span>
                  </td>
                  {isToday && (
                    <td>
                      <div className="admin-att-actions">
                        {!rec?.clock_in && (
                          <button
                            className="admin-att-action-btn in"
                            onClick={() => handleClock(emp.id, 'in')}
                            disabled={isLoading}
                          >
                            {isLoading ? '...' : '上班'}
                          </button>
                        )}
                        {rec?.clock_in && !rec?.clock_out && (
                          <button
                            className="admin-att-action-btn out"
                            onClick={() => handleClock(emp.id, 'out')}
                            disabled={isLoading}
                          >
                            {isLoading ? '...' : '下班'}
                          </button>
                        )}
                        {rec?.clock_in && rec?.clock_out && (
                          <span className="admin-att-action-done">✓</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="admin-att-empty-state">暂无数据</div>
        )}
      </div>

      {/* Footer summary */}
      <div className="admin-att-footer">
        共 {filtered.length} 名员工 · 已打卡 {inCount}/{employees.length} · 总工时 {totalHours.toFixed(1)}h
      </div>
    </div>
  );
}

// ========== Entry: route by role ==========
export default function Attendance({ user }) {
  const isAdmin = user?.role === 'admin';
  return isAdmin ? <AdminAttendance /> : <StaffClock user={user} />;
}
