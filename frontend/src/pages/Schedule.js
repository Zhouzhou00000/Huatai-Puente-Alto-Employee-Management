import React, { useState, useEffect, useCallback } from 'react';
import { getEmployees, getSchedules, updateSchedule, batchUpdateSchedules } from '../api';
import { useLang } from '../i18n';

const SHIFT_CYCLE = ['9', '7', 'R'];

const LUNCH_SLOTS = [
  { label: '12:30 - 13:30', short: '12:30' },
  { label: '13:30 - 14:30', short: '13:30' },
  { label: '14:30 - 15:30', short: '14:30' },
];

function getLunchSlot(group, weekIndex) {
  const groupOffset = { A: 0, B: 1, C: 2 };
  const offset = groupOffset[group];
  if (offset === undefined) return null;
  const slotIndex = (offset + weekIndex) % 3;
  return LUNCH_SLOTS[slotIndex];
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

export default function Schedule() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employees, setEmployees] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const { t, tArea } = useLang();

  const daysInMonth = getDaysInMonth(year, month);

  const load = useCallback(async () => {
    try {
      const [empRes, schRes] = await Promise.all([
        getEmployees(),
        getSchedules(year, month)
      ]);
      const activeEmps = empRes.data.filter(e => e.contract_status !== '已离职' && e.nationality !== 'China');
      setEmployees(activeEmps);

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
    if (!window.confirm(t('autoAssignConfirm')(year, month))) return;

    setAutoAssigning(true);
    try {
      const schedules = [];
      const areaGroups = {};
      employees.forEach(emp => {
        const area = emp.area || '未分配';
        if (!areaGroups[area]) areaGroups[area] = [];
        areaGroups[area].push(emp);
      });

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dow = getDayOfWeek(year, month, day);

        Object.values(areaGroups).forEach(members => {
          members.forEach((emp, idx) => {
            const restDow = idx % 7;
            const isRest = dow === restDow;
            schedules.push({
              employee_id: emp.id,
              work_date: dateStr,
              shift_value: isRest ? 'R' : '9'
            });
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

    const shiftLabel = (v) => v === '9' ? '9' : v === '7' ? '7' : v === 'R' ? 'R' : '';
    const dayNamesShort = t('dayNames');

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${t('printTitle')} ${year}-${month} - Centro Comercial Huatai</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 15px; font-size: 11px; }
        h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
        h3 { font-size: 13px; margin: 12px 0 4px; padding: 3px 8px; border-radius: 3px; }
        .meta { text-align: center; font-size: 10px; color: #666; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #ccc; padding: 3px 4px; text-align: center; font-size: 10px; }
        th { background: #1a1a2e; color: white; font-weight: 600; }
        .name-cell { text-align: left; white-space: nowrap; min-width: 120px; font-weight: 500; }
        .group-cell { font-weight: 600; }
        .weekend-col { background: #fff5f5; }
        .shift-9 { background: #d4edda; font-weight: 700; }
        .shift-7 { background: #fff3cd; font-weight: 700; }
        .shift-R { background: #f8d7da; color: #999; }
        .summary td { font-weight: 600; background: #f0f2f5; }
        .legend { display: flex; gap: 12px; justify-content: center; margin: 8px 0; font-size: 10px; }
        .legend span { padding: 2px 8px; border-radius: 3px; }
        @media print {
          body { padding: 5px; }
          @page { size: landscape; margin: 8mm; }
        }
      </style>
    </head><body>`;

    html += `<h1>Centro Comercial Huatai — ${t('printTitle')}</h1>`;
    html += `<div class="meta">${year} - ${month} | ${daysInMonth} ${t('printDays')} | ${employees.length} ${t('people')}</div>`;
    html += `<div class="legend">
      <span style="background:#d4edda">${t('printFullDay')}</span>
      <span style="background:#fff3cd">${t('printHalfDay')}</span>
      <span style="background:#f8d7da">${t('printRestDay')}</span>
    </div>`;

    const areaOrder = [...AREAS, '未分配'];
    areaOrder.forEach(area => {
      const members = areaGroups[area];
      if (!members || members.length === 0) return;

      const ac = AREA_COLORS[area];
      const bgStyle = ac ? `background:${ac.bg}; color:${ac.text}` : 'background:#eee';
      html += `<h3 style="${bgStyle}">${tArea(area)} (${members.length} ${t('people')})</h3>`;
      html += `<table><thead><tr>`;
      html += `<th class="name-cell">${t('printName')}</th><th>${t('group')}</th>`;
      days.forEach(d => {
        const dow = getDayOfWeek(year, month, d);
        const isWe = dow === 0 || dow === 6;
        const dayName = dayNamesShort[(dow + 6) % 7];
        html += `<th class="${isWe ? 'weekend-col' : ''}" style="min-width:22px">${d}<br><span style="font-size:8px;font-weight:normal">${dayName}</span></th>`;
      });
      html += `<th>${t('printWork')}</th><th>${t('printRest')}</th>`;
      html += `</tr></thead><tbody>`;

      members.forEach(emp => {
        html += `<tr>`;
        html += `<td class="name-cell">${getShortName(emp.name)}</td>`;
        html += `<td class="group-cell">${emp.shift_group || '-'}</td>`;
        let workDays = 0, restDays = 0;
        days.forEach(d => {
          const v = getShiftValue(emp.id, d);
          const dow = getDayOfWeek(year, month, d);
          const isWe = dow === 0 || dow === 6;
          const cls = v ? `shift-${v}` : '';
          if (v === '9' || v === '7') workDays++;
          if (v === 'R') restDays++;
          html += `<td class="${cls} ${isWe && !v ? 'weekend-col' : ''}">${shiftLabel(v)}</td>`;
        });
        html += `<td style="font-weight:700">${workDays}</td>`;
        html += `<td style="color:#999">${restDays}</td>`;
        html += `</tr>`;
      });

      html += `<tr class="summary"><td colspan="2">${t('printDailyWorking')}</td>`;
      days.forEach(d => {
        const count = members.filter(emp => {
          const v = getShiftValue(emp.id, d);
          return v === '9' || v === '7';
        }).length;
        html += `<td>${count || ''}</td>`;
      });
      html += `<td></td><td></td></tr>`;
      html += `</tbody></table>`;
    });

    html += `<h3 style="background:#1a1a2e; color:white">${t('printSummary')}</h3>`;
    html += `<table><thead><tr><th></th>`;
    days.forEach(d => {
      const dow = getDayOfWeek(year, month, d);
      const dayName = dayNamesShort[(dow + 6) % 7];
      html += `<th>${d}<br><span style="font-size:8px;font-weight:normal">${dayName}</span></th>`;
    });
    html += `</tr></thead><tbody><tr><td style="font-weight:600">${t('printWorking')}</td>`;
    days.forEach(d => {
      const count = employees.filter(emp => {
        const v = getShiftValue(emp.id, d);
        return v === '9' || v === '7';
      }).length;
      html += `<td style="font-weight:700">${count}</td>`;
    });
    html += `</tr><tr><td style="font-weight:600">${t('printResting')}</td>`;
    days.forEach(d => {
      const count = employees.filter(emp => getShiftValue(emp.id, d) === 'R').length;
      html += `<td style="color:#999">${count}</td>`;
    });
    html += `</tr></tbody></table>`;

    html += `<div class="meta" style="margin-top:12px">${t('printTime')}: ${new Date().toLocaleString()}</div>`;
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

  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const getWorkingEmployees = (day) => {
    if (!day) return [];
    return employees.filter(emp => {
      const v = getShiftValue(emp.id, day);
      return v === '9' || v === '7';
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
    const refDay = selectedDay || Math.min(now.getDate(), daysInMonth);
    const weekNum = getISOWeek(year, month, refDay);
    return (
      <div className="cal-lunch-legend">
        <span className="cal-lunch-title">{t('lunchRotation')}</span>
        {['A', 'B', 'C'].map(g => {
          const slot = getLunchSlot(g, weekNum);
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
    const weekNum = getISOWeek(year, month, selectedDay);
    const restEmployees = employees.filter(emp => getShiftValue(emp.id, selectedDay) === 'R');

    return (
      <div className="cal-detail-panel">
        <div className="cal-detail-header">
          <h3>{month}/{selectedDay} {dayNamesFull[dow]}</h3>
          <button className="btn btn-small" onClick={() => setSelectedDay(null)}>X</button>
        </div>

        <div className="cal-detail-lunch">
          <h4>{t('lunchTitle')}</h4>
          {['A', 'B', 'C'].map(g => {
            const slot = getLunchSlot(g, weekNum);
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
                return (
                  <div key={emp.id} className="cal-emp-row" onClick={() => handleShiftToggle(emp.id, selectedDay)}>
                    <span className="cal-emp-name">{emp.name}</span>
                    <span className="cal-emp-group-tag" style={{ background: GROUP_COLORS[emp.shift_group]?.bg || '#f5f5f5', color: GROUP_COLORS[emp.shift_group]?.text || '#999' }}>
                      {emp.shift_group || '-'}
                    </span>
                    <span className={`shift-cell shift-${v}`}>{v === '9' ? t('fullDay') : t('halfDay')}</span>
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
          <h4>{t('quickSchedule')}</h4>
          <p style={{fontSize:11, color:'#888', marginBottom:8}}>{t('quickScheduleHint')}</p>
          <div className="cal-quick-schedule">
            {employees.map(emp => {
              const v = getShiftValue(emp.id, selectedDay);
              const ac = emp.area && AREA_COLORS[emp.area];
              return (
                <div key={emp.id} className="cal-quick-row" onClick={() => handleShiftToggle(emp.id, selectedDay)}>
                  <span className="cal-emp-name-short">{getShortName(emp.name)}</span>
                  <span className="cal-emp-group-tag" style={{
                    background: ac ? ac.bg : '#f5f5f5',
                    color: ac ? ac.text : '#999'
                  }}>
                    {emp.area ? tArea(emp.area) : t('areaUnassigned')}
                  </span>
                  <span className={`shift-cell ${v ? `shift-${v}` : 'shift-empty'}`}>
                    {v === '9' ? `9 ${t('fullDay')}` : v === '7' ? `7 ${t('halfDay')}` : v === 'R' ? `R ${t('rest')}` : `— ${t('unscheduled')}`}
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
      <div className="cal-header">
        <div className="cal-nav">
          <h2>{year} - {month}</h2>
          <div className="cal-nav-btns">
            <button className="btn btn-primary btn-small" onClick={prevMonth}>&lt;</button>
            <button className="btn btn-primary btn-small" onClick={goToday}>{t('today')}</button>
            <button className="btn btn-primary btn-small" onClick={nextMonth}>&gt;</button>
          </div>
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
    </div>
  );
}
