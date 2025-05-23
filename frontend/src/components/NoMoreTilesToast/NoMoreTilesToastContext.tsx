import { useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { NoMoreTilesToastContext } from './NoMoreTilesToastContextTypes.ts';
import NoMoreTilesToast from './NoMoreTilesToast';

interface Toast {
  id: string;
  message: string;
  duration: number;
}

interface NoMoreTilesToastProviderProps {
  children: ReactNode;
}

export function NoMoreTilesToastProvider({ children }: NoMoreTilesToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showNoMoreTilesError = useCallback((message: string, duration: number = 3000) => {
    setToasts(prev => {
      // Check if a toast with this exact message already exists
      const duplicateExists = prev.some(toast => toast.message === message);
      
      // Only add the toast if it's not a duplicate
      if (!duplicateExists) {
        const id = Date.now().toString();
        return [...prev, { id, message, duration }];
      }
      return prev; 
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const contextValue = useMemo(() => ({
    showNoMoreTilesError
  }), [showNoMoreTilesError]);

  return (
    <NoMoreTilesToastContext.Provider value={contextValue}>
      {children}
      <div className="no-more-tiles-toast-wrapper">
        {toasts.map((toast, index) => (
          <NoMoreTilesToast
            key={toast.id}
            message={toast.message}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
            position={index}
          />
        ))}
      </div>
    </NoMoreTilesToastContext.Provider>
  );
}