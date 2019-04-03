const lintHandlerRegistry = {};

function add(identifier, lintHandler) {
  lintHandlerRegistry[identifier] = lintHandler;
}

function remove(identifier) {
  lintHandlerRegistry[identifier] = null;
}

function get(identifier) {
  return lintHandlerRegistry[identifier];
}

function dispose() {
  Object.keys(lintHandlerRegistry).forEach(k => lintHandlerRegistry[k] = null);
}

const LintHandlerRegistry = {
  add,
  remove,
  get,
  dispose
};

export default LintHandlerRegistry;
