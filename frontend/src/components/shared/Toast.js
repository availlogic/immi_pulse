import { CheckCircle, XCircle, Info } from 'lucide-react';
import { classNames } from '../../lib/utils';
import './shared.css';

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

export default function Toast({ message, type = 'info', onDismiss }) {
  const Icon = icons[type] || Info;

  return (
    <div className={classNames('toast', `toast-${type}`)}>
      <Icon size={20} className="toast-icon" />
      <span className="toast-message">{message}</span>
      {onDismiss && (
        <button className="toast-dismiss" onClick={onDismiss}>
          &times;
        </button>
      )}
    </div>
  );
}
