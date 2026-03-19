import React, { useState, useEffect, useCallback } from 'react';
import { getEmployees, getSchedules, getClockMonth, updateSchedule, batchUpdateSchedules } from '../api';
import { useLang } from '../i18n';
import ConfirmDialog from '../components/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';

const SHIFT_CYCLE = ['9', 'R'];

// Lunch slots by group (fixed, no rotation)
const LUNCH_SLOTS = {
  A: { label: '12:30 - 13:30', short: '12:30' },
  B: { label: '13:30 - 14:30', short: '13:30' },
  C: { label: '14:30 - 15:30', short: '14:30' },
};

function getLunchSlot(group) {
  return LUNCH_SLOTS[group] || null;
}

// Turno Nº1: Lun-Vie 10:00-18:00, Sáb 10:00-20:00, Dom Libre
// Turno Nº2: Lun-Vie 11:30-20:00 (1 día libre), Sáb 11:00-20:00, Dom 11:00-18:00
function getWorkHours(dow, turno) {
  if (turno === 2) {
    if (dow === 0) return { start: '11:00', end: '18:00', label: '11:00–18:00' };
    if (dow === 6) return { start: '11:00', end: '20:00', label: '11:00–20:00' };
    return { start: '11:30', end: '20:00', label: '11:30–20:00' };
  }
  // Turno 1 (default)
  if (dow === 0) return { start: '', end: '', label: 'Libre' };
  if (dow === 6) return { start: '10:00', end: '20:00', label: '10:00–20:00' };
  return { start: '10:00', end: '18:00', label: '10:00–18:00' };
}

function getISOWeek(year, month, day) {
  const date = new Date(year, month - 1, day);
  const tmp = new Date(date.valueOf());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year, month, day) {
  return new Date(year, month - 1, day).getDay();
}

function getShortName(name) {
  const cnMatch = name.match(/[（(](.+?)[）)]/);
  if (cnMatch) return cnMatch[1];
  const parts = name.split(' ');
  if (parts.length >= 2) return parts[0] + ' ' + parts[1].charAt(0) + '.';
  return name;
}

