const app = require('./app');
require("dotenv").config();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const { setSocketInstance } = require('./helpers/socket');

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // sesuaikan jika ada batasan domain
  }
});

global.io = io; // agar bisa digunakan di seluruh app

io.on('connection', (socket) => {
  console.log('user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

setSocketInstance(io);

// module.exports = server; // gunakan server.listen() bukan app.listen()

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});