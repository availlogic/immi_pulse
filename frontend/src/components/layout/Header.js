import { Search, Wifi } from 'lucide-react';
import './layout.css';

export default function Header({ title }) {
  return (
    <header className="app-header">
      <h1 className="page-title">{title}</h1>
      
      <div className="header-actions">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search news..." />
        </div>
        
        <div className="sync-status">
          <Wifi size={16} className="status-icon" />
          <span>Online</span>
        </div>
      </div>
    </header>
  );
}
