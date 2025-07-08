
let io = null;

function setSocketInstance(socketInstance) {
  io = socketInstance;
}

function getSocketInstance() {
  return io;
}

module.exports = {
  setSocketInstance,
  getSocketInstance,
};
