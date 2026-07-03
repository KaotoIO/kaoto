import { useContext } from 'react';

import { AppContext, AppContextType } from './AppContextDefinition';

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Made with Bob
