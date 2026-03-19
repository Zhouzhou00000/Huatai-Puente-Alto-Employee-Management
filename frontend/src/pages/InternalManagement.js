import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, resetEmployeePassword, getEmployeeFiles, uploadEmployeeFile, deleteFile, getFileUrl, getUsers, createUser, updateUser, deleteUser, resetUserPassword, getSettings, updateSetting } from '../api';
import { useLang } from '../i18n';
import ConfirmDialog from '../components/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';
import DatePicker from '../components/DatePicker';
import ComboBox from '../components/ComboBox';

const STATUSES = ['有合同-在职', '试用期', '日结/临时', '已离职'];
const USER_ROLES = ['admin', 'staff', 'manager', 'supervisor', 'viewer'];
const USER_ROLE_LABELS = { admin: '管理员', staff: '员工', manager: '经理', supervisor: '主管', viewer: '查看者' };
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

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function PayslipMonthPicker({ year, month, onChangeYear, onChangeMonth }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const years = [];
  for (let y = curYear - 2; y <= curYear + 1; y++) years.push(y);

  const isFuture = (y, m) => y > curYear || (y === curYear && m > curMonth);

  return (
    <div className="pmp-wrap">
      <button className="pmp-trigger" onClick={() => setOpen(o => !o)} type="button">
        <span className="pmp-trigger-icon">&#128197;</span>
        <span className="pmp-trigger-text">{year}年 {month}月</span>
        <span className="pmp-trigger-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          <div className="pmp-backdrop" onClick={() => setOpen(false)} />
          <div className="pmp-dropdown">
            {/* Year nav */}
            <div className="pmp-year-row">
              <button
                className="pmp-year-btn"
                onClick={() => onChangeYear(Math.max(years[0], year - 1))}
                disabled={year <= years[0]}
                type="button"
              >‹</button>
              <span className="pmp-year-label">{year}</span>
              <button
                className="pmp-year-btn"
                onClick={() => onChangeYear(Math.min(years[years.length - 1], year + 1))}
                disabled={year >= years[years.length - 1]}
                type="button"
              >›</button>
            </div>
            {/* Month grid */}
            <div className="pmp-month-grid">
              {MONTH_LABELS.map((label, i) => {
                const m = i + 1;
                const selected = month === m;
                const future = isFuture(year, m);
                const isCurrent = year === curYear && m === curMonth;
                return (
                  <button
                    key={m}
                    type="button"
                    className={`pmp-month-cell ${selected ? 'selected' : ''} ${isCurrent ? 'current' : ''} ${future ? 'future' : ''}`}
                    disabled={future}
                    onClick={() => { onChangeMonth(m); setOpen(false); }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const NAV_PERM_ITEMS = [
  { key: 'home', label: '首页', labelEs: 'Inicio' },
  { key: 'employees', label: '员工信息', labelEs: 'Empleados' },
  { key: 'schedule', label: '排班日历', labelEs: 'Horarios' },
  { key: 'announcements', label: '公告通知', labelEs: 'Avisos' },
  { key: 'attendance', label: '打卡', labelEs: 'Asistencia' },
  { key: 'whatsapp', label: 'WhatsApp', labelEs: 'WhatsApp' },
  { key: 'internal', label: '内部管理', labelEs: 'Gestión Interna' },
];

function UserPermModal({ user, t, onClose, onSave }) {
  const [role, setRole] = useState(user.role);
  const [perms, setPerms] = useState(() => {
    if (user.permissions) return user.permissions.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  });
  const isAdminRole = role === 'admin';

  const togglePerm = (key) => {
    setPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSave = () => {
    onSave({
      ...user,
      role,
      permissions: isAdminRole ? '' : perms.join(','),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <h2>权限设置 - {user.name}</h2>

        {/* Role selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: '#666', fontWeight: 600, marginBottom: 6, display: 'block' }}>角色</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {USER_ROLES.map(r => (
              <button
                key={r}
                className="btn btn-small"
                style={{
                  background: role === r ? '#6c5ce7' : '#f5f5f5',
                  color: role === r ? '#fff' : '#333',
                  border: `1.5px solid ${role === r ? '#6c5ce7' : '#ddd'}`,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                }}
                onClick={() => setRole(r)}
              >
                {USER_ROLE_LABELS[r] || r}
              </button>
            ))}
          </div>
        </div>

        {/* Nav permissions */}
        <div>
          <label style={{ fontSize: 13, color: '#666', fontWeight: 600, marginBottom: 8, display: 'block' }}>
            导航菜单权限
            {isAdminRole && <span style={{ fontWeight: 400, color: '#999', marginLeft: 8 }}>(管理员拥有全部权限)</span>}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV_PERM_ITEMS.map(item => {
              const checked = isAdminRole || perms.includes(item.key);
              return (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: checked ? '#f0f0ff' : '#fafafa',
                    border: `1.5px solid ${checked ? '#d0d0ff' : '#f0f0f0'}`,
                    cursor: isAdminRole ? 'default' : 'pointer',
                    opacity: isAdminRole ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => !isAdminRole && togglePerm(item.key)}
                    disabled={isAdminRole}
                    style={{ width: 18, height: 18, accentColor: '#6c5ce7' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#333', flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{item.labelEs}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button className="btn" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave}>{t('save')}</button>
        </div>
      </div>
    </div>
  );
}

// Google Maps component for geofence location picker
function GeoMap({ apiKey, lat, lng, radius, onLocationChange, onNameChange }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const searchRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) { setMapReady(true); return; }

    // Remove any existing script to avoid duplicates
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => console.error('Google Maps load failed');
    document.head.appendChild(script);
  }, [apiKey]);

  // Initialize map
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const center = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : { lat: -33.6001, lng: -70.5784 };
    const r = parseInt(radius) || 200;

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 16,
      mapTypeControl: true,
      mapTypeControlOptions: { style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU },
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstance.current = map;

    // Marker
    const marker = new window.google.maps.Marker({
      position: center,
      map,
      draggable: true,
      title: '打卡位置',
      animation: window.google.maps.Animation.DROP,
    });
    markerRef.current = marker;

    // Radius circle
    const circle = new window.google.maps.Circle({
      map,
      center,
      radius: r,
      fillColor: '#1890ff',
      fillOpacity: 0.15,
      strokeColor: '#1890ff',
      strokeOpacity: 0.5,
      strokeWeight: 2,
    });
    circleRef.current = circle;

    // Drag marker → update location
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      circle.setCenter(pos);
      onLocationChange(pos.lat().toFixed(7), pos.lng().toFixed(7));
      // Reverse geocode
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === 'OK' && results[0]) {
          onNameChange(results[0].formatted_address);
        }
      });
    });

    // Click map → move marker
    map.addListener('click', (e) => {
      const pos = e.latLng;
      marker.setPosition(pos);
      circle.setCenter(pos);
      onLocationChange(pos.lat().toFixed(7), pos.lng().toFixed(7));
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === 'OK' && results[0]) {
          onNameChange(results[0].formatted_address);
        }
      });
    });

    // Search box (Places Autocomplete)
    if (searchRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'cl' },
      });
      autocomplete.bindTo('bounds', map);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;
        const pos = place.geometry.location;
        map.setCenter(pos);
        map.setZoom(17);
        marker.setPosition(pos);
        circle.setCenter(pos);
        onLocationChange(pos.lat().toFixed(7), pos.lng().toFixed(7));
        onNameChange(place.formatted_address || place.name || '');
      });
    }
  }, [lat, lng, radius, onLocationChange, onNameChange]);

  useEffect(() => {
    if (mapReady) initMap();
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update circle radius when it changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(parseInt(radius) || 200);
    }
  }, [radius]);

  if (!apiKey) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <input
        ref={searchRef}
        type="text"
        placeholder="🔍 搜索地址 / Buscar dirección..."
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '8px 8px 0 0', border: '1.5px solid #ddd',
          borderBottom: 'none', fontSize: 14, boxSizing: 'border-box', outline: 'none'
        }}
      />
      <div
        ref={mapRef}
        style={{
          width: '100%', height: 350, borderRadius: '0 0 10px 10px', border: '1.5px solid #ddd',
          borderTop: 'none', background: '#e8e8e8'
        }}
      />
      <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
        点击地图或拖动标记来选择位置 / Haga clic en el mapa o arrastre el marcador
      </div>
    </div>
  );
}

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
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');
  const [geoRadius, setGeoRadius] = useState('200');
  const [geoName, setGeoName] = useState('');
  const [geoSaving, setGeoSaving] = useState(false);
  const [geoMapKey, setGeoMapKey] = useState('');
  const { t, tStatus, tArea } = useLang();
  const { confirmMessage, confirm, handleConfirm, handleCancel } = useConfirm();

  const load = () => getEmployees().then(({ data }) => setAllEmployees(data)).catch(console.error);
  const loadUsers = () => getUsers().then(({ data }) => setUsers(data)).catch(console.error);
  const loadSettings = () => getSettings().then(({ data }) => {
    setMobileOnly(data.mobile_only === 'true');
    setGeoEnabled(data.clock_geo_enabled === 'true');
    if (data.clock_lat) setGeoLat(data.clock_lat);
    if (data.clock_lng) setGeoLng(data.clock_lng);
    if (data.clock_radius) setGeoRadius(data.clock_radius);
    if (data.clock_geo_name) setGeoName(data.clock_geo_name);
    if (data.google_maps_key) setGeoMapKey(data.google_maps_key);
  }).catch(console.error);
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

  const toggleGeoEnabled = async () => {
    const newVal = !geoEnabled;
    setGeoEnabled(newVal);
    try {
      await updateSetting('clock_geo_enabled', String(newVal));
    } catch (err) {
      setGeoEnabled(!newVal);
      alert('设置失败: ' + err.message);
    }
  };

  const saveGeoSettings = async () => {
    if (!geoLat || !geoLng || !geoRadius) {
      alert('请填写完整的位置信息 / Por favor complete la información de ubicación');
      return;
    }
    setGeoSaving(true);
    try {
      await Promise.all([
        updateSetting('clock_lat', geoLat),
        updateSetting('clock_lng', geoLng),
        updateSetting('clock_radius', geoRadius),
        updateSetting('clock_geo_name', geoName),
      ]);
      alert('位置设置已保存 / Ubicación guardada');
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
    setGeoSaving(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('浏览器不支持定位 / Geolocalización no soportada');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(String(pos.coords.latitude));
        setGeoLng(String(pos.coords.longitude));
      },
      (err) => alert('获取位置失败 / Error al obtener ubicación: ' + err.message),
      { enableHighAccuracy: true }
    );
  };

  const saveMapKey = async (key) => {
    try {
      await updateSetting('google_maps_key', key);
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  };

  const handleMapLocationChange = useCallback((lat, lng) => {
    setGeoLat(lat);
    setGeoLng(lng);
  }, []);

  const handleMapNameChange = useCallback((name) => {
    setGeoName(name);
  }, []);

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

          {/* Geo-fence clock settings */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '24px', marginBottom: 20,
            border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {/* Header with toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a3a5c' }}>📍 打卡范围限制 / Restricción de ubicación</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                  设置员工打卡的允许范围 / Configurar el rango permitido para marcar asistencia
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: geoEnabled ? '#52c41a' : '#999', fontWeight: 600 }}>
                  {geoEnabled ? '已启用' : '未启用'}
                </span>
                <button
                  className={`setting-toggle ${geoEnabled ? 'on' : ''}`}
                  onClick={toggleGeoEnabled}
                />
              </div>
            </div>

            {/* Google Maps API Key */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Google Maps API Key
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={geoMapKey}
                  onChange={e => setGeoMapKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd',
                    fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box'
                  }}
                />
                <button
                  className="btn btn-small btn-primary"
                  onClick={() => saveMapKey(geoMapKey)}
                  disabled={!geoMapKey}
                >
                  保存Key
                </button>
              </div>
            </div>

            {/* Google Map */}
            <GeoMap
              apiKey={geoMapKey}
              lat={geoLat}
              lng={geoLng}
              radius={geoRadius}
              onLocationChange={handleMapLocationChange}
              onNameChange={handleMapNameChange}
            />

            {/* Location name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                地点名称 / Nombre del lugar
              </label>
              <input
                type="text"
                value={geoName}
                onChange={e => setGeoName(e.target.value)}
                placeholder="例: Centro Comercial Huatai Puente Alto"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd',
                  fontSize: 14, boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Coordinates + radius row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  纬度 / Latitud
                </label>
                <input
                  type="text"
                  value={geoLat}
                  onChange={e => setGeoLat(e.target.value)}
                  placeholder="-33.6001"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #ddd',
                    fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  经度 / Longitud
                </label>
                <input
                  type="text"
                  value={geoLng}
                  onChange={e => setGeoLng(e.target.value)}
                  placeholder="-70.5784"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #ddd',
                    fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  范围 / Radio (metros)
                </label>
                <input
                  type="number"
                  value={geoRadius}
                  onChange={e => setGeoRadius(e.target.value)}
                  min="50"
                  max="5000"
                  step="50"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #ddd',
                    fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Info bar */}
            {geoLat && geoLng && (
              <div style={{
                background: '#f0f7ff', borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                fontSize: 13, color: '#1a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
              }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{geoName || '打卡位置'}</span>
                  <span style={{ color: '#888', marginLeft: 8 }}>
                    {Number(geoLat).toFixed(6)}, {Number(geoLng).toFixed(6)} · {geoRadius}m
                  </span>
                </div>
                {!geoMapKey && (
                  <a
                    href={`https://www.google.com/maps?q=${geoLat},${geoLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#1890ff', textDecoration: 'none', fontWeight: 600 }}
                  >
                    🗺️ 在地图中查看 / Ver en mapa
                  </a>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn btn-small"
                onClick={getCurrentLocation}
                style={{ background: '#e8f0fe', color: '#1a73e8', border: '1px solid #c5d9f7' }}
              >
                📍 获取当前位置 / Obtener mi ubicación
              </button>
              <button
                className="btn btn-success btn-small"
                onClick={saveGeoSettings}
                disabled={geoSaving || !geoLat || !geoLng}
              >
                {geoSaving ? '保存中...' : '💾 保存 / Guardar'}
              </button>
            </div>
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
                        {USER_ROLE_LABELS[u.role] || u.role}
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
        <UserPermModal
          user={permUser}
          t={t}
          onClose={() => setPermUser(null)}
          onSave={async (updatedUser) => {
            try {
              await updateUser(updatedUser.id, updatedUser);
              loadUsers();
              setPermUser(null);
            } catch (err) { alert('权限更新失败: ' + err.message); }
          }}
        />
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
                  <PayslipMonthPicker
                    year={payslipYear}
                    month={payslipMonth}
                    onChangeYear={setPayslipYear}
                    onChangeMonth={setPayslipMonth}
                  />
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
