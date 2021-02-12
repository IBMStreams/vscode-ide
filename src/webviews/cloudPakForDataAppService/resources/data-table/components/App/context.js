import PropTypes from 'prop-types';
import React, { createContext, useContext, useMemo, useState } from 'react';

const AppContext = createContext();

function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(`useApp must be used within an AppProvider`);
  }
  return context;
}

function AppProvider({ children, initialData, initialIsLoading }) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(initialIsLoading);
  const value = useMemo(() => ({ data, isLoading, setData, setIsLoading }), [
    data,
    isLoading
  ]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

AppProvider.defaultProps = {
  initialData: []
};

AppProvider.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  initialData: PropTypes.arrayOf(PropTypes.object),
  initialIsLoading: PropTypes.bool.isRequired
};

export { AppProvider, useApp };
