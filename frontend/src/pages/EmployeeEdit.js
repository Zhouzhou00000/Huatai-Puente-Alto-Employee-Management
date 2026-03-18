import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployee, createEmployee, updateEmployee, getEmployeeFiles, uploadEmployeeFile, getFileUrl } from '../api';
import { useLang } from '../i18n';
import ComboBox from '../components/ComboBox';
import MultiSelect from '../components/MultiSelect';
import DatePicker from '../components/DatePicker';

const STATUSES = ['有合同-在职', '试用期', '日结/临时', '已离职'];
const POSITIONS = ['Vendedor', 'Vendedora', 'Cajera/Reponedor', '管理', 'Supervisor', 'Cajero', 'Reponedor'];
const AREAS = ['游乐园', '零售', '化妆品', '保安', '柜台'];
const NATIONALITIES = ['Chile', 'China', 'Venezuela', 'Colombia', 'Perú', 'Bolivia', 'Argentina'];

const emptyForm = {
  name: '', rut: '', position: 'Vendedor', contract_status: '有合同-在职',
  has_contract: true, shift_group: '', contract_start_date: '', contract_end_date: '',
  nationality: 'Chile', daily_wage: 0, area: '', phone: '', email: '', notes: ''
};

export default function EmployeeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);
  const { t } = useLang();

  useEffect(() => {
    if (!isNew) {
      getEmployee(id)
        .then(r => {
          const emp = r.data;
          setForm({
            ...emp,
            contract_start_date: emp.contract_start_date ? emp.contract_start_date.split('T')[0] : '',
            contract_end_date: emp.contract_end_date ? emp.contract_end_date.split('T')[0] : '',
            shift_group: emp.shift_group || '',
            area: emp.area || '',
            rut: emp.rut || '',
            phone: emp.phone || '',
            email: emp.email || '',
            notes: emp.notes || '',
          });
          setLoading(false);
        })
        .catch(() => {
          alert('Error loading employee');
          navigate('/employees');
        });

      getEmployeeFiles(id).then(({ data }) => {
        const photos = data.filter(f => f.file_type === 'photo');
        if (photos.length > 0) setPhotoUrl(getFileUrl(photos[0].id));
      }).catch(() => {});
    }
  }, [id, isNew, navigate]);

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('file_type', 'photo');
    try {
      const { data } = await uploadEmployeeFile(id, fd);
      setPhotoUrl(getFileUrl(data.id) + '?t=' + Date.now());
    } catch (err) {
      alert('上传失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await createEmployee(form);
      } else {
        await updateEmployee(id, form);
      }
      navigate('/employees');
    } catch (err) {
      alert('Error: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>;

  return (
    <div className="edit-page">
      <div className="edit-page-header">
        <button className="btn btn-outline" onClick={() => navigate('/employees')}>
          ← {t('backToList')}
        </button>
        <h1>{isNew ? t('addEmployeeTitle') : t('editEmployee')}</h1>
      </div>

      <form className="edit-form" onSubmit={handleSubmit}>

        {/* Photo profile row – only when editing existing employee */}
        {!isNew && (
          <div className="edit-card emp-profile-card">
            <div
              className="emp-avatar-upload"
              onClick={() => photoInputRef.current?.click()}
              title="点击更换照片"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="avatar" className="emp-avatar-img" />
              ) : (
                <div className="emp-avatar-placeholder">
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span style={{ fontSize: 11, marginTop: 4, color: '#aaa' }}>上传照片</span>
                </div>
              )}
              {photoUploading && <div className="emp-avatar-overlay">上传中...</div>}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
                disabled={photoUploading}
              />
            </div>
            <div className="emp-profile-info">
              <div className="emp-profile-name">{form.name || '—'}</div>
              <div className="emp-profile-sub">{form.position} · {form.nationality}</div>
              {(form.phone || form.email) && (
                <div className="emp-profile-contact">
                  {form.phone && <span>📞 {form.phone}</span>}
                  {form.email && <span>✉ {form.email}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="edit-row">
          <div className="edit-card">
            <h3 className="edit-card-title">{t('basicInfo')}</h3>
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
                <MultiSelect
                  value={form.position}
                  onChange={val => setField('position', val)}
                  options={POSITIONS}
                  placeholder="Vendedor / 管理..."
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('formNationality')}</label>
                <MultiSelect
                  value={form.nationality}
                  onChange={val => setField('nationality', val)}
                  options={NATIONALITIES}
                  placeholder="Chile / China..."
                />
              </div>
              <div className="form-group">
                <label>{t('formArea')}</label>
                <MultiSelect
                  value={form.area}
                  onChange={val => setField('area', val)}
                  options={AREAS}
                  placeholder={t('formNone')}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>电话 / Teléfono</label>
                <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+56 9 xxxx xxxx" />
              </div>
              <div className="form-group">
                <label>邮箱 / Email</label>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="ejemplo@correo.com" />
              </div>
            </div>
          </div>

          <div className="edit-card">
            <h3 className="edit-card-title">{t('contractInfo')}</h3>
            <div className="form-row">
              <div className="form-group">
                <label>{t('formStatus')}</label>
                <ComboBox
                  value={form.contract_status}
                  onChange={val => setField('contract_status', val)}
                  options={STATUSES}
                  placeholder="合同状态..."
                />
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
                <label>合同开始 / Inicio contrato</label>
                <DatePicker value={form.contract_start_date} onChange={val => setField('contract_start_date', val)} />
              </div>
              <div className="form-group">
                <label>{t('formExpiry')}</label>
                <DatePicker value={form.contract_end_date} onChange={val => setField('contract_end_date', val)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('formWage')}</label>
                <input type="number" value={form.daily_wage} onChange={e => setField('daily_wage', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        </div>

        <div className="edit-card">
          <h3 className="edit-card-title">{t('workInfo')}</h3>
          <div className="form-row">
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
          <div className="form-group">
            <label>{t('formNotes')}</label>
            <textarea rows={4} value={form.notes} onChange={e => setField('notes', e.target.value)} />
          </div>
        </div>

        <div className="edit-actions">
          <button type="button" className="btn" onClick={() => navigate('/employees')}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '...' : (isNew ? t('add') : t('save'))}
          </button>
        </div>
      </form>
    </div>
  );
}
