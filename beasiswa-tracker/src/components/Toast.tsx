'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    // Dismiss keyboard on mobile when error appears
    if (type === 'error' && typeof document !== 'undefined') {
      const active = document.activeElement as HTMLElement;
      if (active && typeof active.blur === 'function') active.blur();
    }

    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const errors  = toasts.filter(t => t.type === 'error');
  const success = toasts.filter(t => t.type === 'success');

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Error toasts — center screen */}
      {errors.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-6">
          <div className="space-y-2 w-full max-w-sm">
            {errors.map(t => (
              <div
                key={t.id}
                role="alert"
                aria-live="assertive"
                className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white bg-red-500"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {t.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success toasts — bottom right */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {success.map(t => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-brand-600"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
