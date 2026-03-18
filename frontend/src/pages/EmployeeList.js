import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees, deleteEmployee, getEmployeeFiles, uploadEmployeeFile, deleteFile, getFileUrl } from '../api';
import { useLang } from '../i18n';
import ConfirmDialog from '../components/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';

const STATUSES = ['有合同-在职', '试用期', '日结/临时', '已离职'];
const FILE_TYPES = ['contract', 'finiquito', 'photo', 'payslip'];

const ALL_COLUMNS = ['name', 'rut', 'position', 'status', 'contract', 'group', 'area', 'expiry', 'notes'];
const DEFAULT_COLUMNS = ['name', 'rut', 'position', 'status', 'contract', 'group', 'area', 'expiry', 'notes'];

function getStoredColumns() {
  try {
    const saved = localStorage.getItem('huatai_emp_columns');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_COLUMNS;
}

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
  const [visibleCols, setVisibleCols] = useState(getStoredColumns);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const colMenuRef = useRef(null);
  const navigate = useNavigate();
  const { t, tStatus, tArea } = useLang();
  const { confirmMessage, confirm, handleConfirm, handleCancel } = useConfirm();

  // Close column menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setColMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCol = (col) => {
    setVisibleCols(prev => {
      const next = prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col];
      localStorage.setItem('huatai_emp_columns', JSON.stringify(next));
      return next;
    });
  };

  const colLabel = (col) => {
    const map = {
      name: t('colName'), rut: t('colRut'), position: t('colPosition'),
      status: t('colStatus'), contract: t('colContract'), group: t('colGroup'),
      area: t('colArea'), expiry: t('colExpiry'), notes: t('colNotes'),
    };
    return map[col] || col;
  };

  const isColVisible = (col) => visibleCols.includes(col);

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

  const colCount = 2 + visibleCols.length; // # + visible + actions

  const renderTable = (title, list) => (
    <>
      <h3 className="section-title">{title}</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {isColVisible('name') && <th>{t('colName')}</th>}
              {isColVisible('rut') && <th>{t('colRut')}</th>}
              {isColVisible('position') && <th>{t('colPosition')}</th>}
              {isColVisible('status') && <th>{t('colStatus')}</th>}
              {isColVisible('contract') && <th>{t('colContract')}</th>}
              {isColVisible('group') && <th>{t('colGroup')}</th>}
              {isColVisible('area') && <th>{t('colArea')}</th>}
              {isColVisible('expiry') && <th>{t('colExpiry')}</th>}
              {isColVisible('notes') && <th>{t('colNotes')}</th>}
              <th>{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((emp, i) => (
              <tr key={emp.id} className={emp.contract_status === '已离职' ? 'departed' : ''}>
                <td>{i + 1}</td>
                {isColVisible('name') && <td><strong>{emp.name}</strong></td>}
                {isColVisible('rut') && <td>{emp.rut || '—'}</td>}
                {isColVisible('position') && <td>{emp.position}</td>}
                {isColVisible('status') && <td>{statusBadge(emp.contract_status)}</td>}
                {isColVisible('contract') && <td>{emp.has_contract ? t('hasContract') : t('noContract')}</td>}
                {isColVisible('group') && <td>{emp.shift_group || '—'}</td>}
                {isColVisible('area') && <td>{emp.area ? tArea(emp.area) : '—'}</td>}
                {isColVisible('expiry') && <td>{emp.contract_end_date ? emp.contract_end_date.split('T')[0] : '—'}</td>}
                {isColVisible('notes') && <td>{emp.notes || ''}</td>}
                <td>
                  <div className="btn-group" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-small" onClick={() => navigate(`/employees/${emp.id}/edit`)}>{t('edit')}</button>
                    <button className="btn btn-small" style={{ background: '#1a73e8', color: '#fff' }} onClick={() => openFileModal(emp)}>{t('fileDocuments')}</button>
                    <button className="btn btn-danger btn-small" onClick={() => handleDelete(emp.id, emp.name)}>{t('delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={colCount} style={{textAlign:'center', padding:20, color:'#999'}}>{t('noData')}</td></tr>}
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
          <div className="col-toggle-wrap" ref={colMenuRef}>
            <button className="btn btn-small col-toggle-btn" onClick={() => setColMenuOpen(o => !o)} title={t('colToggle')}>
              ⚙
            </button>
            {colMenuOpen && (
              <div className="col-toggle-menu">
                {ALL_COLUMNS.map(col => (
                  <label key={col} className="col-toggle-item">
                    <input type="checkbox" checked={isColVisible(col)} onChange={() => toggleCol(col)} />
                    <span>{colLabel(col)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
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

      {/* File Management Full Page */}
      {fileModal && (
        <div className="file-page-overlay">
          <div className="file-page">
            {/* Header */}
            <div className="file-page-header">
              <h2>{t('fileDocuments')} — {fileModal.name}</h2>
              <button className="file-page-close" onClick={() => setFileModal(null)}>&times;</button>
            </div>

            <div className="file-page-body">
              {/* Sidebar */}
              <div className="file-page-sidebar">
                {FILE_TYPES.map(ft => {
                  const count = empFiles.filter(f => f.file_type === ft).length;
                  return (
                    <button
                      key={ft}
                      className={`file-sidebar-btn ${uploadType === ft ? 'active' : ''}`}
                      onClick={() => setUploadType(ft)}
                    >
                      <span className="file-sidebar-icon">
                        {ft === 'contract' ? '📋' : ft === 'finiquito' ? '📝' : ft === 'photo' ? '📷' : '💰'}
                      </span>
                      <span className="file-sidebar-label">{fileTypeLabel(ft)}</span>
                      {count > 0 && <span className="file-sidebar-count">{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Main content */}
              <div className="file-page-main">
                {/* Payslip date picker */}
                {uploadType === 'payslip' && (
                  <div className="payslip-date-picker" style={{ marginBottom: 16 }}>
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

                {/* Upload dropzone */}
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
                    {uploading ? t('fileUploading') : `${t('fileUpload')} ${fileTypeLabel(uploadType)}`}
                  </div>
                </div>

                {/* File list for selected type */}
                <div className="file-page-list">
                  {(() => {
                    const files = empFiles.filter(f => f.file_type === uploadType);
                    if (files.length === 0) return <p className="file-empty">{t('fileNoFiles')}</p>;
                    return (
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
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
