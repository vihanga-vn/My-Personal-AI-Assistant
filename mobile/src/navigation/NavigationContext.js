import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext({
  currentTab: 'vox',
  navigate: () => {},
});

export const NavigationProvider = ({ children }) => {
  const [currentTab, setCurrentTab] = useState('vox');

  const navigate = (tabName) => {
    setCurrentTab(tabName);
  };

  return (
    <NavigationContext.Provider
      value={{
        currentTab,
        navigate,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
