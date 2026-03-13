import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees, deleteEmployee, getEmployeeFiles, uploadEmployeeFile, deleteFile, getFileUrl } from '../api';
import { useLang } from '../i18n';
import ConfirmDialog from '../components/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';

const STATUSES = ['有合同-在职', '试用期', '日结/临时', '已离职'];
const FILE_TYPES = ['contract', 'finiquito', 'photo', 'payslip'];

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('全部');
  const [search, setSearch] = useState('');
  const [fileModal, setFileModal] = useState(null); // employee object or null
  const [empFiles, setEmpFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('contract');
  const [payslipYear, setPayslipYear] = useState(new Date().getFullYear());
  const [payslipMonth, setPayslipMonth] = useState(new Date().getMonth() + 1);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { t, tStatus, tArea } = useLang();
  const { confirmMessage, confirm, handleConfirm, handleCancel } = useConfirm();

  const load = () => getEmployees().then(r => setEmployees(r.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => {
    if (filter !== '全部' && e.contract_status !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const chile = filtered.filter(e => e.nationality !== 'China');
  const china = filtered.filter(e => e.nationality === 'China');

  const handleDelete = async (id, name) => {
    if (!await confirm(`${t('confirmDelete')} ${name}?`)) return;
    await deleteEmployee(id);
    load();
  };

  // File management
  const openFileModal = (emp) => {
    setFileModal(emp);
    setEmpFiles([]);
    setUploadType('contract');
    getEmployeeFiles(emp.id).then(({ data }) => setEmpFiles(data)).catch(console.error);
  };

  const doUpload = async (file) => {
    if (!file || !fileModal) return;
    if (file.size > 20 * 1024 * 1024) {
      alert(t('fileSizeLimit'));
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
      await uploadEmployeeFile(fileModal.id, formData);
      getEmployeeFiles(fileModal.id).then(({ data }) => setEmpFiles(data));
    } catch (err) {
      alert(t('fileUploadFail') + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    doUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    doUpload(file);
  };

  const handleFileDelete = async (fileId) => {
    if (!await confirm(t('fileConfirmDelete'))) return;
    try {
      await deleteFile(fileId);
      getEmployeeFiles(fileModal.id).then(({ data }) => setEmpFiles(data));
    } catch (err) {
      alert(t('fileDeleteFail') + err.message);
    }
  };

  const fileTypeLabel = (type) => {
    const map = { contract: t('fileContract'), finiquito: t('fileFiniquito'), photo: t('filePhoto'), payslip: t('filePayslip') };
    return map[type] || type;
  };

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
                  <div className="btn-group" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-small" onClick={() => navigate(`/employees/${emp.id}/edit`)}>{t('edit')}</button>
                    <button className="btn btn-small" style={{ background: '#1a73e8', color: '#fff' }} onClick={() => openFileModal(emp)}>{t('fileDocuments')}</button>
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
        <button className="btn btn-success" onClick={() => navigate('/employees/new')}>{t('addEmployee')}</button>
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

      <ConfirmDialog message={confirmMessage} onConfirm={handleConfirm} onCancel={handleCancel} />

      {/* File Management Modal */}
      {fileModal && (
        <div className="modal-overlay" onClick={() => setFileModal(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{t('fileDocuments')} — {fileModal.name}</h2>
              <button className="btn btn-small" onClick={() => setFileModal(null)}>&times;</button>
            </div>

            {/* Upload area */}
            <div className="file-upload-section">
              <div className="file-upload-controls">
                <select value={uploadType} onChange={e => setUploadType(e.target.value)} className="file-type-select">
                  {FILE_TYPES.map(ft => (
                    <option key={ft} value={ft}>{fileTypeLabel(ft)}</option>
                  ))}
                </select>
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
              </div>

              <div
                className={`file-dropzone ${dragOver ? 'file-dropzone-active' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <div className="file-dropzone-icon">+</div>
                <div className="file-dropzone-text">
                  {uploading ? t('fileUploading') : `${t('fileUpload')} PDF / ${t('filePhoto')}`}
                </div>
              </div>
            </div>

            {/* File list by type */}
            <div className="file-groups">
              {FILE_TYPES.map(type => {
                const files = empFiles.filter(f => f.file_type === type);
                if (files.length === 0) return null;
                return (
                  <div key={type} className="file-group">
                    <h4 className="file-group-title">
                      {fileTypeLabel(type)}
                      <span className="file-count">({files.length})</span>
                    </h4>
                    <div className="file-list">
                      {files.map(f => (
                        <div key={f.id} className="file-item">
                          <span className="file-icon">
                            {f.mime_type === 'application/pdf' ? '📄' : '🖼️'}
                          </span>
                          <span className="file-name">
                            {f.original_name}
                            {f.file_type === 'payslip' && f.payslip_year && (
                              <span className="file-date-tag">{f.payslip_year}/{String(f.payslip_month).padStart(2, '0')}</span>
                            )}
                          </span>
                          <span className="file-size">{(f.file_size / 1024).toFixed(0)}KB</span>
                          <a href={getFileUrl(f.id)} target="_blank" rel="noopener noreferrer" className="btn btn-small">{t('fileView')}</a>
                          <button className="btn btn-danger btn-small" onClick={() => handleFileDelete(f.id)}>{t('fileDelete')}</button>
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
