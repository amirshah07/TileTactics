import { createContext } from 'react';

export interface NoMoreTilesToastContextProps {
  showNoMoreTilesError: (message: string, duration?: number) => void;
}

export const NoMoreTilesToastContext = createContext<NoMoreTilesToastContextProps | undefined>(undefined);