const GROUP_COLORS = {
  A: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
  B: { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
  C: { bg: '#fff3e0', border: '#ff9800', text: '#e65100' },
};

const AREAS = ['游乐园', '零售', '化妆品', '保安', '柜台'];
const AREA_COLORS = {
  '游乐园': { bg: '#fce4ec', border: '#e91e63', text: '#880e4f' },
  '零售':   { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
  '化妆品': { bg: '#f3e5f5', border: '#9c27b0', text: '#6a1b9a' },
  '保安':   { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
  '柜台':   { bg: '#fff3e0', border: '#ff9800', text: '#e65100' },
};

// ========== Staff: personal schedule view ==========
function StaffSchedule({ user }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employee, setEmployee] = useState(null);
  const [scheduleMap, setScheduleMap] = useState({});
  const [clockMap, setClockMap] = useState({});
  const { t } = useLang();

  const daysInMonth = getDaysInMonth(year, month);

  useEffect(() => {
    getEmployees().then(({ data }) => {
      const me = data.find(e => e.name === user.name);
      setEmployee(me || null);
    }).catch(console.error);
  }, [user.name]);

  useEffect(() => {
    if (!employee) return;
    getSchedules(year, month).then(({ data }) => {
      const map = {};
      data.filter(s => s.employee_id === employee.id).forEach(s => {
        const day = new Date(s.work_date).getDate();
        map[day] = s.shift_value;
      });
      setScheduleMap(map);
    }).catch(console.error);

    // Load clock records for this month (single API call)
    getClockMonth(year, month, employee.id).then(({ data }) => {
      const cmap = {};
      data.forEach(r => {
        const day = new Date(r.date).getDate();
        cmap[day] = r;
      });
      setClockMap(cmap);
    }).catch(console.error);
  }, [employee, year, month]);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); };

  const lunchSlot = employee?.shift_group ? getLunchSlot(employee.shift_group) : null;
  const groupColor = employee?.shift_group ? GROUP_COLORS[employee.shift_group] : null;

  // Calendar grid (Monday first)
  const firstDow = getDayOfWeek(year, month, 1);
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const calDays = [];
  for (let i = 0; i < totalCells; i++) {
    const d = i - startOffset + 1;
    calDays.push(d >= 1 && d <= daysInMonth ? d : null);
  }

  const dayNames = t('dayNames');
  const isToday = (d) => d && year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate();

  // Stats
  const workDays = Object.values(scheduleMap).filter(v => v === '9').length;
  const restDays = Object.values(scheduleMap).filter(v => v === 'R').length;
  const clockedDays = Object.values(clockMap).filter(r => r.clock_in && r.clock_out).length;

  // Total work hours this month
  const totalHours = Object.values(clockMap).reduce((sum, r) => {
    if (!r.clock_in || !r.clock_out) return sum;
    const total = new Date(r.clock_out) - new Date(r.clock_in);
    let lunch = 0;
    if (r.lunch_out && r.lunch_in) lunch = new Date(r.lunch_in) - new Date(r.lunch_out);
    return sum + (total - lunch) / 3600000;
  }, 0);

  const fmtTime = (ts) => ts ? new Date(ts).toTimeString().slice(0, 5) : null;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a3a5c', margin: 0 }}>
          我的排班 / Mi Horario
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary btn-small" onClick={prevMonth}>&lt;</button>
          <span style={{ fontWeight: 700, fontSize: 16, minWidth: 100, textAlign: 'center' }}>{year}年{month}月</span>
          <button className="btn btn-primary btn-small" onClick={nextMonth}>&gt;</button>
          <button className="btn btn-small" onClick={goToday} style={{ marginLeft: 4 }}>{t('today')}</button>
        </div>
      </div>

      {/* Employee info bar */}
      {employee && (
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, padding: '14px 20px',
          background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 12, color: '#999' }}>姓名 / Nombre</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3a5c' }}>{employee.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#999' }}>区域 / Área</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{employee.area || '未分配'}</div>
          </div>
          {employee.shift_group && (
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>午休组 / Grupo</div>
              <div style={{
                display: 'inline-block', padding: '2px 14px', borderRadius: 8, fontWeight: 700, fontSize: 14,
                background: groupColor?.bg || '#f5f5f5', color: groupColor?.text || '#666',
                border: `1px solid ${groupColor?.border || '#ddd'}`
              }}>
                {employee.shift_group}组
              </div>
            </div>
          )}
          {lunchSlot && (
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>午休时间 / Almuerzo</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: groupColor?.text || '#666' }}>
                {lunchSlot.label}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#6c5ce7' }}>{workDays}</div>
          <div style={{ fontSize: 12, color: '#999' }}>上班天数</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#e17055' }}>{restDays}</div>
          <div style={{ fontSize: 12, color: '#999' }}>休息天数</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#52c41a' }}>{clockedDays}</div>
          <div style={{ fontSize: 12, color: '#999' }}>已打卡</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1890ff' }}>{totalHours.toFixed(1)}h</div>
          <div style={{ fontSize: 12, color: '#999' }}>总工时</div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {dayNames.map((name, i) => (
            <div key={name} style={{
              textAlign: 'center', fontSize: 12, fontWeight: 600,
              color: i >= 5 ? '#e17055' : '#999', padding: '4px 0'
            }}>{name}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {calDays.map((day, idx) => {
            if (!day) return <div key={idx} />;
            const shift = scheduleMap[day];
            const isR = shift === 'R';
            const is9 = shift === '9';
            const today = isToday(day);
            const rec = clockMap[day];
            const dow = getDayOfWeek(year, month, day);
            const isWe = dow === 0 || dow === 6;
            const hours = employee ? getWorkHours(dow, employee.turno || 1) : null;

            return (
              <div key={idx} style={{
                borderRadius: 10, padding: '8px 4px', textAlign: 'center',
                background: today ? '#e8f0fe' : isR ? '#fff0f0' : is9 ? '#f0fff4' : isWe ? '#fafafa' : '#fff',
                border: today ? '2px solid #1890ff' : '1px solid #f0f0f0',
                minHeight: 70, position: 'relative',
              }}>
                <div style={{
                  fontSize: 14, fontWeight: today ? 800 : 600,
                  color: today ? '#1890ff' : isR ? '#e17055' : '#333',
                  marginBottom: 2,
                }}>
                  {day}
                </div>
                {is9 && (
                  <>
                    <div style={{ fontSize: 9, color: '#52c41a', fontWeight: 700, marginBottom: 1 }}>
                      {hours?.label || ''}
                    </div>
                    {rec?.clock_in && (
                      <div style={{ fontSize: 9, color: '#1890ff' }}>
                        {fmtTime(rec.clock_in)}{rec.clock_out ? `–${fmtTime(rec.clock_out)}` : '…'}
                      </div>
                    )}
                  </>
                )}
                {isR && (
                  <div style={{ fontSize: 10, color: '#e17055', fontWeight: 600 }}>休息</div>
                )}
                {!shift && (
                  <div style={{ fontSize: 10, color: '#ddd' }}>—</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 12, color: '#999' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#f0fff4', border: '1px solid #52c41a', marginRight: 4 }} />上班</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#fff0f0', border: '1px solid #e17055', marginRight: 4 }} />休息</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#e8f0fe', border: '1px solid #1890ff', marginRight: 4 }} />今天</span>
      </div>
    </div>
  );
}

// ========== Admin: full schedule management ==========
function AdminSchedule({ user }) {
  const isAdmin = user?.role === 'admin';
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employees, setEmployees] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [unassignedWarning, setUnassignedWarning] = useState(null);
  const { t, tArea } = useLang();
  const { confirmMessage, confirm, handleConfirm, handleCancel } = useConfirm();

  const daysInMonth = getDaysInMonth(year, month);

  const load = useCallback(async () => {
    try {
      const [empRes, schRes] = await Promise.all([
        getEmployees(),
        getSchedules(year, month)
      ]);
      const activeEmps = empRes.data.filter(e => e.contract_status !== '已离职' && e.nationality !== 'China');
      setEmployees(activeEmps);

      // Warn admin about unassigned employees
      if (isAdmin) {
        const unassigned = activeEmps.filter(e => !e.area);
        if (unassigned.length > 0) {
          setUnassignedWarning(unassigned);
        }
      }

      const map = {};
      schRes.data.forEach(s => {
        const day = new Date(s.work_date).getDate();
        map[`${s.employee_id}-${day}`] = s.shift_value;
      });
      setScheduleMap(map);
    } catch (err) {
      console.error(err);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleShiftToggle = async (empId, day) => {
    const key = `${empId}-${day}`;
    const current = scheduleMap[key] || '';
    const idx = SHIFT_CYCLE.indexOf(current);
    const next = SHIFT_CYCLE[(idx + 1) % SHIFT_CYCLE.length];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setScheduleMap(prev => ({ ...prev, [key]: next }));
    try {
      await updateSchedule(empId, dateStr, next);
    } catch (err) {
      console.error(err);
      load();
    }
  };

  const handleAutoAssign = async () => {
    if (!await confirm(t('autoAssignConfirm')(year, month))) return;

    setAutoAssigning(true);
    try {
      const schedules = [];
      const totalEmps = employees.length;

      // Assign each employee a rest-day offset (0-6) distributed evenly
      // Each week the rest day rotates so employees don't always rest on the same day
      // This ensures ~(totalEmps/7) employees rest per day, store always has workers

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dow = getDayOfWeek(year, month, day); // 0=Sun, 1=Mon, ..., 6=Sat
        const weekNum = getISOWeek(year, month, day);

        employees.forEach((emp, idx) => {
          // Each employee gets a base offset, then rotated by week number
          const restDow = (idx + weekNum) % 7; // 0-6
          const isRest = dow === restDow;
          schedules.push({
            employee_id: emp.id,
            work_date: dateStr,
            shift_value: isRest ? 'R' : '9'
          });
        });
      }

      for (let i = 0; i < schedules.length; i += 100) {
        await batchUpdateSchedules(schedules.slice(i, i + 100));
      }

      await load();
    } catch (err) {
      console.error(err);
      alert(t('autoAssignFail') + err.message);
    }
    setAutoAssigning(false);
  };

  const getShiftValue = (empId, day) => scheduleMap[`${empId}-${day}`] || '';

  const handlePrint = () => {
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    const areaGroups = {};
    employees.forEach(emp => {
      const area = emp.area || '未分配';
      if (!areaGroups[area]) areaGroups[area] = [];
      areaGroups[area].push(emp);
    });

    const shiftLabel = (v) => v === '9' ? '9' : v === 'R' ? 'R' : '';
    const esDayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
    const esMonthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const AREA_ES = { '游乐园': 'Parque', '零售': 'Retail', '化妆品': 'Cosméticos', '保安': 'Seguridad', '柜台': 'Mostrador', '未分配': 'Sin asignar' };

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Horario de Turnos ${esMonthNames[month-1]} ${year} - Centro Comercial Huatai</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 15px; font-size: 11px; }
        h1 { font-size: 20px; text-align: center; margin-bottom: 2px; color: #1a1a2e; }
        h2.subtitle { font-size: 14px; text-align: center; color: #555; font-weight: 400; margin-bottom: 8px; }
        h3 { font-size: 13px; margin: 12px 0 4px; padding: 3px 8px; border-radius: 3px; }
        .meta { text-align: center; font-size: 10px; color: #666; margin-bottom: 6px; }
        .time-info { text-align: center; margin: 6px 0 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 14px; }
        .time-info strong { color: #1a1a2e; }
        .time-row { display: inline-flex; align-items: center; gap: 6px; margin: 0 10px; }
        .time-badge { padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #ccc; padding: 3px 4px; text-align: center; font-size: 10px; }
        th { background: #1a1a2e; color: white; font-weight: 600; }
        .name-cell { text-align: left; white-space: nowrap; min-width: 120px; font-weight: 500; }
        .group-cell { font-weight: 600; }
        .weekend-col { background: #fff5f5; }
        .shift-9 { background: #d4edda; font-weight: 700; }
        .shift-R { background: #f8d7da; color: #999; }
        .summary td { font-weight: 600; background: #f0f2f5; }
        @media print {
          body { padding: 5px; }
          @page { size: landscape; margin: 8mm; }
        }
      </style>
    </head><body>`;

    html += `<h1>Centro Comercial Huatai</h1>`;
    html += `<h2 class="subtitle">Horario de Turnos — ${esMonthNames[month-1]} ${year}</h2>`;
    html += `<div class="meta">${esMonthNames[month-1]} ${year} | ${daysInMonth} días | ${employees.length} empleados</div>`;

    // Work time info section
    html += `<div class="time-info">`;
    html += `<strong>Turno Nº1:</strong> Lun–Vie: 10:00–18:00 &nbsp;|&nbsp; Sáb: 10:00–20:00 &nbsp;|&nbsp; Dom: Libre`;
    html += `<br><strong>Turno Nº2 (1 día libre):</strong> Lun–Vie: 11:30–20:00 &nbsp;|&nbsp; Sáb: 11:00–20:00 &nbsp;|&nbsp; Dom: 11:00–18:00`;
    html += `<br><span class="time-row"><span class="time-badge" style="background:#d4edda;color:#155724">9</span> Trabajando</span>`;
    html += `<span class="time-row"><span class="time-badge" style="background:#f8d7da;color:#721c24">R</span> Descanso</span>`;
    html += `</div>`;

    // Lunch info
    html += `<div class="time-info" style="font-size:10px">`;
    html += `<strong>Almuerzo (1 hora):</strong>&nbsp;&nbsp;`;
    html += `Grupo A: 12:30–13:30 &nbsp;|&nbsp; Grupo B: 13:30–14:30 &nbsp;|&nbsp; Grupo C: 14:30–15:30`;
    html += `</div>`;

    const areaOrder = [...AREAS, '未分配'];
    areaOrder.forEach(area => {
      const members = areaGroups[area];
      if (!members || members.length === 0) return;

      const ac = AREA_COLORS[area];
      const bgStyle = ac ? `background:${ac.bg}; color:${ac.text}` : 'background:#eee';
      const areaName = AREA_ES[area] || area;
      html += `<h3 style="${bgStyle}">${areaName} (${members.length} empleados)</h3>`;
      html += `<table><thead><tr>`;
      html += `<th class="name-cell">Nombre</th><th>Grupo</th><th style="min-width:80px">Horario</th>`;
      days.forEach(d => {
        const dow = getDayOfWeek(year, month, d);
        const isWe = dow === 0 || dow === 6;
        const dayName = esDayNames[(dow + 6) % 7];
        html += `<th class="${isWe ? 'weekend-col' : ''}" style="min-width:22px">${d}<br><span style="font-size:8px;font-weight:normal">${dayName}</span></th>`;
      });
      html += `<th>Trab.</th><th>Desc.</th>`;
      html += `</tr></thead><tbody>`;

      members.forEach(emp => {
        html += `<tr>`;
        html += `<td class="name-cell">${getShortName(emp.name)}</td>`;
        html += `<td class="group-cell">${emp.shift_group || '-'}</td>`;
        if (emp.turno === 2) {
          html += `<td style="font-size:9px;white-space:nowrap;color:#555">T2<br>L-V 11:30–20<br>S 11–20<br>D 11–18</td>`;
        } else {
          html += `<td style="font-size:9px;white-space:nowrap;color:#555">T1<br>L-V 10–18<br>S 10–20<br>D Libre</td>`;
        }
        let workDays = 0, restDays = 0;
        days.forEach(d => {
          const v = getShiftValue(emp.id, d);
          const dow = getDayOfWeek(year, month, d);
          const isWe = dow === 0 || dow === 6;
          const cls = v ? `shift-${v}` : '';
          if (v === '9') workDays++;
          if (v === 'R') restDays++;
          html += `<td class="${cls} ${isWe && !v ? 'weekend-col' : ''}">${shiftLabel(v)}</td>`;
        });
        html += `<td style="font-weight:700">${workDays}</td>`;
        html += `<td style="color:#999">${restDays}</td>`;
        html += `</tr>`;
      });

      html += `<tr class="summary"><td colspan="3">Trabajando por día</td>`;
      days.forEach(d => {
        const count = members.filter(emp => {
          const v = getShiftValue(emp.id, d);
          return v === '9';
        }).length;
        html += `<td>${count || ''}</td>`;
      });
      html += `<td></td><td></td></tr>`;
      html += `</tbody></table>`;
    });

    html += `<div class="meta" style="margin-top:12px">Impreso: ${new Date().toLocaleString('es-CL')}</div>`;
    html += `</body></html>`;

    const printWin = window.open('', '_blank');
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 500);
  };

  // Build calendar grid (Monday first)
  const firstDayOfWeek = getDayOfWeek(year, month, 1);
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const calendarDays = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    calendarDays.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
  }

  const getWorkingEmployees = (day) => {
    if (!day) return [];
    return employees.filter(emp => {
      const v = getShiftValue(emp.id, day);
      return v === '9';
    });
  };

  const getGroupedByArea = (day) => {
    const working = getWorkingEmployees(day);
    const groups = {};
    AREAS.forEach(a => groups[a] = []);
    groups['未分配'] = [];
    working.forEach(emp => {
      const area = emp.area || '未分配';
      if (!groups[area]) groups[area] = [];
      groups[area].push(emp);
    });
    return groups;
  };

  const isToday = (day) => day && year === now.getFullYear() && month === (now.getMonth() + 1) && day === now.getDate();
  const isWeekend = (day) => {
    if (!day) return false;
    const dow = getDayOfWeek(year, month, day);
    return dow === 0 || dow === 6;
  };

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); setSelectedDay(null); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); setSelectedDay(now.getDate()); };

  const dayNamesShort = t('dayNames');
  const dayNamesFull = t('dayNamesFull');

  const renderLunchLegend = () => {
    return (
      <div className="cal-lunch-legend">
        <span className="cal-lunch-title">{t('lunchRotation')}</span>
        {['A', 'B', 'C'].map(g => {
          const slot = getLunchSlot(g);
          const color = GROUP_COLORS[g];
          return (
            <span key={g} className="cal-lunch-item" style={{ background: color.bg, color: color.text, borderColor: color.border }}>
              {g}{t('group')}: {slot.label}
            </span>
          );
        })}
      </div>
    );
  };

  const renderDayDetail = () => {
    if (!selectedDay) return (
      <div className="cal-detail-panel cal-detail-empty">
        <p>{t('clickDayHint')}</p>
      </div>
    );

    const dow = getDayOfWeek(year, month, selectedDay);
    const areaGrouped = getGroupedByArea(selectedDay);
    const restEmployees = employees.filter(emp => getShiftValue(emp.id, selectedDay) === 'R');
    const hours1 = getWorkHours(dow, 1);
    const hours2 = getWorkHours(dow, 2);

    return (
      <div className="cal-detail-panel">
        <div className="cal-detail-header">
          <h3>{month}/{selectedDay} {dayNamesFull[dow]}</h3>
          <button className="btn btn-small" onClick={() => setSelectedDay(null)}>X</button>
        </div>

        {/* Work hours for this day */}
        <div style={{ background: '#f0f7ff', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          <div><strong>Turno 1:</strong> {hours1.label}</div>
          <div><strong>Turno 2:</strong> {hours2.label}</div>
        </div>

        <div className="cal-detail-lunch">
          <h4>{t('lunchTitle')}</h4>
          {['A', 'B', 'C'].map(g => {
            const slot = getLunchSlot(g);
            const color = GROUP_COLORS[g];
            return (
              <div key={g} className="cal-detail-lunch-row">
                <span className="cal-group-badge" style={{ background: color.bg, color: color.text }}>{g}{t('group')}</span>
                <span className="cal-lunch-time">{slot.label}</span>
              </div>
            );
          })}
        </div>

        {[...AREAS, '未分配'].map(area => {
          if (!areaGrouped[area] || areaGrouped[area].length === 0) return null;
          const color = AREA_COLORS[area] || { bg: '#f5f5f5', border: '#999', text: '#666' };
          return (
            <div key={area} className="cal-detail-section">
              <h4 style={{ color: color.text }}>{tArea(area)} ({areaGrouped[area].length}{t('people')})</h4>
              {areaGrouped[area].map(emp => {
                const v = getShiftValue(emp.id, selectedDay);
                const empHours = getWorkHours(dow, emp.turno || 1);
                return (
                  <div key={emp.id} className="cal-emp-row" onClick={() => handleShiftToggle(emp.id, selectedDay)}>
                    <span className="cal-emp-name">{emp.name}</span>
                    <span className="cal-emp-group-tag" style={{ background: GROUP_COLORS[emp.shift_group]?.bg || '#f5f5f5', color: GROUP_COLORS[emp.shift_group]?.text || '#999' }}>
                      {emp.shift_group || '-'}
                    </span>
                    <span className={`shift-cell shift-${v}`}>{empHours.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {restEmployees.length > 0 && (
          <div className="cal-detail-section">
            <h4>{t('rest')} ({restEmployees.length}{t('people')})</h4>
            <div className="cal-rest-list">
              {restEmployees.map(emp => (
                <span key={emp.id} className="cal-rest-name" onClick={() => handleShiftToggle(emp.id, selectedDay)}>
                  {getShortName(emp.name)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="cal-detail-section">
          <h4>{isAdmin ? t('quickSchedule') : t('scheduleTitle')}</h4>
          {isAdmin && <p style={{fontSize:11, color:'#888', marginBottom:8}}>{t('quickScheduleHint')}</p>}
          <div className="cal-quick-schedule">
            {employees.map(emp => {
              const v = getShiftValue(emp.id, selectedDay);
              const ac = emp.area && AREA_COLORS[emp.area];
              const empH = getWorkHours(dow, emp.turno || 1);
              return (
                <div key={emp.id} className="cal-quick-row" onClick={isAdmin ? () => handleShiftToggle(emp.id, selectedDay) : undefined} style={isAdmin ? {} : { cursor: 'default' }}>
                  <span className="cal-emp-name-short">{getShortName(emp.name)}</span>
                  <span className="cal-emp-group-tag" style={{
                    background: ac ? ac.bg : '#f5f5f5',
                    color: ac ? ac.text : '#999'
                  }}>
                    {emp.area ? tArea(emp.area) : t('areaUnassigned')}
                  </span>
                  <span className={`shift-cell ${v ? `shift-${v}` : 'shift-empty'}`}>
                    {v === '9' ? `9 ${empH.label}` : v === 'R' ? `R ${t('rest')}` : `— ${t('unscheduled')}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cal-page">
      {/* Warning for unassigned employees */}
      {unassignedWarning && unassignedWarning.length > 0 && (
        <div style={{
          background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 10,
          padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#e65100', fontSize: 14, marginBottom: 6 }}>
              {unassignedWarning.length} 名员工未分配区域 / {unassignedWarning.length} empleados sin área asignada
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {unassignedWarning.map(emp => (
                <span key={emp.id} style={{
                  padding: '3px 10px', background: '#fff', borderRadius: 6,
                  fontSize: 12, color: '#e65100', border: '1px solid #ffcc80'
                }}>
                  {emp.name}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#bf360c', marginTop: 6 }}>
              请到员工信息页面分配工作区域 / Asignar área en la página de empleados
            </div>
          </div>
          <button onClick={() => setUnassignedWarning(null)} style={{
            background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
            color: '#bf360c', padding: '0 4px', lineHeight: 1
          }}>×</button>
        </div>
      )}
      <div className="cal-header">
        <div className="cal-nav">
          <h2>{year} - {month}</h2>
          <div className="cal-nav-btns">
            <button className="btn btn-primary btn-small" onClick={prevMonth}>&lt;</button>
            <button className="btn btn-primary btn-small" onClick={goToday}>{t('today')}</button>
            <button className="btn btn-primary btn-small" onClick={nextMonth}>&gt;</button>
          </div>
          {isAdmin && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                className="btn btn-success"
                onClick={handleAutoAssign}
                disabled={autoAssigning || employees.length === 0}
              >
                {autoAssigning ? t('assigning') : t('autoAssign')}
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                {t('printSchedule')}
              </button>
            </div>
          )}
        </div>
        {renderLunchLegend()}
      </div>

      <div className="cal-layout">
        <div className="cal-grid-wrapper">
          <div className="cal-grid">
            {dayNamesShort.map((name, i) => (
              <div key={name} className={`cal-day-name ${i >= 5 ? 'cal-weekend-header' : ''}`}>{name}</div>
            ))}

            {calendarDays.map((day, idx) => {
              if (!day) return <div key={idx} className="cal-cell cal-cell-empty" />;

              const working = getWorkingEmployees(day);
              const areaGrouped = getGroupedByArea(day);
              const selected = selectedDay === day;

              return (
                <div
                  key={idx}
                  className={`cal-cell ${selected ? 'cal-cell-selected' : ''} ${isWeekend(day) ? 'cal-cell-weekend' : ''} ${isToday(day) ? 'cal-cell-today' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <div className="cal-cell-header">
                    <span className={`cal-cell-day ${isToday(day) ? 'cal-today-badge' : ''}`}>{day}</span>
                    {working.length > 0 && <span className="cal-cell-count">{working.length}</span>}
                  </div>
                  <div className="cal-cell-body">
                    {AREAS.map(area => {
                      if (!areaGrouped[area] || areaGrouped[area].length === 0) return null;
                      const color = AREA_COLORS[area];
                      return (
                        <div key={area} className="cal-cell-group" style={{ borderLeftColor: color.border, background: color.bg }}>
                          <span className="cal-cell-group-label" style={{ fontSize: 9 }}>{tArea(area).slice(0, 2)}</span>
                          <span className="cal-cell-group-num">{areaGrouped[area].length}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {renderDayDetail()}
      </div>
      <ConfirmDialog message={confirmMessage} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

// ========== Entry: route by role ==========
export default function Schedule({ user }) {
  const isAdmin = user?.role === 'admin';
  return isAdmin ? <AdminSchedule user={user} /> : <StaffSchedule user={user} />;
}
