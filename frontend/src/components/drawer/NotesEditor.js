import { useState, useEffect } from 'react';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Check } from 'lucide-react';
import './drawer.css';

export default function NotesEditor({ initialValue, onSave }) {
  const [notes, setNotes] = useState(initialValue || '');
  const [isFocused, setIsFocused] = useState(false);
  
  const status = useAutoSave(notes, onSave, 1500);
  
  useEffect(() => {
    setNotes(initialValue || '');
  }, [initialValue]);

  const isOverLimit = notes.length > 4000;

  return (
    <div className="notes-editor-wrapper">
      <h3 className="section-title">Editorial Notes</h3>
      
      <div className={`editor-container ${isOverLimit ? 'error' : ''}`}>
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Add your script outline, insights, or annotations here..."
        />
        
        <div className="editor-footer">
          <span className={`char-count ${isOverLimit ? 'text-error' : ''}`}>
            {notes.length} / 4000
          </span>
          
          <div className="save-status">
            {status === 'saving' && <span className="status-text">Saving...</span>}
            {status === 'saved' && (
              <span className="status-pill success">
                <Check size={14} /> Saved to desk
              </span>
            )}
            {status === 'error' && <span className="status-pill error">Failed to save</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
