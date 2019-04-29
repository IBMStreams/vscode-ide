const messageHandlerRegistry = {};
const openUrlHandler = {};
const sendLspNotificationHandler = {};

function add(identifier, messageHandler) {
  messageHandlerRegistry[identifier] = messageHandler;
}

function remove(identifier) {
  messageHandlerRegistry[identifier] = null;
}

function get(identifier) {
  return messageHandlerRegistry[identifier];
}

function setDefault(messageHandler) {
  messageHandlerRegistry.___default = messageHandler;
}

function getDefault() {
  return messageHandlerRegistry.___default;
}

function openUrl(url) {
  openUrlHandler.___default(url);
}

function setOpenUrlHandler(handler) {
  openUrlHandler.___default = handler;
}

function sendLspNotification(param) {
  sendLspNotificationHandler.___default(param);
}

function setSendLspNotificationHandler(handler) {
  sendLspNotificationHandler.___default = handler;
}

function dispose() {
  Object.keys(messageHandlerRegistry).forEach(k => messageHandlerRegistry[k] = null);
  Object.keys(openUrlHandler).forEach(k => openUrlHandler[k] = null);
  Object.keys(sendLspNotificationHandler).forEach(k => sendLspNotificationHandler[k] = null);
}

const MessageHandlerRegistry = {
  add,
  remove,
  get,
  getDefault,
  setDefault,
  openUrl,
  setOpenUrlHandler,
  sendLspNotification,
  setSendLspNotificationHandler,
  dispose
};

export default MessageHandlerRegistry;
