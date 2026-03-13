import React from 'react';

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  if (!message) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-small confirm-cancel" onClick={onCancel}>取消</button>
          <button className="btn btn-danger btn-small confirm-ok" onClick={onConfirm}>确定</button>
        </div>
      </div>
    </div>
  );
}
