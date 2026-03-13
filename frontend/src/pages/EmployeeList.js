import React, { useState, useEffect } from 'react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api';
import { useLang } from '../i18n';

const STATUSES = ['有合同-在职', '试用期', '日结/临时', '已离职'];
const POSITIONS = ['Vendedor', 'Vendedora', 'Cajera/Reponedor', '管理'];
const AREAS = ['游乐园', '零售', '化妆品', '保安', '柜台'];

const emptyForm = {
  name: '', rut: '', position: 'Vendedor', contract_status: '有合同-在职',
  has_contract: true, shift_group: '', contract_end_date: '', nationality: 'Chile',
  daily_wage: 0, area: '', notes: ''
};

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('全部');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { t, tStatus, tArea } = useLang();

  const load = () => getEmployees().then(r => setEmployees(r.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => {
    if (filter !== '全部' && e.contract_status !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const chile = filtered.filter(e => e.nationality !== 'China');
  const china = filtered.filter(e => e.nationality === 'China');

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEdit = (emp) => {
    setForm({
      ...emp,
      contract_end_date: emp.contract_end_date ? emp.contract_end_date.split('T')[0] : '',
      shift_group: emp.shift_group || '',
      area: emp.area || '',
      rut: emp.rut || '',
      notes: emp.notes || '',
    });
    setEditingId(emp.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateEmployee(editingId, form);
      } else {
        await createEmployee(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${t('confirmDelete')} ${name}?`)) return;
    await deleteEmployee(id);
    load();
  };

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const statusBadge = (status) => {
    const map = { '有合同-在职': 'badge-active', '试用期': 'badge-trial', '日结/临时': 'badge-daily', '已离职': 'badge-departed' };
    return <span className={`badge ${map[status] || ''}`}>{tStatus(status)}</span>;
  };

  const renderTable = (title, list) => (
    <>
      <h3 className="section-title">{title}</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{t('colName')}</th>
              <th>{t('colRut')}</th>
              <th>{t('colPosition')}</th>
              <th>{t('colStatus')}</th>
              <th>{t('colContract')}</th>
              <th>{t('colGroup')}</th>
              <th>{t('colArea')}</th>
              <th>{t('colExpiry')}</th>
              <th>{t('colNotes')}</th>
              <th>{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((emp, i) => (
              <tr key={emp.id} className={emp.contract_status === '已离职' ? 'departed' : ''}>
                <td>{i + 1}</td>
                <td><strong>{emp.name}</strong></td>
                <td>{emp.rut || '—'}</td>
                <td>{emp.position}</td>
                <td>{statusBadge(emp.contract_status)}</td>
                <td>{emp.has_contract ? t('hasContract') : t('noContract')}</td>
                <td>{emp.shift_group || '—'}</td>
                <td>{emp.area ? tArea(emp.area) : '—'}</td>
                <td>{emp.contract_end_date ? emp.contract_end_date.split('T')[0] : '—'}</td>
                <td>{emp.notes || ''}</td>
                <td>
                  <div className="btn-group">
                    <button className="btn btn-primary btn-small" onClick={() => openEdit(emp)}>{t('edit')}</button>
                    <button className="btn btn-danger btn-small" onClick={() => handleDelete(emp.id, emp.name)}>{t('delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={11} style={{textAlign:'center', padding:20, color:'#999'}}>{t('noData')}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div>
      <div className="toolbar">
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <input className="search-input" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-success" onClick={openAdd}>{t('addEmployee')}</button>
      </div>

      <div className="filter-tabs">
        {['全部', ...STATUSES].map(s => (
          <button key={s} className={`filter-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === '全部' ? t('all') : tStatus(s)}
          </button>
        ))}
      </div>

      {renderTable(t('chileSection'), chile)}
      {renderTable(t('chinaSection'), china)}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? t('editEmployee') : t('addEmployeeTitle')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('formName')}</label>
                <input required value={form.name} onChange={e => setField('name', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('formRut')}</label>
                  <input value={form.rut} onChange={e => setField('rut', e.target.value)} placeholder="xx.xxx.xxx-x" />
                </div>
                <div className="form-group">
                  <label>{t('formPosition')}</label>
                  <select value={form.position} onChange={e => setField('position', e.target.value)}>
                    {POSITIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('formStatus')}</label>
                  <select value={form.contract_status} onChange={e => setField('contract_status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{tStatus(s)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('formGroup')}</label>
                  <select value={form.shift_group} onChange={e => setField('shift_group', e.target.value)}>
                    <option value="">{t('formNone')}</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('formArea')}</label>
                  <select value={form.area} onChange={e => setField('area', e.target.value)}>
                    <option value="">{t('formNone')}</option>
                    {AREAS.map(a => <option key={a} value={a}>{tArea(a)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('formNationality')}</label>
                  <select value={form.nationality} onChange={e => setField('nationality', e.target.value)}>
                    <option value="Chile">Chile</option>
                    <option value="China">China</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('formContract')}</label>
                  <select value={form.has_contract ? 'true' : 'false'} onChange={e => setField('has_contract', e.target.value === 'true')}>
                    <option value="true">{t('formContractYes')}</option>
                    <option value="false">{t('formContractNo')}</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('formExpiry')}</label>
                  <input type="date" value={form.contract_end_date} onChange={e => setField('contract_end_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('formWage')}</label>
                  <input type="number" value={form.daily_wage} onChange={e => setField('daily_wage', parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="form-group">
                <label>{t('formNotes')}</label>
                <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{editingId ? t('save') : t('add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
