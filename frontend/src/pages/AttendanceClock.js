import React, { useState, useEffect, useCallback } from 'react';
import { getEmployees, getClockRecords, clockIn, clockOut } from '../api';

const fmt = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toTimeString().slice(0, 5);
};

const pad = (n) => String(n).padStart(2, '0');

export default function AttendanceClock() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState({}); // { employee_id: record }
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(null); // employee_id being processed
  const [tab, setTab] = useState('in'); // 'in' | 'out'

  const today = now.toISOString().split('T')[0];

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadRecords = useCallback(() => {
    getClockRecords(today).then(({ data }) => {
      const map = {};
      data.forEach(r => { map[r.employee_id] = r; });
      setRecords(map);
    }).catch(console.error);
  }, [today]);

  useEffect(() => {
    getEmployees().then(({ data }) => {
      setEmployees(data.filter(e => e.contract_status !== '已离职'));
    }).catch(console.error);
    loadRecords();
  }, [loadRecords]);

  const handleClock = async (emp, type) => {
    setLoading(emp.id);
    try {
      if (type === 'in') await clockIn(emp.id);
      else await clockOut(emp.id);
      loadRecords();
    } catch (err) {
      alert('操作失败: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  // Summary counts
  const inCount = Object.values(records).filter(r => r.clock_in).length;
  const outCount = Object.values(records).filter(r => r.clock_out).length;
  const total = employees.length;

  return (
    <div className="clock-page">
      {/* Header clock display */}
      <div className="clock-header">
        <div className="clock-time">{timeStr}</div>
        <div className="clock-date">{dateStr}</div>
        <div className="clock-summary">
          <span className="clock-summary-item">
            <span className="clock-summary-dot" style={{ background: '#52c41a' }} />
            已上班 {inCount}
          </span>
          <span className="clock-summary-item">
            <span className="clock-summary-dot" style={{ background: '#faad14' }} />
            已下班 {outCount}
          </span>
          <span className="clock-summary-item">
            <span className="clock-summary-dot" style={{ background: '#d9d9d9' }} />
            未打卡 {total - inCount}
          </span>
        </div>
      </div>

      {/* Tab */}
      <div className="clock-tabs">
        <button className={`clock-tab ${tab === 'in' ? 'active' : ''}`} onClick={() => setTab('in')}>
          上班打卡
        </button>
        <button className={`clock-tab ${tab === 'out' ? 'active' : ''}`} onClick={() => setTab('out')}>
          下班打卡
        </button>
      </div>

      {/* Employee grid */}
      <div className="clock-grid">
        {employees.map(emp => {
          const rec = records[emp.id];
          const clocked = tab === 'in' ? !!rec?.clock_in : !!rec?.clock_out;
          const timeDisplay = tab === 'in' ? fmt(rec?.clock_in) : fmt(rec?.clock_out);
          const isLoading = loading === emp.id;

          return (
            <div key={emp.id} className={`clock-card ${clocked ? 'clocked' : ''}`}>
              <div className="clock-card-avatar" style={{ background: clocked ? '#52c41a' : '#6c5ce7' }}>
                {emp.name.charAt(0)}
              </div>
              <div className="clock-card-info">
                <div className="clock-card-name">{emp.name}</div>
                <div className="clock-card-sub">{emp.position}{emp.shift_group ? ` · 组${emp.shift_group}` : ''}</div>
                {clocked && (
                  <div className="clock-card-time">
                    {tab === 'in' ? '上班' : '下班'} {timeDisplay}
                  </div>
                )}
              </div>
              <button
                className={`clock-btn ${clocked ? 'clocked' : ''}`}
                onClick={() => !clocked && !isLoading && handleClock(emp, tab)}
                disabled={isLoading}
              >
                {isLoading ? '...' : clocked ? '✓' : tab === 'in' ? '上班' : '下班'}
              </button>
            </div>
          );
        })}
        {employees.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#999' }}>暂无员工</div>
        )}
      </div>
    </div>
  );
}
