import { createStore, applyMiddleware, compose } from 'redux';
import { createEpicMiddleware } from 'redux-observable';
import { composeWithDevTools } from 'remote-redux-devtools';
import { inDebugMode } from '../../../utils';

import rootEpic from '../epics';
import rootReducer from '../reducers';

const epicMiddleware = createEpicMiddleware();

let store;

const composeEnhancers = composeWithDevTools ? composeWithDevTools({ hostname: 'localhost', port: 8000, realtime: true }) : compose;

const addLoggingToDispatch = (s) => {
  const rawDispatch = s.dispatch;
  return (action) => {
    if (inDebugMode()) {
      console.log('store dispatch receiving action:', action);
    }
    return rawDispatch(action);
  };
};

export default function getStore() {
  if (!store) {
    store = createStore(
      rootReducer,
      composeEnhancers(
        applyMiddleware(epicMiddleware)
      )
    );
    store.dispatch = addLoggingToDispatch(store);

    epicMiddleware.run(rootEpic);
  }
  return store;
}
