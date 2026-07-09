import { useEffect, useRef, useState } from 'react';

export function useAutoSave(value, onSave, delay = 1000) {
  const [status, setStatus] = useState('idle'); // idle, saving, saved, error
  const valueRef = useRef(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (value === valueRef.current) return;
    
    valueRef.current = value;
    setStatus('saving');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave(value);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } catch (e) {
        setStatus('error');
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, onSave, delay]);

  return status;
}
