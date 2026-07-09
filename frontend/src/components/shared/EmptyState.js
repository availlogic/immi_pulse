import { FileSearch } from 'lucide-react';
import './shared.css';

export default function EmptyState({ title, message, icon: Icon = FileSearch }) {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrapper">
        <Icon size={48} className="empty-icon" />
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
    </div>
  );
}
