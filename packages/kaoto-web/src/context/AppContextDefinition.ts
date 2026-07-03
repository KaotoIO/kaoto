import { createContext } from 'react';

export interface NotificationState {
  id: string;
  kind: 'success' | 'error' | 'info' | 'warning';
  title: string;
  subtitle: string;
  timestamp: number;
}

export interface ErrorInfo {
  code?: string;
  message: string;
  details?: Record<string, string>;
}

export interface AppContextType {
  notifications: NotificationState[];
  addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: ErrorInfo | null;
  setError: (error: ErrorInfo | null) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
