import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployee, createEmployee, updateEmployee } from '../api';
import { useLang } from '../i18n';

const STATUSES = ['有合同-在职', '试用期', '日结/临时', '已离职'];
const POSITIONS = ['Vendedor', 'Vendedora', 'Cajera/Reponedor', '管理'];
const AREAS = ['游乐园', '零售', '化妆品', '保安', '柜台'];

const emptyForm = {
  name: '', rut: '', position: 'Vendedor', contract_status: '有合同-在职',
  has_contract: true, shift_group: '', contract_end_date: '', nationality: 'Chile',
  daily_wage: 0, area: '', notes: ''
};

export default function EmployeeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const { t, tStatus, tArea } = useLang();

  useEffect(() => {
    if (!isNew) {
      getEmployee(id)
        .then(r => {
          const emp = r.data;
          setForm({
            ...emp,
            contract_end_date: emp.contract_end_date ? emp.contract_end_date.split('T')[0] : '',
            shift_group: emp.shift_group || '',
            area: emp.area || '',
            rut: emp.rut || '',
            notes: emp.notes || '',
          });
          setLoading(false);
        })
        .catch(() => {
          alert('Error loading employee');
          navigate('/employees');
        });
    }
  }, [id, isNew, navigate]);

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

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
                <select value={form.position} onChange={e => setField('position', e.target.value)}>
                  {POSITIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('formNationality')}</label>
                <select value={form.nationality} onChange={e => setField('nationality', e.target.value)}>
                  <option value="Chile">Chile</option>
                  <option value="China">China</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('formArea')}</label>
                <select value={form.area} onChange={e => setField('area', e.target.value)}>
                  <option value="">{t('formNone')}</option>
                  {AREAS.map(a => <option key={a} value={a}>{tArea(a)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="edit-card">
            <h3 className="edit-card-title">{t('contractInfo')}</h3>
            <div className="form-row">
              <div className="form-group">
                <label>{t('formStatus')}</label>
                <select value={form.contract_status} onChange={e => setField('contract_status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{tStatus(s)}</option>)}
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
                <label>{t('formExpiry')}</label>
                <input type="date" value={form.contract_end_date} onChange={e => setField('contract_end_date', e.target.value)} />
              </div>
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
