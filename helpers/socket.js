// let ioInstance = null;

// const setSocketInstance = (io) => {
//   ioInstance = io;
// };

// const emitLogChange = (logData) => {
//   if (ioInstance) {
//     ioInstance.emit("new_log", logData); // broadcast ke semua client
//   }
// };

// module.exports = {
//   setSocketInstance,
//   emitLogChange
// };

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
