import React, { useState, useEffect } from 'react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, resetEmployeePassword, getEmployeeFiles, uploadEmployeeFile, deleteFile, getFileUrl, getUsers, createUser, updateUser, deleteUser, resetUserPassword, getSettings, updateSetting } from '../api';
import { useLang } from '../i18n';
import ConfirmDialog from '../components/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';
import DatePicker from '../components/DatePicker';
import ComboBox from '../components/ComboBox';

const STATUSES = ['有合同-在职', '试用期', '日结/临时', '已离职'];
const USER_ROLES = ['admin', 'staff', 'manager', 'supervisor', 'viewer'];
const POSITIONS = ['Vendedor', 'Vendedora', 'Cajera/Reponedor', '管理'];
const AREAS = ['游乐园', '零售', '化妆品', '保安', '柜台'];
const ROLES = ['管理员', '主管', '普通员工'];
const ROLE_LABEL_MAP = { '管理员': 'roleAdmin', '主管': 'roleSupervisor', '普通员工': 'roleStaff' };
const ROLE_COLORS = { '管理员': '#6c5ce7', '主管': '#0984e3', '普通员工': '#00b894' };

const emptyForm = {
  name: '', rut: '', position: 'Vendedor', contract_status: '有合同-在职',
  has_contract: true, shift_group: '', contract_end_date: '', nationality: 'Chile',
  daily_wage: 0, area: '', role: '普通员工', phone: '', notes: ''
};

