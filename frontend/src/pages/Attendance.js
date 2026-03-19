import React, { useState, useEffect, useCallback } from 'react';
import { getEmployees, getClockRecords, clockIn, clockOut, clockLunchOut, clockLunchIn, getSchedules, getSettings, editClockRecord } from '../api';

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

// Work hours based on day of week (matches Schedule.js logic)
function getWorkHours(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay(); // 0=Sun
  if (dow === 0) return { start: '11:00', end: '18:00', label: '11:00–18:00' };
  if (dow === 6) return { start: '10:00', end: '20:00', label: '10:00–20:00' };
  return { start: '10:00', end: '18:00', label: '10:00–18:00' };
}

// Parse "HH:MM" to minutes since midnight
function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Haversine distance (meters)
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check if user is within allowed clock-in range
function checkGeoFence(geoSettings) {
  return new Promise((resolve, reject) => {
    if (!geoSettings.enabled) return resolve({ ok: true });
    if (!navigator.geolocation) return reject(new Error('浏览器不支持定位 / Geolocalización no soportada'));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistance(
          pos.coords.latitude, pos.coords.longitude,
          parseFloat(geoSettings.lat), parseFloat(geoSettings.lng)
        );
        if (dist <= parseFloat(geoSettings.radius)) {
          resolve({ ok: true, distance: Math.round(dist) });
        } else {
          resolve({ ok: false, distance: Math.round(dist), radius: geoSettings.radius });
        }
      },
      (err) => reject(new Error('无法获取位置 / No se pudo obtener ubicación: ' + err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ========== Staff: personal clock-in view ==========
function StaffClock({ user }) {
  const [now, setNow] = useState(new Date());
  const [employee, setEmployee] = useState(null);
  const [clockRec, setClockRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myShift, setMyShift] = useState(null);
  const [geoSettings, setGeoSettings] = useState({ enabled: false });
  const [geoStatus, setGeoStatus] = useState(null); // null | 'checking' | { ok, distance }

  const today = new Date().toISOString().split('T')[0];
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const todayHours = getWorkHours(today);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load geo settings
  useEffect(() => {
    getSettings().then(({ data }) => {
      if (data.clock_geo_enabled === 'true' && data.clock_lat && data.clock_lng) {
        setGeoSettings({
          enabled: true,
          lat: data.clock_lat,
          lng: data.clock_lng,
          radius: data.clock_radius || '200',
        });
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    getEmployees().then(({ data }) => {
      const me = data.find(e => e.name === user.name);
      setEmployee(me || null);
    }).catch(console.error);
  }, [user.name]);

  useEffect(() => {
    if (!employee) return;
    const [y, m] = today.split('-').map(Number);
    getSchedules(y, m).then(({ data }) => {
      const rec = data.find(s => s.employee_id === employee.id && s.work_date?.startsWith(today));
      setMyShift(rec?.shift_value || null);
    }).catch(console.error);
  }, [employee, today]);

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

    // Geo-fence check
    if (geoSettings.enabled) {
      try {
        setGeoStatus('checking');
        const result = await checkGeoFence(geoSettings);
        setGeoStatus(result);
        if (!result.ok) {
          setLoading(false);
          return;
        }
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
      if (geoSettings.enabled) setGeoStatus(prev => prev?.ok ? prev : null);
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
  const isRest = myShift === 'R';

  // Determine current step: 0=need clock_in, 1=need lunch_out, 2=need lunch_in, 3=need clock_out, 4=all done
  const step = !hasIn ? 0 : !hasLunchOut ? 1 : !hasLunchIn ? 2 : !hasOut ? 3 : 4;

  // Calculate actual work hours (total time minus lunch break)
  const calcWorkHours = () => {
    if (!hasIn || !hasOut) return null;
    const totalMs = new Date(clockRec.clock_out) - new Date(clockRec.clock_in);
    let lunchMs = 0;
    if (hasLunchOut && hasLunchIn) {
      lunchMs = new Date(clockRec.lunch_in) - new Date(clockRec.lunch_out);
    }
    return ((totalMs - lunchMs) / 3600000).toFixed(1);
  };

  const workHours = calcWorkHours();

  // 4 punch buttons config
  const punches = [
    { key: 'in', label: '上班', labelEs: 'Entrada', doneLabel: '已上班', icon: '☀️', color: '#52c41a', time: clockRec?.clock_in, done: hasIn, active: step === 0 },
    { key: 'lunch-out', label: '午休开始', labelEs: 'Almuerzo', doneLabel: '已午休', icon: '🍽️', color: '#faad14', time: clockRec?.lunch_out, done: hasLunchOut, active: step === 1 },
    { key: 'lunch-in', label: '午休结束', labelEs: 'Regreso', doneLabel: '已返回', icon: '☕', color: '#1890ff', time: clockRec?.lunch_in, done: hasLunchIn, active: step === 2 },
    { key: 'out', label: '下班', labelEs: 'Salida', doneLabel: '已下班', icon: '🌙', color: '#6c5ce7', time: clockRec?.clock_out, done: hasOut, active: step === 3 },
  ];

  return (
    <div className="clock-page" style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="clock-header" style={{ borderRadius: 20, padding: '40px 32px' }}>
        <div className="clock-date" style={{ marginBottom: 8, opacity: 0.6 }}>{dateStr}</div>
        <div className="clock-time" style={{ fontSize: 64, marginBottom: 32 }}>{timeStr}</div>

        {isRest ? (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ffd700', marginBottom: 8 }}>今日休息</div>
            <div style={{ fontSize: 13, opacity: 0.5 }}>Día de descanso</div>
          </div>
        ) : (
          <>
            {/* 4 punch buttons in 2x2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {punches.map(p => (
                <button
                  key={p.key}
                  className={`staff-clock-btn ${p.done ? 'done' : p.active ? 'active-in' : 'disabled'}`}
                  onClick={() => p.active && !loading && handleClock(p.key)}
                  disabled={!p.active || loading}
                  style={{ position: 'relative' }}
                >
                  <span style={{ fontSize: 20, marginBottom: 2, display: 'block' }}>{p.icon}</span>
                  <span className="staff-clock-btn-label" style={{ fontSize: 14 }}>
                    {p.done ? p.doneLabel : p.label}
                  </span>
                  <span className="staff-clock-btn-time" style={{ fontSize: 12 }}>
                    {p.done ? fmtTime(p.time) : p.labelEs}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 13, opacity: 0.45 }}>
              {myShift === '9' ? `上班 ${todayHours.start} — 下班 ${todayHours.end}` : '排班未设置 / Sin turno'}
            </div>

            {geoStatus === 'checking' && (
              <div style={{ marginTop: 12, padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                📍 正在获取位置... / Obteniendo ubicación...
              </div>
            )}
            {geoStatus && geoStatus !== 'checking' && !geoStatus.ok && (
              <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 10, background: 'rgba(255,77,79,0.2)', fontSize: 13, color: '#ff6b6b' }}>
                {geoStatus.error
                  ? <span>❌ {geoStatus.error}</span>
                  : <span>❌ 不在打卡范围内 / Fuera del rango ({geoStatus.distance}m / {geoStatus.radius}m)</span>
                }
              </div>
            )}
            {geoStatus && geoStatus !== 'checking' && geoStatus.ok && (
              <div style={{ marginTop: 12, padding: '8px 16px', borderRadius: 10, background: 'rgba(82,196,26,0.15)', fontSize: 13, color: '#73d13d' }}>
                ✓ 位置验证通过 / Ubicación verificada {geoStatus.distance ? `(${geoStatus.distance}m)` : ''}
              </div>
            )}
          </>
        )}
      </div>

      {/* Today's record summary */}
      <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', marginTop: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a3a5c', margin: '0 0 12px' }}>今日记录 / Registro de hoy</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>上班</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: hasIn ? '#52c41a' : '#ddd' }}>
              {hasIn ? fmtTime(clockRec.clock_in) : '--:--'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>午休开始</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: hasLunchOut ? '#faad14' : '#ddd' }}>
              {hasLunchOut ? fmtTime(clockRec.lunch_out) : '--:--'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>午休结束</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: hasLunchIn ? '#1890ff' : '#ddd' }}>
              {hasLunchIn ? fmtTime(clockRec.lunch_in) : '--:--'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>下班</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: hasOut ? '#6c5ce7' : '#ddd' }}>
              {hasOut ? fmtTime(clockRec.clock_out) : '--:--'}
            </div>
          </div>
        </div>

        {/* Work hours summary bar */}
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8f9fa', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#999' }}>实际工时 / Horas trabajadas</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#6c5ce7' }}>
              {workHours ? workHours + 'h' : '—'}
            </div>
          </div>
          {hasLunchOut && hasLunchIn && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#999' }}>午休时长 / Almuerzo</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#faad14' }}>
                {((new Date(clockRec.lunch_in) - new Date(clockRec.lunch_out)) / 60000).toFixed(0)} min
              </div>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
          {punches.map((p, i) => (
            <React.Fragment key={p.key}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13,
                background: p.done ? p.color : p.active ? '#fff' : '#f0f0f0',
                color: p.done ? '#fff' : p.active ? p.color : '#ccc',
                border: p.active ? `2px solid ${p.color}` : 'none',
                fontWeight: 700,
              }}>
                {p.done ? '✓' : i + 1}
              </div>
              {i < 3 && (
                <div style={{ flex: 1, height: 2, background: punches[i + 1]?.done ? punches[i + 1].color : '#eee', borderRadius: 1 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== Admin: attendance management dashboard ==========
function AdminAttendance() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState({});
  const [scheduleMap, setScheduleMap] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [now, setNow] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(null);
  const [editModal, setEditModal] = useState(null); // { empId, empName, clock_in, clock_out, lunch_out, lunch_in }
  const [editSaving, setEditSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateHours = getWorkHours(date);

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

  // Load schedule data for the selected date's month
  const loadSchedules = useCallback(() => {
    const [y, m] = date.split('-').map(Number);
    getSchedules(y, m).then(({ data }) => {
      const map = {};
      data.forEach(s => {
        const d = s.work_date?.split('T')[0];
        if (d === date) map[s.employee_id] = s.shift_value;
      });
      setScheduleMap(map);
    }).catch(console.error);
  }, [date]);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const getEmpShift = (empId) => scheduleMap[empId] || null;

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

  const openEdit = (emp) => {
    const rec = records[emp.id];
    setEditModal({
      empId: emp.id,
      empName: emp.name,
      clock_in: fmtTime(rec?.clock_in) || '',
      clock_out: fmtTime(rec?.clock_out) || '',
      lunch_out: fmtTime(rec?.lunch_out) || '',
      lunch_in: fmtTime(rec?.lunch_in) || '',
    });
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    setEditSaving(true);
    try {
      await editClockRecord({
        employee_id: editModal.empId,
        date,
        clock_in: editModal.clock_in || '',
        clock_out: editModal.clock_out || '',
        lunch_out: editModal.lunch_out || '',
        lunch_in: editModal.lunch_in || '',
      });
      setEditModal(null);
      loadRecords();
    } catch (err) {
      alert('保存失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setEditSaving(false);
    }
  };

  // Compute hours (subtract lunch break)
  const getHours = (rec) => {
    if (!rec?.clock_in || !rec?.clock_out) return null;
    const totalMs = new Date(rec.clock_out) - new Date(rec.clock_in);
    let lunchMs = 0;
    if (rec.lunch_out && rec.lunch_in) {
      lunchMs = new Date(rec.lunch_in) - new Date(rec.lunch_out);
    }
    return ((totalMs - lunchMs) / 3600000).toFixed(1);
  };

  const getStatus = (rec) => {
    if (!rec?.clock_in) return 'none';
    if (rec.clock_in && rec.clock_out) return 'done';
    return 'working';
  };

  const isLate = (rec, empId) => {
    if (!rec?.clock_in) return false;
    const shift = getEmpShift(empId);
    if (shift === 'R') return false;
    const t = new Date(rec.clock_in);
    const clockMin = t.getHours() * 60 + t.getMinutes();
    const startMin = timeToMin(dateHours.start) + 15;
    return clockMin > startMin;
  };

  // Stats
  const inCount = Object.values(records).filter(r => r.clock_in).length;
  const outCount = Object.values(records).filter(r => r.clock_out).length;
  const notClocked = employees.length - inCount;
  const lateCount = Object.entries(records).filter(([empId, r]) => {
    return isLate(r, Number(empId));
  }).length;

  // Schedule stats
  const restCount = employees.filter(e => getEmpShift(e.id) === 'R').length;
  const workingScheduled = employees.filter(e => getEmpShift(e.id) === '9').length;

  // Filter
  const filtered = employees.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    const rec = records[e.id];
    const shift = getEmpShift(e.id);
    if (filter === 'in') return !!rec?.clock_in && !rec?.clock_out;
    if (filter === 'done') return !!rec?.clock_in && !!rec?.clock_out;
    if (filter === 'none') return !rec?.clock_in && shift !== 'R';
    if (filter === 'late') return isLate(rec, e.id);
    if (filter === 'rest') return shift === 'R';
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

      {/* Date display + work hours */}
      <div className="admin-att-date-label">
        {fmtDateStr(date)}
        <span style={{ marginLeft: 16, fontSize: 13, color: '#6c5ce7', fontWeight: 600 }}>
          {dateHours.label}
        </span>
      </div>

      {/* Stats cards */}
      <div className="admin-att-stats">
        <div className="admin-att-stat-card" onClick={() => setFilter('all')}>
          <div className="admin-att-stat-num" style={{ color: '#1a3a5c' }}>{employees.length}</div>
          <div className="admin-att-stat-label">总员工</div>
        </div>
        <div className="admin-att-stat-card" onClick={() => setFilter('all')}>
          <div className="admin-att-stat-num" style={{ color: '#3498db' }}>{workingScheduled}</div>
          <div className="admin-att-stat-label">应到</div>
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
        <div className="admin-att-stat-card" onClick={() => setFilter('rest')}>
          <div className="admin-att-stat-num" style={{ color: '#e17055' }}>{restCount}</div>
          <div className="admin-att-stat-label">休息</div>
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
            { key: 'rest', label: '休息' },
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
              <th>区域</th>
              <th>排班</th>
              <th>班次时间</th>
              <th>上班</th>
              <th>午休出</th>
              <th>午休回</th>
              <th>下班</th>
              <th>工时</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const rec = records[emp.id];
              const status = getStatus(rec);
              const hours = getHours(rec);
              const late = isLate(rec, emp.id);
              const isLoading = loading === emp.id;
              const shift = getEmpShift(emp.id);
              const isRest = shift === 'R';

              return (
                <tr key={emp.id} className={`${late ? 'admin-att-row-late' : ''} ${isRest ? 'admin-att-row-rest' : ''}`}>
                  <td>
                    <div className="admin-att-emp">
                      <div className="admin-att-emp-avatar" style={{
                        background: isRest ? '#e17055' : status === 'done' ? '#52c41a' : status === 'working' ? '#1890ff' : '#ddd'
                      }}>
                        {emp.name.slice(-1)}
                      </div>
                      <span className="admin-att-emp-name">{emp.name}</span>
                    </div>
                  </td>
                  <td className="admin-att-td-secondary">{emp.area || '—'}</td>
                  <td>
                    {isRest ? (
                      <span className="admin-att-shift-badge rest">休息</span>
                    ) : shift === '9' ? (
                      <span className="admin-att-shift-badge work">上班</span>
                    ) : (
                      <span className="admin-att-shift-badge none">未排</span>
                    )}
                  </td>
                  <td className="admin-att-td-secondary">
                    {isRest ? '—' : shift === '9' ? dateHours.label : '—'}
                  </td>
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
                    {rec?.lunch_out ? (
                      <span className="admin-att-time">{fmtTime(rec.lunch_out)}</span>
                    ) : (
                      <span className="admin-att-empty">—</span>
                    )}
                  </td>
                  <td>
                    {rec?.lunch_in ? (
                      <span className="admin-att-time">{fmtTime(rec.lunch_in)}</span>
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
                    {isRest ? (
                      <span className="admin-att-status admin-att-status-rest">休息日</span>
                    ) : (
                      <span className={`admin-att-status admin-att-status-${status}`}>
                        {status === 'done' ? '已完成' : status === 'working' ? '上班中' : '未打卡'}
                      </span>
                    )}
                  </td>
                  <td>
                    {isRest ? (
                      <span className="admin-att-empty">—</span>
                    ) : (
                      <div className="admin-att-actions">
                        {isToday && !rec?.clock_in && (
                          <button
                            className="admin-att-action-btn in"
                            onClick={() => handleClock(emp.id, 'in')}
                            disabled={isLoading}
                          >
                            {isLoading ? '...' : '上班'}
                          </button>
                        )}
                        {isToday && rec?.clock_in && !rec?.clock_out && (
                          <button
                            className="admin-att-action-btn out"
                            onClick={() => handleClock(emp.id, 'out')}
                            disabled={isLoading}
                          >
                            {isLoading ? '...' : '下班'}
                          </button>
                        )}
                        <button
                          className="admin-att-action-btn edit"
                          onClick={() => openEdit(emp)}
                          title="编辑打卡时间"
                        >
                          编辑
                        </button>
                      </div>
                    )}
                  </td>
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

      {/* Edit modal */}
      {editModal && (
        <div className="att-edit-overlay" onClick={() => setEditModal(null)}>
          <div className="att-edit-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#1a3a5c' }}>
              编辑打卡记录
            </h3>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              {editModal.empName} · {fmtDateStr(date)}
            </div>
            <div className="att-edit-fields">
              <div className="att-edit-field">
                <label>上班 Entrada</label>
                <input
                  type="time"
                  value={editModal.clock_in}
                  onChange={e => setEditModal(m => ({ ...m, clock_in: e.target.value }))}
                />
                {editModal.clock_in && (
                  <button className="att-edit-clear" onClick={() => setEditModal(m => ({ ...m, clock_in: '' }))}>清除</button>
                )}
              </div>
              <div className="att-edit-field">
                <label>午休出 Almuerzo</label>
                <input
                  type="time"
                  value={editModal.lunch_out}
                  onChange={e => setEditModal(m => ({ ...m, lunch_out: e.target.value }))}
                />
                {editModal.lunch_out && (
                  <button className="att-edit-clear" onClick={() => setEditModal(m => ({ ...m, lunch_out: '' }))}>清除</button>
                )}
              </div>
              <div className="att-edit-field">
                <label>午休回 Regreso</label>
                <input
                  type="time"
                  value={editModal.lunch_in}
                  onChange={e => setEditModal(m => ({ ...m, lunch_in: e.target.value }))}
                />
                {editModal.lunch_in && (
                  <button className="att-edit-clear" onClick={() => setEditModal(m => ({ ...m, lunch_in: '' }))}>清除</button>
                )}
              </div>
              <div className="att-edit-field">
                <label>下班 Salida</label>
                <input
                  type="time"
                  value={editModal.clock_out}
                  onChange={e => setEditModal(m => ({ ...m, clock_out: e.target.value }))}
                />
                {editModal.clock_out && (
                  <button className="att-edit-clear" onClick={() => setEditModal(m => ({ ...m, clock_out: '' }))}>清除</button>
                )}
              </div>
            </div>
            <div className="att-edit-actions">
              <button className="att-edit-cancel" onClick={() => setEditModal(null)}>取消</button>
              <button className="att-edit-save" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Entry: route by role ==========
export default function Attendance({ user }) {
  const isAdmin = user?.role === 'admin';
  return isAdmin ? <AdminAttendance /> : <StaffClock user={user} />;
}
