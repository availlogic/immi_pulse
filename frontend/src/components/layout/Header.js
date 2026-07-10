import { useState, useEffect } from 'react';
import { Search, Wifi } from 'lucide-react';
import './layout.css';

export default function Header({ title, searchValue, onSearch }) {
  const [value, setValue] = useState(searchValue || '');

  useEffect(() => {
    setValue(searchValue || '');
  }, [searchValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(value);
  };

  return (
    <header className="app-header">
      <h1 className="page-title">{title}</h1>
      
      <div className="header-actions">
        {onSearch && (
          <form onSubmit={handleSubmit} className="search-bar">
            <button 
              type="submit" 
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: 0, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center',
                color: 'inherit'
              }}
            >
              <Search size={18} className="search-icon" />
            </button>
            <input 
              type="text" 
              placeholder="Search news..." 
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </form>
        )}
        
        <div className="sync-status">
          <Wifi size={16} className="status-icon" />
          <span>Online</span>
        </div>
      </div>
    </header>
  );
}