function InternalManagement() {
  const [allEmployees, setAllEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [actionFilter, setActionFilter] = useState('active');
  const [activeTab, setActiveTab] = useState('internal'); // 'internal' or 'employee'
  const [empFiles, setEmpFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('contract');
  const [payslipYear, setPayslipYear] = useState(new Date().getFullYear());
  const [payslipMonth, setPayslipMonth] = useState(new Date().getMonth() + 1);
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'staff' });
  const [permEmp, setPermEmp] = useState(null);
  const [permUser, setPermUser] = useState(null);
  const [mobileOnly, setMobileOnly] = useState(false);
  const { t, tStatus, tArea } = useLang();
  const { confirmMessage, confirm, handleConfirm, handleCancel } = useConfirm();

  const load = () => getEmployees().then(({ data }) => setAllEmployees(data)).catch(console.error);
  const loadUsers = () => getUsers().then(({ data }) => setUsers(data)).catch(console.error);
  const loadSettings = () => getSettings().then(({ data }) => setMobileOnly(data.mobile_only === 'true')).catch(console.error);
  useEffect(() => { load(); loadUsers(); loadSettings(); }, []);

  const toggleMobileOnly = async () => {
    const newVal = !mobileOnly;
    setMobileOnly(newVal);
    try {
      await updateSetting('mobile_only', String(newVal));
    } catch (err) {
      setMobileOnly(!newVal);
      alert('设置失败: ' + err.message);
    }
  };

  const loadFiles = (empId) => {
    getEmployeeFiles(empId).then(({ data }) => setEmpFiles(data)).catch(console.error);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert(t('fileSizeLimit'));
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', uploadType);
    if (uploadType === 'payslip') {
      formData.append('payslip_year', payslipYear);
      formData.append('payslip_month', payslipMonth);
    }

    setUploading(true);
    try {
      await uploadEmployeeFile(editingEmp.id, formData);
      loadFiles(editingEmp.id);
    } catch (err) {
      alert(t('fileUploadFail') + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!await confirm(t('fileConfirmDelete'))) return;
    try {
      await deleteFile(fileId);
      loadFiles(editingEmp.id);
    } catch (err) {
      alert(t('fileDeleteFail') + err.message);
    }
  };

  // Employee tab = all store employees
  const employees = allEmployees;

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
    setEmpFiles([]);
    loadFiles(emp.id);
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
    if (!await confirm(t('confirmDepart')(emp.name))) return;
    try {
      await updateEmployee(emp.id, { ...emp, contract_status: '已离职', has_contract: false });
      load();
    } catch (err) { alert(t('operationFail') + err.message); }
  };

  const handleConvert = async (emp) => {
    if (!await confirm(t('confirmConvert')(emp.name))) return;
    try {
      await updateEmployee(emp.id, { ...emp, contract_status: '有合同-在职', has_contract: true });
      load();
    } catch (err) { alert(t('operationFail') + err.message); }
  };

  const handleDelete = async (emp) => {
    if (!await confirm(t('confirmDeletePermanent')(emp.name))) return;
    try {
      await deleteEmployee(emp.id);
      load();
    } catch (err) { alert(t('deleteFail') + err.message); }
  };

  const handleRehire = async (emp) => {
    if (!await confirm(t('confirmRehire')(emp.name))) return;
    try {
      await updateEmployee(emp.id, { ...emp, contract_status: '有合同-在职', has_contract: true });
      load();
    } catch (err) { alert(t('operationFail') + err.message); }
  };

  const handleResetPassword = async (emp) => {
    if (!await confirm(t('confirmResetPassword')(emp.name))) return;
    try {
      await resetEmployeePassword(emp.id);
      alert(t('resetPasswordSuccess'));
    } catch (err) {
      alert(t('resetPasswordFail') + err.message);
    }
  };

  const openUserModal = () => {
    setUserForm({ username: '', password: '', name: '', role: 'staff' });
    setShowUserModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUser(userForm);
      setShowUserModal(false);
      loadUsers();
    } catch (err) {
      alert(t('userCreateFail') + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteUser = async (user) => {
    if (!await confirm(t('userDeleteConfirm')(user.name))) return;
    try {
      await deleteUser(user.id);
      loadUsers();
    } catch (err) {
      alert(t('userDeleteFail') + err.message);
    }
  };

  const handleResetUserPwd = async (user) => {
    if (!await confirm(t('confirmResetPassword')(user.name))) return;
    try {
      await resetUserPassword(user.id);
      alert(t('resetPasswordSuccess'));
    } catch (err) {
      alert(t('resetPasswordFail') + err.message);
    }
  };

  const handleToggleUserActive = async (user) => {
    try {
      await updateUser(user.id, { ...user, active: !user.active });
      loadUsers();
    } catch (err) {
      alert(t('userUpdateFail') + err.message);
    }
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
      <div className="form-row">
        <div className="form-group">
          <label>{t('formExpiry')}</label>
          <DatePicker value={form.contract_end_date} onChange={val => setField('contract_end_date', val)} />
        </div>
        <div className="form-group">
          <label>{t('formPhone')}</label>
          <input value={form.phone || ''} onChange={e => setField('phone', e.target.value)} placeholder="+56 9 1234 5678" />
        </div>
      </div>
      <div className="form-group">
        <label>{t('formNotes')}</label>
        <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} />
      </div>
    </>
  );

  const handleRoleChange = async (emp, newRole) => {
    try {
      await updateEmployee(emp.id, { ...emp, role: newRole });
      load();
    } catch (err) { alert(t('permissionFail') + err.message); }
  };

  const statusBadge = (status) => {
    const cls = status === '有合同-在职' ? 'badge-active' : status === '试用期' ? 'badge-trial' : status === '日结/临时' ? 'badge-daily' : 'badge-departed';
    return <span className={`badge ${cls}`}>{tStatus(status)}</span>;
  };

  return (
    <div>
      {/* Tab switcher */}
      <div className="page-tabs">
        <button
          className={`page-tab ${activeTab === 'internal' ? 'active' : ''}`}
          onClick={() => setActiveTab('internal')}
        >
          <span className="page-tab-icon">&#9881;</span>
          {t('internalTitle')}
        </button>
        <button
          className={`page-tab ${activeTab === 'employee' ? 'active' : ''}`}
          onClick={() => setActiveTab('employee')}
        >
          <span className="page-tab-icon">&#128101;</span>
          {t('employeeMgmt')}
        </button>
      </div>

      {activeTab === 'internal' && (
        <>
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

          {/* System settings */}
          <div className="section-title" style={{ marginTop: 32 }}>系统设置</div>
          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">📱 仅限手机/平板访问</div>
              <div className="setting-desc">开启后，普通员工只能通过手机或平板访问系统，管理员不受限制</div>
            </div>
            <button
              className={`setting-toggle ${mobileOnly ? 'on' : ''}`}
              onClick={toggleMobileOnly}
            />
          </div>

          {/* User account management */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 32 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>{t('userManagement')} ({users.length})</div>
            <button className="btn btn-primary btn-small" onClick={openUserModal}>+ {t('userCreate')}</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('userUsername')}</th>
                  <th>{t('userDisplayName')}</th>
                  <th>{t('userRole')}</th>
                  <th>{t('userStatus')}</th>
                  <th>{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={!u.active ? 'departed' : ''}>
                    <td><strong>{u.username}</strong></td>
                    <td>{u.name}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-active' : 'badge-trial'}`}>
                        {u.role === 'admin' ? t('userRoleAdmin') : t('userRoleStaff')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.active ? 'badge-active' : 'badge-departed'}`}>
                        {u.active ? t('userActive') : t('userInactive')}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-warning btn-small" onClick={() => handleResetUserPwd(u)}>{t('resetPassword')}</button>
                        <button className="btn btn-small" onClick={() => handleToggleUserActive(u)}>
                          {u.active ? t('userInactive') : t('userActive')}
                        </button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDeleteUser(u)}>{t('delete')}</button>
                        <button
                          className="btn btn-small"
                          style={{ background: u.role === 'admin' ? '#6c5ce7' : '#00b894', color: '#fff' }}
                          onClick={() => setPermUser(u)}
                        >权限</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#999' }}>{t('noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </>
      )}

      {activeTab === 'employee' && (
        <>
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
                        <button className="btn btn-warning btn-small" onClick={() => handleResetPassword(emp)}>{t('resetPassword')}</button>
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
                        <button
                          className="btn btn-small"
                          style={{ background: ROLE_COLORS[emp.role || '普通员工'], color: '#fff', borderColor: ROLE_COLORS[emp.role || '普通员工'] }}
                          onClick={() => setPermEmp(emp)}
                        >权限</button>
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
        </>
      )}

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

      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{t('userCreate')}</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>{t('userUsername')} *</label>
                <input required value={userForm.username} onChange={e => setUserForm(prev => ({ ...prev, username: e.target.value }))} placeholder="ejemplo: juanperez" />
              </div>
              <div className="form-group">
                <label>{t('userDisplayName')} *</label>
                <input required value={userForm.name} onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('userPassword')}</label>
                  <input value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} placeholder={t('userPasswordHint')} />
                </div>
                <div className="form-group">
                  <label>{t('userRole')}</label>
                  <ComboBox
                    value={userForm.role}
                    onChange={val => setUserForm(prev => ({ ...prev, role: val }))}
                    options={USER_ROLES}
                    placeholder="admin / staff / ..."
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowUserModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-success">{t('create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permEmp && (
        <div className="modal-overlay" onClick={() => setPermEmp(null)}>
          <div className="modal" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
            <h2>权限设置 - {permEmp.name}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
              {ROLES.map(r => (
                <button
                  key={r}
                  className="btn btn-small"
                  style={{
                    background: (permEmp.role || '普通员工') === r ? ROLE_COLORS[r] : '#f5f5f5',
                    color: (permEmp.role || '普通员工') === r ? '#fff' : '#333',
                    border: `2px solid ${ROLE_COLORS[r]}`,
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                  onClick={async () => {
                    try {
                      await updateEmployee(permEmp.id, { ...permEmp, role: r });
                      load();
                      setPermEmp(null);
                    } catch (err) { alert('权限更新失败: ' + err.message); }
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setPermEmp(null)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {permUser && (
        <div className="modal-overlay" onClick={() => setPermUser(null)}>
          <div className="modal" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
            <h2>权限设置 - {permUser.name}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
              {USER_ROLES.map(r => (
                <button
                  key={r}
                  className="btn btn-small"
                  style={{
                    background: permUser.role === r ? '#6c5ce7' : '#f5f5f5',
                    color: permUser.role === r ? '#fff' : '#333',
                    border: '2px solid #6c5ce7',
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                  onClick={async () => {
                    try {
                      await updateUser(permUser.id, { ...permUser, role: r });
                      loadUsers();
                      setPermUser(null);
                    } catch (err) { alert('权限更新失败: ' + err.message); }
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setPermUser(null)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog message={confirmMessage} onConfirm={handleConfirm} onCancel={handleCancel} />

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2>{t('editEmployeeTitle')(editingEmp?.name)}</h2>
            <form onSubmit={handleEdit}>
              {renderFormFields()}
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('save')}</button>
              </div>
            </form>

            <hr style={{ margin: '20px 0', borderColor: '#eee' }} />

            <div className="file-section">
              <h3>{t('fileDocuments')}</h3>

              <div className="file-upload-bar">
                <div className="file-type-tabs">
                  {['contract', 'photo', 'payslip'].map(ft => (
                    <button
                      key={ft}
                      type="button"
                      className={`file-type-tab ${uploadType === ft ? 'active' : ''}`}
                      onClick={() => setUploadType(ft)}
                    >
                      {ft === 'contract' ? t('fileContract') : ft === 'photo' ? t('filePhoto') : t('filePayslip')}
                    </button>
                  ))}
                </div>
                {uploadType === 'payslip' && (
                  <div className="payslip-date-picker">
                    <select value={payslipYear} onChange={e => setPayslipYear(Number(e.target.value))}>
                      {[...Array(5)].map((_, i) => {
                        const y = new Date().getFullYear() - 2 + i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                    <select value={payslipMonth} onChange={e => setPayslipMonth(Number(e.target.value))}>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
                <label className="btn btn-primary btn-small file-upload-btn">
                  {uploading ? t('fileUploading') : t('fileUpload')}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {['contract', 'photo', 'payslip'].map(type => {
                const files = empFiles.filter(f => f.file_type === type);
                if (files.length === 0) return null;
                return (
                  <div key={type} className="file-group">
                    <h4 className="file-group-title">
                      {type === 'contract' ? t('fileContract') : type === 'photo' ? t('filePhoto') : t('filePayslip')}
                      <span className="file-count">({files.length})</span>
                    </h4>
                    <div className="file-list">
                      {files.map(f => (
                        <div key={f.id} className="file-item">
                          <span className="file-icon">{f.mime_type === 'application/pdf' ? '📄' : '🖼️'}</span>
                          <span className="file-name">
                            {f.original_name}
                            {f.file_type === 'payslip' && f.payslip_year && (
                              <span className="file-date-tag">{f.payslip_year}/{String(f.payslip_month).padStart(2, '0')}</span>
                            )}
                          </span>
                          <span className="file-size">{(f.file_size / 1024).toFixed(0)}KB</span>
                          <a href={getFileUrl(f.id)} target="_blank" rel="noopener noreferrer" className="btn btn-small">{t('fileView')}</a>
                          <button type="button" className="btn btn-danger btn-small" onClick={() => handleFileDelete(f.id)}>{t('fileDelete')}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {empFiles.length === 0 && (
                <p className="file-empty">{t('fileNoFiles')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InternalManagement;
