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

function InternalManagement() {
  const [employees, setEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [actionFilter, setActionFilter] = useState('active');
  const { t, tStatus, tArea } = useLang();

  const load = () => getEmployees().then(({ data }) => setEmployees(data.filter(e => e.nationality === 'China'))).catch(console.error);
  useEffect(() => { load(); }, []);

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.contract_status === '有合同-在职').length,
    trial: employees.filter(e => e.contract_status === '试用期').length,
    daily: employees.filter(e => e.contract_status === '日结/临时').length,
    departed: employees.filter(e => e.contract_status === '已离职').length,
  };

  const today = new Date();
  const soonExpiring = employees.filter(e => {
    if (!e.contract_end_date || e.contract_status === '已离职') return false;
    const end = new Date(e.contract_end_date);
    const diff = (end - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });
  const expired = employees.filter(e => {
    if (!e.contract_end_date || e.contract_status === '已离职') return false;
    return new Date(e.contract_end_date) < today;
  });

  const filteredEmps = employees.filter(e => {
    if (actionFilter === 'active') return e.contract_status === '有合同-在职' || e.contract_status === '试用期';
    if (actionFilter === 'daily') return e.contract_status === '日结/临时';
    if (actionFilter === 'trial') return e.contract_status === '试用期';
    if (actionFilter === 'departed') return e.contract_status === '已离职';
    return true;
  });

  const openAdd = () => { setForm(emptyForm); setShowAddModal(true); };
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await createEmployee(form);
      setShowAddModal(false);
      load();
    } catch (err) { alert(t('createFail') + err.message); }
  };

  const openEdit = (emp) => {
    setEditingEmp(emp);
    setForm({
      ...emp,
      contract_end_date: emp.contract_end_date ? emp.contract_end_date.split('T')[0] : '',
      shift_group: emp.shift_group || '',
      rut: emp.rut || '',
      area: emp.area || '',
      notes: emp.notes || '',
    });
    setShowEditModal(true);
  };
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await updateEmployee(editingEmp.id, form);
      setShowEditModal(false);
      load();
    } catch (err) { alert(t('updateFail') + err.message); }
  };

  const handleDepart = async (emp) => {
    if (!window.confirm(t('confirmDepart')(emp.name))) return;
    try {
      await updateEmployee(emp.id, { ...emp, contract_status: '已离职', has_contract: false });
      load();
    } catch (err) { alert(t('operationFail') + err.message); }
  };

  const handleConvert = async (emp) => {
    if (!window.confirm(t('confirmConvert')(emp.name))) return;
    try {
      await updateEmployee(emp.id, { ...emp, contract_status: '有合同-在职', has_contract: true });
      load();
    } catch (err) { alert(t('operationFail') + err.message); }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(t('confirmDeletePermanent')(emp.name))) return;
    try {
      await deleteEmployee(emp.id);
      load();
    } catch (err) { alert(t('deleteFail') + err.message); }
  };

  const handleRehire = async (emp) => {
    if (!window.confirm(t('confirmRehire')(emp.name))) return;
    try {
      await updateEmployee(emp.id, { ...emp, contract_status: '有合同-在职', has_contract: true });
      load();
    } catch (err) { alert(t('operationFail') + err.message); }
  };

  const renderFormFields = () => (
    <>
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
          <label>{t('formNationality')}</label>
          <select value={form.nationality} onChange={e => setField('nationality', e.target.value)}>
            <option value="Chile">Chile</option>
            <option value="China">China</option>
            <option value="Venezuela">Venezuela</option>
            <option value="Colombia">Colombia</option>
            <option value="Peru">Peru</option>
          </select>
        </div>
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
          <label>{t('formWorkArea')}</label>
          <select value={form.area} onChange={e => setField('area', e.target.value)}>
            <option value="">{t('areaUnassigned')}</option>
            {AREAS.map(a => <option key={a} value={a}>{tArea(a)}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t('formWage')}</label>
          <input type="number" value={form.daily_wage} onChange={e => setField('daily_wage', parseInt(e.target.value) || 0)} />
        </div>
      </div>
      <div className="form-group">
        <label>{t('formExpiry')}</label>
        <input type="date" value={form.contract_end_date} onChange={e => setField('contract_end_date', e.target.value)} />
      </div>
      <div className="form-group">
        <label>{t('formNotes')}</label>
        <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} />
      </div>
    </>
  );

  const statusBadge = (status) => {
    const cls = status === '有合同-在职' ? 'badge-active' : status === '试用期' ? 'badge-trial' : status === '日结/临时' ? 'badge-daily' : 'badge-departed';
    return <span className={`badge ${cls}`}>{tStatus(status)}</span>;
  };

  return (
    <div>
      <div className="internal-header">
        <h2 className="section-title" style={{ margin: 0 }}>{t('internalTitle')}</h2>
      </div>

      <div className="action-buttons">
        <button className="action-btn action-btn-add" onClick={openAdd}>
          <span className="action-btn-icon">+</span>
          <span className="action-btn-text">
            <strong>{t('createEmployee')}</strong>
            <small>{t('createEmployeeSub')}</small>
          </span>
        </button>
        <button className="action-btn action-btn-convert" onClick={() => {
          const trialEmps = employees.filter(e => e.contract_status === '试用期');
          if (trialEmps.length === 0) return alert(t('noTrialEmployees'));
          setActionFilter('trial');
        }}>
          <span className="action-btn-icon">&#8593;</span>
          <span className="action-btn-text">
            <strong>{t('trialToFormal')}</strong>
            <small>{t('trialToFormalSub')(stats.trial)}</small>
          </span>
        </button>
        <button className="action-btn action-btn-depart" onClick={() => setActionFilter('active')}>
          <span className="action-btn-icon">&#10005;</span>
          <span className="action-btn-text">
            <strong>{t('handleDeparture')}</strong>
            <small>{t('handleDepartureSub')}</small>
          </span>
        </button>
        <button className="action-btn action-btn-rehire" onClick={() => setActionFilter('departed')}>
          <span className="action-btn-icon">&#8634;</span>
          <span className="action-btn-text">
            <strong>{t('rehire')}</strong>
            <small>{t('rehireSub')(stats.departed)}</small>
          </span>
        </button>
      </div>

      <div className="stat-cards">
        <div className="stat-card stat-active">
          <div className="stat-number">{stats.active}</div>
          <div className="stat-label">{t('statActive')}</div>
        </div>
        <div className="stat-card stat-trial">
          <div className="stat-number">{stats.trial}</div>
          <div className="stat-label">{t('statTrial')}</div>
        </div>
        <div className="stat-card stat-daily">
          <div className="stat-number">{stats.daily}</div>
          <div className="stat-label">{t('statDaily')}</div>
        </div>
        <div className="stat-card stat-departed">
          <div className="stat-number">{stats.departed}</div>
          <div className="stat-label">{t('statDeparted')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">{t('statTotal')}</div>
        </div>
      </div>

      {(soonExpiring.length > 0 || expired.length > 0) && (
        <div className="alert-section">
          {expired.length > 0 && (
            <div className="alert alert-danger">
              <strong>{t('contractExpired')} ({expired.length}):</strong>{' '}
              {expired.map(e => e.name).join(', ')}
            </div>
          )}
          {soonExpiring.length > 0 && (
            <div className="alert alert-warning">
              <strong>{t('contractExpiringSoon')} ({soonExpiring.length}):</strong>{' '}
              {soonExpiring.map(e => `${e.name} (${e.contract_end_date?.split('T')[0]})`).join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="filter-tabs">
        <button className={`filter-tab ${actionFilter === 'active' ? 'active' : ''}`} onClick={() => setActionFilter('active')}>{t('tabActiveAndTrial')} ({stats.active + stats.trial})</button>
        <button className={`filter-tab ${actionFilter === 'daily' ? 'active' : ''}`} onClick={() => setActionFilter('daily')}>{t('tabDailyWorker')} ({stats.daily})</button>
        <button className={`filter-tab ${actionFilter === 'trial' ? 'active' : ''}`} onClick={() => setActionFilter('trial')}>{t('tabTrial')} ({stats.trial})</button>
        <button className={`filter-tab ${actionFilter === 'departed' ? 'active' : ''}`} onClick={() => setActionFilter('departed')}>{t('tabDeparted')} ({stats.departed})</button>
        <button className={`filter-tab ${actionFilter === 'all' ? 'active' : ''}`} onClick={() => setActionFilter('all')}>{t('tabAll')} ({stats.total})</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('colName')}</th>
              <th>RUT</th>
              <th>{t('colPosition2')}</th>
              <th>{t('colStatus2')}</th>
              <th>{t('group')}</th>
              <th>{t('colArea')}</th>
              <th>{t('colNationality')}</th>
              <th>{t('colContractExpiry')}</th>
              <th>{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map(emp => (
              <tr key={emp.id} className={emp.contract_status === '已离职' ? 'departed' : ''}>
                <td><strong>{emp.name}</strong></td>
                <td>{emp.rut || '-'}</td>
                <td>{emp.position}</td>
                <td>{statusBadge(emp.contract_status)}</td>
                <td>{emp.shift_group || '-'}</td>
                <td>{emp.area ? tArea(emp.area) : '-'}</td>
                <td>{emp.nationality}</td>
                <td>{emp.contract_end_date ? emp.contract_end_date.split('T')[0] : '-'}</td>
                <td>
                  <div className="btn-group" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-small" onClick={() => openEdit(emp)}>{t('edit')}</button>
                    {emp.contract_status === '试用期' && (
                      <button className="btn btn-success btn-small" onClick={() => handleConvert(emp)}>{t('convert')}</button>
                    )}
                    {emp.contract_status !== '已离职' && (
                      <button className="btn btn-danger btn-small" onClick={() => handleDepart(emp)}>{t('depart')}</button>
                    )}
                    {emp.contract_status === '已离职' && (
                      <>
                        <button className="btn btn-success btn-small" onClick={() => handleRehire(emp)}>{t('rehire')}</button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDelete(emp)}>{t('delete')}</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredEmps.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#999' }}>{t('noData')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{t('createNewEmployee')}</h2>
            <form onSubmit={handleAdd}>
              {renderFormFields()}
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-success">{t('create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{t('editEmployeeTitle')(editingEmp?.name)}</h2>
            <form onSubmit={handleEdit}>
              {renderFormFields()}
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InternalManagement;
