import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext({
  currentTab: 'vox',
  navParams: {},
  navigate: () => {},
});

export const NavigationProvider = ({ children }) => {
  const [currentTab, setCurrentTab] = useState('vox');
  const [navParams, setNavParams] = useState({});

  const navigate = (tabName, params = {}) => {
    setCurrentTab(tabName);
    setNavParams(params);
  };

  return (
    <NavigationContext.Provider
      value={{
        currentTab,
        navParams,
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
