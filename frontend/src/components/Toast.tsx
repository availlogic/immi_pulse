import { useCallback, useEffect, useState } from 'react';

export interface Toast {
    id: string;
    message: string;
    variant?: 'success' | 'error';
}

let listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function emit() {
    for (const l of listeners) l(toasts);
}

export function showToast(message: string, variant: Toast['variant'] = 'success') {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, message, variant }];
    emit();
    setTimeout(() => {
        toasts = toasts.filter((t) => t.id !== id);
        emit();
    }, 3000);
}

export function ToastContainer() {
    const [list, setList] = useState<Toast[]>(toasts);
    useEffect(() => {
        const fn = (next: Toast[]) => setList(next);
        listeners = [...listeners, fn];
        return () => {
            listeners = listeners.filter((l) => l !== fn);
        };
    }, []);
    const dismiss = useCallback((id: string) => {
        toasts = toasts.filter((t) => t.id !== id);
        emit();
    }, []);
    return (
        <div className="toast-container" aria-live="polite">
            {list.map((t) => (
                <div key={t.id} className={`toast ${t.variant === 'error' ? 'toast-error' : ''}`} role="status">
                    {t.message}
                    <button
                        className="btn btn-secondary"
                        style={{ marginLeft: 8, minHeight: 32, padding: '4px 8px' }}
                        onClick={() => dismiss(t.id)}
                        aria-label="Dismiss notification"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}