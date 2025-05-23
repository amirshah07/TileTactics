import { useContext } from 'react';
import { NoMoreTilesToastContext } from './NoMoreTilesToastContextTypes.ts';
import type { NoMoreTilesToastContextProps } from './NoMoreTilesToastContextTypes.ts';

export function useNoMoreTilesToast(): NoMoreTilesToastContextProps {
  const context = useContext(NoMoreTilesToastContext);
  if (context === undefined) {
    throw new Error('useNoMoreTilesToast must be used within a NoMoreTilesToastProvider');
  }
  return context;
}