import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

export default function Toast({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="toast-icon" size={20} />;
      case 'danger':
        return <XCircle className="toast-icon" size={20} />;
      case 'warning':
        return <AlertTriangle className="toast-icon" size={20} />;
      default:
        return <CheckCircle2 className="toast-icon" size={20} />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type || 'success'}`}>
          {getIcon(toast.type)}
          <span className="toast-message">{toast.message}</span>
          <button 
            className="toast-close" 
            onClick={() => onClose(toast.id)}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
