import PropTypes from 'prop-types';
import React, { createContext, useContext, useReducer } from 'react';

const StateContext = createContext();
const DispatchContext = createContext();

const Provider = ({ children, reducer, initialState }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
};

Provider.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  reducer: PropTypes.func.isRequired,
  initialState: PropTypes.object.isRequired
};

const useState = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useState must be used within a Provider');
  }
  return context;
};

const useDispatch = () => {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error('useDispatch must be used within a Provider');
  }
  return context;
};

export { Provider, useState, useDispatch };
